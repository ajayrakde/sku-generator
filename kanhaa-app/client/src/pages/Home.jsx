import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import heroImage from '../assets/hero.png';

/**
 * Home page that lists products fetched from the backend API.
 *
 * When the component mounts, it sends a GET request to `/api/products` on the
 * backend server.  The response should be an array of product objects
 * containing at minimum `_id`, `name` and `price`.  Clicking on a product
 * navigates to the detail page for that product.
 */
const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('/api/products', { params: { search } });
        setProducts(response.data);
      } catch (err) {
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [search]);

  if (loading) return <div>Loading products…</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      {/* Hero section */}
      <section
        style={{
          backgroundColor: 'var(--secondary-colour)',
          color: 'white',
          padding: '2rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ maxWidth: '60%' }}>
          <h1 style={{ margin: '0 0 1rem 0' }}>Wholesome Nutrition for Kids</h1>
          <p>
            Discover Kanhaa’s range of preservative‑free, naturally made nutritional products
            designed especially for children.  Healthy can be delicious!
          </p>
        </div>
        <div style={{ flex: '1 0 200px', textAlign: 'center' }}>
          <img src={heroImage} alt="Kids enjoying healthy food" style={{ maxWidth: '250px', width: '100%' }} />
        </div>
      </section>

      {/* Products section */}
      <div style={{ padding: '1rem' }}>
        <h2>Our Products</h2>
        {/* Search bar */}
        <input
          type="text"
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '0.5rem', marginBottom: '1rem', width: '100%', maxWidth: '400px' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {products.map((product) => (
            <div
              key={product._id}
              style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', width: '200px', backgroundColor: '#fff' }}
            >
              <h3 style={{ marginTop: 0 }}>{product.name}</h3>
              <p>From ₹{product.basePrice}</p>
              <Link to={`/product/${product._id}`} style={{ color: 'var(--link-colour)' }}>
                View details
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;