const { supabase } = require('./db');
const { getSessionUser, hasRole, ROLES, logAudit } = require('./helpers/auth');

module.exports = async (req, res) => {
  // Enable CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // If Supabase is not connected, notify and send fallback indicator
  if (!supabase) {
    if (req.method === 'GET') {
      // In GET, send an empty array so client uses localStorage/mock data
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Running in local mode. Connect Supabase to share catalog across users.'
      });
    }
    return res.status(503).json({
      success: false,
      message: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.'
    });
  }

  try {
    if (req.method === 'GET') {
      // Fetch products, order by created_at descending
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data || []
      });
    }

    if (req.method === 'POST') {
      // Auth Check: Super Admin, Admin, or Staff roles only
      const user = getSessionUser(req);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please log in first.' });
      }
      if (!hasRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF])) {
        return res.status(403).json({ success: false, message: 'Forbidden. Admin or Staff privileges required.' });
      }

      const { id, name, price, category, description, sizes, age_recommendation, image_url } = req.body;

      if (!id || !name || !price || !category) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: id, name, price, category'
        });
      }

      // Upsert product (insert or update)
      const { data, error } = await supabase
        .from('products')
        .upsert({
          id,
          name,
          price: parseFloat(price),
          category,
          description: description || '',
          sizes: sizes || '',
          age_recommendation: age_recommendation || '',
          image_url: image_url || '',
          rating: 5.0,
          reviews_count: 0,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      await logAudit(user.id, 'add_product', 'products', `Added/Updated product ID: ${id}`);

      return res.status(200).json({
        success: true,
        message: 'Product saved successfully',
        data: data ? data[0] : null
      });
    }

    if (req.method === 'DELETE') {
      // Auth Check: Super Admin, Admin, or Staff roles only
      const user = getSessionUser(req);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please log in first.' });
      }
      if (!hasRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF])) {
        return res.status(403).json({ success: false, message: 'Forbidden. Admin or Staff privileges required.' });
      }

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required to delete'
        });
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAudit(user.id, 'delete_product', 'products', `Deleted product ID: ${id}`);

      return res.status(200).json({
        success: true,
        message: `Product ${id} deleted successfully`
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
};
