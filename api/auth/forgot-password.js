const { supabase } = require('../db');
const { logAudit, setSecurityHeaders } = require('../helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email address is required' });
  }

  if (!supabase) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
    });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    // 1. Fetch User
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (userError) throw userError;

    // Standard security: don't reveal if user exists or not
    const genericResponse = {
      success: true,
      message: 'If that email address is registered, a password reset link has been generated.'
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // 2. Generate Reset Token
    const resetToken = 'p_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

    // Delete any older tokens for this user first
    await supabase.from('password_reset_tokens').delete().eq('user_id', user.id);

    // Save token
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt
      });

    if (tokenError) throw tokenError;

    // 3. Send Reset Link (Console Log Fallback)
    const resetLink = `${req.headers.origin || 'http://localhost:3000'}/customer?reset=${resetToken}`;
    console.log(`[PASSWORD RESET EMAIL SENT TO ${user.email}]: Link is ${resetLink}`);

    await logAudit(user.id, 'forgot_password_request', 'user', 'Requested password reset token');

    return res.status(200).json({
      ...genericResponse,
      debugLink: resetLink // Return link for easy development testing
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
