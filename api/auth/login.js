const { supabase } = require('../db');
const { 
  comparePassword, 
  setSessionCookie, 
  checkLoginRateLimit, 
  recordLoginAttempt, 
  logAudit, 
  setSecurityHeaders 
} = require('../helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { email, password } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please enter both Email and Password' });
  }

  if (!supabase) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
    });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    // 1. Rate Limiting Check
    const rateLimit = await checkLoginRateLimit(cleanEmail);
    if (rateLimit.blocked) {
      return res.status(429).json({
        success: false,
        message: `Too many failed login attempts. Locked out. Please try again in ${rateLimit.timeLeftSeconds} seconds.`
      });
    }

    // 2. Fetch User
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (userError) throw userError;

    if (!user) {
      // Record login failure (unknown user)
      await recordLoginAttempt(cleanEmail, ipAddress, userAgent, 'failed');
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // 3. Verify Password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      // Record login failure (incorrect password)
      await recordLoginAttempt(cleanEmail, ipAddress, userAgent, 'failed');
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // 4. Verify Email Address Status
    if (!user.is_verified) {
      // Check if there is an active verification token we can return in debug mode
      const { data: tokenData } = await supabase
        .from('email_verification_tokens')
        .select('token')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const verificationLink = tokenData 
        ? `${req.headers.origin || 'http://localhost:3000'}/customer?verify=${tokenData.token}`
        : null;

      return res.status(403).json({
        success: false,
        message: 'Your email address is not verified. Please verify your email to log in.',
        notVerified: true,
        debugLink: verificationLink
      });
    }

    // 5. Get User Role Name
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('name')
      .eq('id', user.role_id)
      .single();

    if (roleError) throw roleError;

    // 6. Record Login Success & Set Session Cookie
    await recordLoginAttempt(cleanEmail, ipAddress, userAgent, 'success');
    
    const sessionPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: role.name,
      role_id: user.role_id
    };

    setSessionCookie(res, sessionPayload);
    await logAudit(user.id, 'login', 'user', `Successful login from IP: ${ipAddress}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role.name
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
