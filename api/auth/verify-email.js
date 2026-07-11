const { supabase } = require('../db');
const { logAudit, setSecurityHeaders } = require('../helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow GET (query params) or POST (body)
  const token = req.query.token || req.body?.token;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Verification token is required' });
  }

  if (!supabase) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
    });
  }

  try {
    // 1. Find Token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (tokenError) throw tokenError;

    if (!tokenRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    // 2. Check Expiry
    if (new Date(tokenRecord.expires_at) < new Date()) {
      // Clean up expired token
      await supabase.from('email_verification_tokens').delete().eq('id', tokenRecord.id);
      return res.status(400).json({ success: false, message: 'Verification token has expired. Please register again.' });
    }

    // 3. Mark User as Verified
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('id', tokenRecord.user_id);

    if (userUpdateError) throw userUpdateError;

    // 4. Delete Token
    await supabase.from('email_verification_tokens').delete().eq('id', tokenRecord.id);

    // 5. Audit Log
    await logAudit(tokenRecord.user_id, 'verify_email', 'user', 'Email verified successfully');

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! Your account is now active. You may log in.'
    });

  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
