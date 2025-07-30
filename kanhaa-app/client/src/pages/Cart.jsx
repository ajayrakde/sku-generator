import React, { useState } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext.jsx';

/**
 * Cart page showing items added by the user.
 *
 * Users can adjust quantities, remove items, apply a discount code, enter a
 * shipping address and place an order.  After successfully placing an order,
 * the cart is cleared and a confirmation message is displayed.
 */
const Cart = () => {
  const { items, updateQuantity, removeFromCart, clearCart } = useCart();
  const [discountCode, setDiscountCode] = useState('');
  const [address, setAddress] = useState({ line1: '', city: '', state: '', zip: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleOrder = async () => {
    if (items.length === 0) {
      setMessage('Your cart is empty');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/orders',
        {
          items: items.map((item) => ({ skuId: item.product._id, quantity: item.quantity })),
          discountCode: discountCode || undefined,
          shippingAddress: address,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      clearCart();
      setMessage(`Order placed successfully! AWB: ${response.data.shippingInfo.awb}`);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Your Cart</h1>
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.product._id}>
                  <td>{item.product.name}</td>
                  <td>₹{item.product.price}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product._id, parseInt(e.target.value, 10) || 1)}
                    />
                  </td>
                  <td>₹{item.product.price * item.quantity}</td>
                  <td>
                    <button onClick={() => removeFromCart(item.product._id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '1rem' }}>
            <p>
              <strong>Subtotal:</strong> ₹{subtotal}
            </p>
            <label>
              Discount code:
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
              />
            </label>
            <h2>Shipping Address</h2>
            <div>
              <input
                type="text"
                placeholder="Address Line"
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="City"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="State"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="ZIP Code"
                value={address.zip}
                onChange={(e) => setAddress({ ...address, zip: e.target.value })}
              />
            </div>
            <button onClick={handleOrder} disabled={loading} style={{ marginTop: '1rem' }}>
              {loading ? 'Placing order…' : 'Place Order'}
            </button>
          </div>
          {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
        </>
      )}
    </div>
  );
};

export default Cart;