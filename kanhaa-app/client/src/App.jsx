import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import ProductDetail from './pages/ProductDetail';

/**
 * Root component for the React single‑page application.
 *
 * This component sets up the client‑side router and defines routes for
 * customer and admin pages.  Each page is implemented in a separate file
 * under the `pages` directory.  Initially, these pages render simple
 * placeholders, which will be expanded upon during development.
 */
function App() {
  return (
    <Router>
      <header
        style={{
          backgroundColor: 'var(--primary-colour)',
          color: 'white',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 style={{ margin: 0 }}>
          <a href="/" style={{ color: 'white' }}>Kanhaa</a>
        </h2>
        <nav>
          <a href="/" style={{ marginRight: '1rem', color: 'white' }}>Home</a>
          <a href="/cart" style={{ marginRight: '1rem', color: 'white' }}>Cart</a>
          <a href="/profile" style={{ marginRight: '1rem', color: 'white' }}>Profile</a>
          <a href="/login" style={{ color: 'white' }}>Login</a>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        {/* Admin routes */}
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;