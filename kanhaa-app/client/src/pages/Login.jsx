import React, { useState } from 'react';
import axios from 'axios';

/**
 * Login page allowing users to authenticate via phone OTP.
 *
 * Users enter their phone number and click "Send OTP" to request a one‑time
 * password.  The backend should send an SMS (this demo logs the OTP to the
 * server console).  After entering the code, the user clicks "Verify" to
 * authenticate.  On success, a JWT token is stored in localStorage for
 * subsequent requests.
 */
const Login = () => {
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');

  const sendOtp = async () => {
    try {
      await axios.post('/api/auth/send-otp', { phone });
      setOtpSent(true);
      setMessage('OTP sent to your phone number');
    } catch (err) {
      setMessage('Failed to send OTP');
    }
  };

  const verifyOtp = async () => {
    try {
      const response = await axios.post('/api/auth/verify-otp', { phone, otp });
      localStorage.setItem('token', response.data.token);
      setMessage('Login successful');
    } catch (err) {
      setMessage('Invalid OTP');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Login</h1>
      <div style={{ maxWidth: '300px' }}>
        <label>
          Phone number:
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210"
          />
        </label>
        {!otpSent && (
          <button onClick={sendOtp} style={{ display: 'block', marginTop: '1rem' }}>
            Send OTP
          </button>
        )}
        {otpSent && (
          <>
            <label>
              Enter OTP:
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} />
            </label>
            <button onClick={verifyOtp} style={{ display: 'block', marginTop: '1rem' }}>
              Verify
            </button>
          </>
        )}
        <div style={{ marginTop: '1rem', color: 'green' }}>{message}</div>
      </div>
    </div>
  );
};

export default Login;