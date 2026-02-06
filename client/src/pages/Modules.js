// client/src/pages/Modules.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { modules as modulesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/custom.css';

function Modules() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    color: '#3B82F6',
    icon: '',
    credits: ''
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  
  // Preset color palette
  const presetColors = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Yellow', value: '#EAB308' },
    { name: 'Green', value: '#10B981' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Violet', value: '#A855F7' },
    { name: 'Fuchsia', value: '#D946EF' }
  ];
  
  // Icon options
  const iconOptions = [
    { label: 'None', value: '' },
    { label: '📚 Books', value: '📚' },
    { label: '💻 Computer', value: '💻' },
    { label: '🔬 Science', value: '🔬' },
    { label: '🎨 Art', value: '🎨' },
    { label: '🎭 Theater', value: '🎭' },
    { label: '🎵 Music', value: '🎵' },
    { label: '⚖️ Law', value: '⚖️' },
    { label: '🏥 Medicine', value: '🏥' },
    { label: '💼 Business', value: '💼' },
    { label: '🌍 Geography', value: '🌍' },
    { label: '🧮 Math', value: '🧮' },
    { label: '🧪 Chemistry', value: '🧪' },
    { label: '⚡ Physics', value: '⚡' },
    { label: '🗣️ Language', value: '🗣️' },
    { label: '📖 Literature', value: '📖' },
    { label: '🏛️ History', value: '🏛️' },
    { label: '🎓 General', value: '🎓' }
  ];
  
  useEffect(() => {
    loadModules();
  }, []);
  
  const loadModules = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await modulesApi.getAll();
      setModules(response.data.modules || []);
    } catch (err) {
      console.error('Error loading modules:', err);
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
      } else {
        setError('Failed to load modules. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenModal = () => {
    setFormData({
      name: '',
      code: '',
      color: '#3B82F6',
      icon: '',
      credits: ''
    });
    setValidationErrors({});
    setFormError('');
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      name: '',
      code: '',
      color: '#3B82F6',
      icon: '',
      credits: ''
    });
    setValidationErrors({});
    setFormError('');
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const handleColorSelect = (color) => {
    setFormData(prev => ({
      ...prev,
      color
    }));
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Module name is required';
    }
    
    if (formData.credits && (parseFloat(formData.credits) < 0 || parseFloat(formData.credits) > 20)) {
      errors.credits = 'Credits must be between 0 and 20';
    }
    
    // Validate hex color if custom
    if (formData.color && !/^#[0-9A-F]{6}$/i.test(formData.color)) {
      errors.color = 'Invalid color format (use #RRGGBB)';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const moduleData = {
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        color: formData.color,
        icon: formData.icon || null,
        credits: formData.credits ? parseFloat(formData.credits) : null
      };
      
      await modulesApi.create(moduleData);
      
      setSuccessMessage(`✅ Module "${formData.name}" created successfully!`);
      handleCloseModal();
      await loadModules();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
      
    } catch (err) {
      console.error('Error creating module:', err);
      if (err.response?.status === 401) {
        setFormError('Session expired. Please log in again.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else if (err.response?.status === 400) {
        setFormError(err.response.data.error || 'Invalid module data');
      } else {
        setFormError('Unable to create module. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-custom"></div>
        <p className="mt-4 text-muted">Loading modules...</p>
      </div>
    );
  }
  
  return (
    <>
      {/* Navigation */}
      <nav className="custom-navbar">
        <Container className="d-flex justify-content-between align-items-center">
          <h3 className="gradient-text mb-0">📚 NoCram</h3>
          <div className="d-flex gap-3 align-items-center">
            <Button 
              variant="link"
              className="text-decoration-none"
              onClick={() => navigate('/dashboard')}
            >
              🏠 Dashboard
            </Button>
            <Button 
              variant="link"
              className="text-decoration-none"
              onClick={() => navigate('/assignments')}
            >
              📝 Assignments
            </Button>
            <Button 
              variant="link"
              className="text-decoration-none text-primary fw-bold"
              onClick={() => navigate('/modules')}
            >
              📚 Modules
            </Button>
            <span className="text-muted d-none d-md-inline">Welcome, <strong>{user?.name || user?.email}</strong></span>
            <Button 
              className="btn-outline-custom"
              size="sm"
              onClick={() => navigate('/settings')}
            >
              ⚙️ Settings
            </Button>
            <Button className="btn-outline-custom" size="sm" onClick={handleLogout}>
              🚪 Logout
            </Button>
          </div>
        </Container>
      </nav>
      
      <Container className="mt-5 fade-in">
        {/* Success message */}
        {successMessage && (
          <Alert variant="success" className="alert-custom fade-in mb-4">
            {successMessage}
          </Alert>
        )}
        
        {/* Error message */}
        {error && (
          <Alert variant="danger" className="alert-custom fade-in mb-4">
            {error}
          </Alert>
        )}
        
        {/* Header */}
        <div className="dashboard-header mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="dashboard-title">Your Modules</h2>
              <p className="dashboard-subtitle">Manage your courses and subjects</p>
            </div>
            <Button 
              className="btn-gradient-primary"
              size="lg"
              onClick={handleOpenModal}
            >
              ➕ Add Module
            </Button>
          </div>
        </div>
        
        {/* Modules Grid */}
        {modules.length === 0 ? (
          <Card className="shadow-sm">
            <Card.Body className="text-center py-5">
              <div className="mb-3" style={{ fontSize: '4rem' }}>📚</div>
              <h4 className="mb-3">No Modules Yet</h4>
              <p className="text-muted mb-4">Start by adding your first module to organize your assignments.</p>
              <Button className="btn-gradient-primary" onClick={handleOpenModal}>
                ➕ Add Your First Module
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-4">
            {modules.map((module) => (
              <Col key={module.id} xs={12} sm={6} md={4} lg={3}>
                <Card 
                  className="module-card h-100 shadow-sm"
                  style={{ borderLeft: `4px solid ${module.color}` }}
                >
                  <Card.Body>
                    <div className="d-flex align-items-start justify-content-between mb-3">
                      <div className="module-icon" style={{ fontSize: '2rem' }}>
                        {module.icon || '📚'}
                      </div>
                      <div 
                        className="module-color-indicator"
                        style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          backgroundColor: module.color 
                        }}
                      />
                    </div>
                    
                    <h5 className="mb-2">{module.name}</h5>
                    
                    {module.code && (
                      <Badge bg="secondary" className="mb-2">{module.code}</Badge>
                    )}
                    
                    {module.credits && (
                      <p className="text-muted small mb-0">
                        {module.credits} {module.credits === 1 ? 'credit' : 'credits'}
                      </p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Container>
      
      {/* Create Module Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title>
            <span className="gradient-text">➕ Add New Module</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            {formError && (
              <Alert variant="danger" className="mb-3">
                {formError}
              </Alert>
            )}
            
            {/* Module Name */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">
                Module Name <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Introduction to Computer Science"
                isInvalid={!!validationErrors.name}
                className="form-control-custom"
                autoFocus
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.name}
              </Form.Control.Feedback>
            </Form.Group>
            
            <Row>
              {/* Module Code */}
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">Module Code</Form.Label>
                  <Form.Control
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g., CS101"
                    className="form-control-custom"
                  />
                </Form.Group>
              </Col>
              
              {/* Credits */}
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">Credits</Form.Label>
                  <Form.Control
                    type="number"
                    name="credits"
                    value={formData.credits}
                    onChange={handleInputChange}
                    placeholder="e.g., 3"
                    min="0"
                    max="20"
                    step="0.5"
                    isInvalid={!!validationErrors.credits}
                    className="form-control-custom"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.credits}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            {/* Icon Selector */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">Icon</Form.Label>
              <Form.Select
                name="icon"
                value={formData.icon}
                onChange={handleInputChange}
                className="form-control-custom"
              >
                {iconOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            {/* Color Picker */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">Color</Form.Label>
              
              {/* Preset Colors */}
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`color-swatch ${formData.color === color.value ? 'selected' : ''}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleColorSelect(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              {/* Custom Hex Input */}
              <div className="d-flex gap-2 align-items-center">
                <Form.Control
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  placeholder="#3B82F6"
                  isInvalid={!!validationErrors.color}
                  className="form-control-custom"
                  style={{ maxWidth: '120px' }}
                />
                <div 
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: formData.color,
                    border: '2px solid #e2e8f0'
                  }}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.color}
                </Form.Control.Feedback>
              </div>
              <Form.Text className="text-muted">
                Select a preset color or enter a custom hex code
              </Form.Text>
            </Form.Group>
            
            <div className="d-flex gap-2 justify-content-end mt-4">
              <Button 
                variant="outline-secondary" 
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="btn-gradient-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Creating...
                  </>
                ) : (
                  '✓ Create Module'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default Modules;
