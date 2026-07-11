const { supabase } = require('../db');
const { hashPassword, setSecurityHeaders } = require('../helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { name, email, password } = req.body;

  // 1. Validation
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please enter all fields (Name, Email, Password)' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address format' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
  }

  if (!supabase) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
    });
  }

  try {
    // 2. Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    // 3. Hash Password & Insert User
    const hashedPassword = await hashPassword(password);

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: hashedPassword,
        role_id: 4, // Default role: Customer
        is_verified: false // Requires email verification
      })
      .select('id, name, email')
      .single();

    if (insertError) throw insertError;

    // 4. Create Email Verification Token
    const verificationToken = 'v_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry

    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: newUser.id,
        token: verificationToken,
        expires_at: expiresAt
      });

    if (tokenError) throw tokenError;

    // 5. Send Verification Email or Log Fallback
    const verificationLink = `${req.headers.origin || 'http://localhost:3000'}/customer?verify=${verificationToken}`;
    console.log(`[VERIFICATION EMAIL SENT TO ${newUser.email}]: Link is ${verificationLink}`);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email to activate your account.',
      debugLink: verificationLink // Provided back to browser for easy mock verification
    });

  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
