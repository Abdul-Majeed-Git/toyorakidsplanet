const { clearSessionCookie, getSessionUser, logAudit, setSecurityHeaders } = require('../helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const user = getSessionUser(req);
    if (user) {
      await logAudit(user.id, 'logout', 'user', 'User logged out');
    }

    clearSessionCookie(res);
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
