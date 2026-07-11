const { supabase } = require('../db');
const { getSessionUser, hashPassword, comparePassword, logAudit, setSecurityHeaders } = require('../helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // 1. Auth Check
  const currentUser = getSessionUser(req);
  if (!currentUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in first.' });
  }

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Old and new passwords are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
  }

  if (!supabase) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
    });
  }

  try {
    // 2. Fetch User Password Hash
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', currentUser.id)
      .single();

    if (userError) throw userError;

    // 3. Verify Old Password
    const passwordMatch = await comparePassword(oldPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect old password' });
    }

    // 4. Hash & Update
    const newHashedPassword = await hashPassword(newPassword);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHashedPassword, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);

    if (updateError) throw updateError;

    // 5. Audit Log
    await logAudit(currentUser.id, 'change_password', 'user', 'Changed password successfully');

    return res.status(200).json({ success: true, message: 'Password updated successfully!' });

  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
