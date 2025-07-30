import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../contexts/CartContext.jsx';

/**
 * Product detail page.
 *
 * Fetches a single product by ID from the backend and displays its details.
 * In a full implementation, the page will allow the user to select a SKU
 * variant, adjust quantity and add the item to the cart.  For now, it
 * shows product information and a placeholder button.
 */
const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedSku, setSelectedSku] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`/api/products/${id}`);
        setProduct(response.data);
        // Set default selected SKU to the first variant
        if (response.data.skus && response.data.skus.length > 0) {
          setSelectedSku(response.data.skus[0]);
        }
      } catch (err) {
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const { addToCart } = useCart();

  if (loading) return <div>Loading product…</div>;
  if (error) return <div>{error}</div>;
  if (!product) return <div>No product found</div>;

  return (
    <div style={{ padding: '1rem' }}>
      <h1>{product.name}</h1>
      {product.skus && product.skus.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p>
            <strong>Choose a variant:</strong>
          </p>
          {product.skus.map((sku) => (
            <label key={sku._id} style={{ marginRight: '1rem' }}>
              <input
                type="radio"
                name="sku"
                value={sku._id}
                checked={selectedSku && selectedSku._id === sku._id}
                onChange={() => setSelectedSku(sku)}
              />
              {sku.variant} – ₹{sku.price}
            </label>
          ))}
        </div>
      )}
      <p>{product.description}</p>
      <button
        onClick={() => {
          const item = {
            ...selectedSku,
            name: `${product.name} (${selectedSku.variant})`,
          };
          // convert sku object to product shape expected by cart
          addToCart({ _id: selectedSku._id, name: item.name, price: selectedSku.price });
        }}
        style={{ marginTop: '1rem' }}
      >
        Add to cart
      </button>
    </div>
  );
};

export default ProductDetail;