const { supabase } = require('./db');
const { getSessionUser, logAudit, setSecurityHeaders } = require('./helpers/auth');

module.exports = async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
    });
  }

  try {
    const currentUser = getSessionUser(req);

    if (req.method === 'POST') {
      // 1. PLACE A NEW ORDER
      const { items, total_amount, shipping_name, shipping_address, shipping_city, shipping_phone, notes } = req.body;

      if (!items || !total_amount || !shipping_name || !shipping_address || !shipping_city || !shipping_phone) {
        return res.status(400).json({ success: false, message: 'Missing required order details' });
      }

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: currentUser ? currentUser.id : null, // Linked if logged in, null if guest
          items,
          total_amount: parseFloat(total_amount),
          shipping_name: shipping_name.trim(),
          shipping_address: shipping_address.trim(),
          shipping_city: shipping_city.trim(),
          shipping_phone: shipping_phone.trim(),
          notes: notes ? notes.trim() : '',
          status: 'Pending',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      if (currentUser) {
        await logAudit(currentUser.id, 'place_order', 'orders', `Placed order: ${newOrder.id}`);
      }

      return res.status(201).json({
        success: true,
        message: 'Order recorded successfully',
        orderId: newOrder.id
      });
    }

    if (req.method === 'GET') {
      // 2. FETCH ORDERS HISTORY FOR CURRENT LOGGED IN USER
      if (!currentUser) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Fetch all orders for this user
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      return res.status(200).json({
        success: true,
        orders: orders || []
      });
    }

    // Method not allowed
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  } catch (err) {
    console.error('Orders endpoint error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
