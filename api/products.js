const { supabase } = require('./db');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

      return res.status(200).json({
        success: true,
        message: 'Product saved successfully',
        data: data ? data[0] : null
      });
    }

    if (req.method === 'DELETE') {
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
