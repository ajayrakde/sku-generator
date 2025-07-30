import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Admin dashboard page.
 *
 * Provides forms for creating products (with multiple SKUs) and discount
 * codes, and displays a table of orders and basic sales analytics.  All
 * requests are authenticated using the JWT stored in localStorage and
 * require an admin role on the backend.
 */

const Admin = () => {
  // Product form state
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [skus, setSkus] = useState([{ variant: '', price: '', inventory: '' }]);
  // Discount form state
  const [discountCode, setDiscountCode] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountMinSpend, setDiscountMinSpend] = useState('');
  // Orders and analytics
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    // Fetch orders and analytics when the page loads
    const fetchData = async () => {
      try {
        const [ordersRes, analyticsRes] = await Promise.all([
          axios.get('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setOrders(ordersRes.data);
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [token]);

  const addSkuField = () => {
    setSkus([...skus, { variant: '', price: '', inventory: '' }]);
  };
  const updateSkuField = (index, field, value) => {
    const updated = skus.map((sku, i) => (i === index ? { ...sku, [field]: value } : sku));
    setSkus(updated);
  };
  const submitProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        '/api/products',
        {
          name: productName,
          description: productDesc,
          skus: skus.map((s) => ({ variant: s.variant, price: Number(s.price), inventory: Number(s.inventory) })),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage('Product created successfully');
      setProductName('');
      setProductDesc('');
      setSkus([{ variant: '', price: '', inventory: '' }]);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create product');
    }
  };
  const submitDiscount = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        '/api/admin/discounts',
        {
          code: discountCode,
          type: discountType,
          amount: Number(discountAmount),
          minimumSpend: discountMinSpend ? Number(discountMinSpend) : undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Discount code created successfully');
      setDiscountCode('');
      setDiscountAmount('');
      setDiscountMinSpend('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create discount code');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Admin Dashboard</h1>
      {message && <p style={{ color: 'var(--secondary-colour)' }}>{message}</p>}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Create Product</h2>
        <form onSubmit={submitProduct}>
          <div>
            <input
              type="text"
              placeholder="Product name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>
          <div>
            <textarea
              placeholder="Description"
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
            />
          </div>
          <div>
            <h3>SKUs</h3>
            {skus.map((sku, idx) => (
              <div key={idx} style={{ marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Variant (e.g., 250g)"
                  value={sku.variant}
                  onChange={(e) => updateSkuField(idx, 'variant', e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={sku.price}
                  onChange={(e) => updateSkuField(idx, 'price', e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Inventory"
                  value={sku.inventory}
                  onChange={(e) => updateSkuField(idx, 'inventory', e.target.value)}
                  required
                />
              </div>
            ))}
            <button type="button" onClick={addSkuField} style={{ marginTop: '0.5rem' }}>
              + Add SKU
            </button>
          </div>
          <button type="submit" style={{ marginTop: '1rem' }}>
            Create Product
          </button>
        </form>
      </section>
      <section style={{ marginBottom: '2rem' }}>
        <h2>Create Discount Code</h2>
        <form onSubmit={submitDiscount}>
          <div>
            <input
              type="text"
              placeholder="Code (e.g., SAVE20)"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              required
            />
          </div>
          <div>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Minimum spend (optional)"
              value={discountMinSpend}
              onChange={(e) => setDiscountMinSpend(e.target.value)}
            />
          </div>
          <button type="submit" style={{ marginTop: '1rem' }}>
            Create Discount
          </button>
        </form>
      </section>
      <section style={{ marginBottom: '2rem' }}>
        <h2>Orders</h2>
        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>User</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>{order._id}</td>
                  <td>{order.user}</td>
                  <td>₹{order.total}</td>
                  <td>{order.shippingStatus}</td>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section>
        <h2>Analytics</h2>
        {analytics ? (
          <ul>
            <li>Total revenue: ₹{analytics.totalRevenue}</li>
            <li>Total orders: {analytics.orderCount}</li>
            <li>Average order value: ₹{analytics.avgOrderValue.toFixed(2)}</li>
          </ul>
        ) : (
          <p>Loading analytics…</p>
        )}
      </section>
    </div>
  );
};

export default Admin;