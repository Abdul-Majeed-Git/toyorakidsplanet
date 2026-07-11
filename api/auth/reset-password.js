const { supabase } = require('../db');
const { hashPassword, logAudit, setSecurityHeaders } = require('../helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token and Password are required' });
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
    // 1. Fetch Token Record
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (tokenError) throw tokenError;

    if (!tokenRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    // 2. Check Expiry
    if (new Date(tokenRecord.expires_at) < new Date()) {
      await supabase.from('password_reset_tokens').delete().eq('id', tokenRecord.id);
      return res.status(400).json({ success: false, message: 'Password reset token has expired' });
    }

    // 3. Hash & Update Password
    const hashedPassword = await hashPassword(password);
    
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', tokenRecord.user_id);

    if (userUpdateError) throw userUpdateError;

    // 4. Delete Token
    await supabase.from('password_reset_tokens').delete().eq('id', tokenRecord.id);

    // 5. Audit Log
    await logAudit(tokenRecord.user_id, 'reset_password_success', 'user', 'Reset password using token');

    return res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in with your new password.'
    });

  } catch (err) {
    console.error('Password reset error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
