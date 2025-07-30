import React, { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * Profile page for viewing and editing user information.
 *
 * On mount, the component fetches the current user's profile and addresses
 * from the backend.  It will allow the user to update their details and
 * manage addresses.  Currently, it displays basic placeholders.
 */
const Profile = () => {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfileAndOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        // Fetch profile
        const [profileRes, ordersRes] = await Promise.all([
          axios.get('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/orders', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setUser(profileRes.data);
        setOrders(ordersRes.data);
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndOrders();
  }, []);

  if (loading) return <div>Loading profile…</div>;
  if (error) return <div>{error}</div>;
  if (!user) return <div>No profile data</div>;

  return (
    <div style={{ padding: '1rem' }}>
      <h1>My Profile</h1>
      <p>
        <strong>Phone:</strong> {user.phone}
      </p>
      <p>
        <strong>Email:</strong> {user.email || 'Not provided'}
      </p>
      <h2>Addresses</h2>
      <ul>
        {user.addresses && user.addresses.length > 0 ? (
          user.addresses.map((addr) => (
            <li key={addr._id}>{addr.line1}, {addr.city}, {addr.state}, {addr.zip}</li>
          ))
        ) : (
          <li>No addresses found</li>
        )}
      </ul>

      <h2>My Orders</h2>
      {orders && orders.length > 0 ? (
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>AWB</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td>{order._id}</td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>
                  {order.items.map((it) => (
                    <div key={it.sku._id}>
                      {it.sku.product.name} ({it.sku.variant}) × {it.quantity}
                    </div>
                  ))}
                </td>
                <td>₹{order.total}</td>
                <td>{order.shippingStatus}</td>
                <td>{order.shippingInfo && order.shippingInfo.awb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No orders found.</p>
      )}
    </div>
  );
};

export default Profile;