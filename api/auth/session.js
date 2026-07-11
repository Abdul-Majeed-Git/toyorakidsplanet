const { getSessionUser, setSecurityHeaders } = require('../helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(200).json({ success: true, loggedIn: false });
    }

    return res.status(200).json({
      success: true,
      loggedIn: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Session error:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
