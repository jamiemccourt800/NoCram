// client/src/pages/Signup.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import '../styles/custom.css';

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);

    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div className="text-center">
          <h1 className="auth-logo">Create Account</h1>
          <p className="auth-subtitle">Join NoCram and stay organized</p>
        </div>
        
        {error && <Alert className="alert-custom alert-danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="form-label-custom">Name</Form.Label>
            <Form.Control
              className="form-control-custom"
              type="text"
              name="name"
              placeholder="Your full name"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="form-label-custom">Email</Form.Label>
            <Form.Control
              className="form-control-custom"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="form-label-custom">Password</Form.Label>
            <Form.Control
              className="form-control-custom"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <small className="text-muted">At least 6 characters</small>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="form-label-custom">Confirm Password</Form.Label>
            <Form.Control
              className="form-control-custom"
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Button type="submit" className="btn-gradient-primary w-100 mb-3" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating account...
              </>
            ) : (
              '🚀 Sign Up'
            )}
          </Button>
        </Form>
        
        <div className="text-center mt-4">
          <p className="text-muted mb-0">
            Already have an account? <Link to="/login" style={{color: '#667eea', fontWeight: 600}}>Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
