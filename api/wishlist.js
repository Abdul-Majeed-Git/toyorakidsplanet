const { supabase } = require('./db');
const { getSessionUser, setSecurityHeaders } = require('./helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Auth Check
  const currentUser = getSessionUser(req);
  if (!currentUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!supabase) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
    });
  }

  try {
    if (req.method === 'GET') {
      // 1. FETCH USER WISHLIST PRODUCT IDS
      const { data, error } = await supabase
        .from('wishlists')
        .select('product_id')
        .eq('user_id', currentUser.id);

      if (error) throw error;

      const productIds = data.map(item => item.product_id);
      return res.status(200).json({ success: true, wishlist: productIds });
    }

    if (req.method === 'POST') {
      // 2. TOGGLE WISHLIST PRODUCT ID
      const { product_id } = req.body;

      if (!product_id) {
        return res.status(400).json({ success: false, message: 'Product ID is required' });
      }

      // Check if already exists
      const { data: existing, error: checkError } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('product_id', product_id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Remove from wishlist
        const { error: deleteError } = await supabase
          .from('wishlists')
          .delete()
          .eq('id', existing.id);

        if (deleteError) throw deleteError;

        return res.status(200).json({ success: true, action: 'removed', product_id });
      } else {
        // Add to wishlist
        const { error: insertError } = await supabase
          .from('wishlists')
          .insert({
            user_id: currentUser.id,
            product_id: product_id
          });

        if (insertError) throw insertError;

        return res.status(201).json({ success: true, action: 'added', product_id });
      }
    }

    // Method not allowed
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  } catch (err) {
    console.error('Wishlist endpoint error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
