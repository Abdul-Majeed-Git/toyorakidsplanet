const { supabase } = require('../db');
const { getSessionUser, hasRole, ROLES, logAudit, setSecurityHeaders } = require('../helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Authenticate & Authorize (Super Admin or Admin only)
  const currentUser = getSessionUser(req);
  if (!currentUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!hasRole(currentUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
    return res.status(403).json({ success: false, message: 'Forbidden. Admin privileges required.' });
  }

  if (!supabase) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
    });
  }

  try {
    if (req.method === 'GET') {
      // Check if audit logs are requested
      if (req.query.logs === 'true') {
        const { data: logs, error: logsError } = await supabase
          .from('audit_logs')
          .select('*, users(name, email)')
          .order('timestamp', { ascending: false })
          .limit(100);

        if (logsError) throw logsError;

        return res.status(200).json({ success: true, logs });
      }

      // Default: fetch all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role_id, is_verified, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch role definitions
      const { data: roles } = await supabase.from('roles').select('*');

      return res.status(200).json({ success: true, users, roles });
    }

    if (req.method === 'PATCH') {
      // Update User Role
      const { userId, newRoleId } = req.body;

      if (!userId || !newRoleId) {
        return res.status(400).json({ success: false, message: 'User ID and New Role ID are required' });
      }

      // Check self-demotion
      if (userId === currentUser.id) {
        return res.status(400).json({ success: false, message: 'You cannot change your own role' });
      }

      // Fetch target user's current role
      const { data: targetUser, error: targetError } = await supabase
        .from('users')
        .select('role_id, email')
        .eq('id', userId)
        .single();

      if (targetError) throw targetError;

      // Only Super Admin can demote or promote a Super Admin
      if (targetUser.role_id === 1 && currentUser.role_id !== 1) {
        return res.status(403).json({ success: false, message: 'Only a Super Admin can modify another Super Admin' });
      }

      // Only Super Admin can assign Super Admin role (id = 1)
      if (parseInt(newRoleId) === 1 && currentUser.role_id !== 1) {
        return res.status(403).json({ success: false, message: 'Only a Super Admin can promote someone to Super Admin' });
      }

      // Update role
      const { error: updateError } = await supabase
        .from('users')
        .update({ role_id: parseInt(newRoleId) })
        .eq('id', userId);

      if (updateError) throw updateError;

      await logAudit(currentUser.id, 'change_user_role', 'users', `Changed user role for ${targetUser.email} to Role ID: ${newRoleId}`);

      return res.status(200).json({ success: true, message: 'User role updated successfully!' });
    }

    return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  } catch (err) {
    console.error('Users management error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
