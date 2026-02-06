// client/src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import '../styles/custom.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div className="text-center">
          <h1 className="auth-logo">NoCram</h1>
          <p className="auth-subtitle">Stop cramming. Start planning.</p>
        </div>
        
        {error && <Alert className="alert-custom alert-danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="form-label-custom">Email</Form.Label>
            <Form.Control
              className="form-control-custom"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="form-label-custom">Password</Form.Label>
            <Form.Control
              className="form-control-custom"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Button type="submit" className="btn-gradient-primary w-100 mb-3" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Logging in...
              </>
            ) : (
              '🔑 Login'
            )}
          </Button>
        </Form>
        
        <div className="text-center mt-4">
          <p className="text-muted mb-0">
            Don't have an account? <Link to="/signup" style={{color: '#667eea', fontWeight: 600}}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
