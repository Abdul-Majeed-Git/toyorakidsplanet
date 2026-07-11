const { supabase } = require('../db');
const { getSessionUser, logAudit, setSecurityHeaders } = require('../helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Auth Check
  const currentUser = getSessionUser(req);
  if (!currentUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in first.' });
  }

  if (!supabase) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
    });
  }

  try {
    if (req.method === 'GET') {
      // 1. Fetch complete profile data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email, created_at, role_id')
        .eq('id', currentUser.id)
        .single();

      if (userError) throw userError;

      const { data: role } = await supabase
        .from('roles')
        .select('name')
        .eq('id', user.role_id)
        .single();

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: role?.name || 'Customer',
          joined: user.created_at
        }
      });
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      // 2. Update profile data
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and Email are required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email address format' });
      }

      const cleanEmail = email.toLowerCase().trim();

      // Check if email is already taken by someone else
      const { data: otherUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', cleanEmail)
        .neq('id', currentUser.id)
        .maybeSingle();

      if (otherUser) {
        return res.status(400).json({ success: false, message: 'Email address is already in use by another account' });
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          email: cleanEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      await logAudit(currentUser.id, 'update_profile', 'user', `Updated name/email. New email: ${cleanEmail}`);

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully!',
        user: {
          id: currentUser.id,
          name: name.trim(),
          email: cleanEmail,
          role: currentUser.role
        }
      });
    }

    // Method not allowed
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  } catch (err) {
    console.error('Profile endpoint error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
