// client/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, Badge, Spinner, Alert, Button, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { dashboard, assignments, modules as modulesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/custom.css';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Module selection state
  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    module_id: '',
    due_date: '',
    due_time: '23:59',
    weighting_percent: '',
    estimated_hours: '',
    description: ''
  });

  // Form validation errors
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadDashboard();
    loadModules();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await dashboard.getData();
      setData(response.data);
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      setLoadingModules(true);
      const response = await modulesApi.getAll();
      setModules(response.data.modules || []);
    } catch (err) {
      console.error('Failed to load modules:', err);
    } finally {
      setLoadingModules(false);
    }
  };

  const handleOpenModal = () => {
    // Reset form
    setFormData({
      title: '',
      module_id: '',
      due_date: '',
      due_time: '23:59',
      weighting_percent: '',
      estimated_hours: '',
      description: ''
    });
    setValidationErrors({});
    setFormError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormError('');
    setValidationErrors({});
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

  const validateForm = () => {
    const errors = {};

    // Title validation
    if (!formData.title || formData.title.trim().length === 0) {
      errors.title = 'Title is required';
    } else if (formData.title.length > 500) {
      errors.title = 'Title must be 500 characters or less';
    }

    // Due date validation
    if (!formData.due_date) {
      errors.due_date = 'Due date is required';
    } else {
      const dueDateTime = new Date(`${formData.due_date}T${formData.due_time}`);
      const now = new Date();
      if (dueDateTime < now) {
        errors.due_date = 'Due date is in the past. Are you sure you want to continue?';
      }
    }

    // Weighting validation
    if (formData.weighting_percent !== '') {
      const weighting = parseFloat(formData.weighting_percent);
      if (isNaN(weighting) || weighting < 0 || weighting > 100) {
        errors.weighting_percent = 'Weighting must be between 0 and 100';
      }
    }

    // Estimated hours validation
    if (formData.estimated_hours !== '') {
      const hours = parseFloat(formData.estimated_hours);
      if (isNaN(hours) || hours < 0) {
        errors.estimated_hours = 'Estimated hours must be a positive number';
      }
    }

    // Description validation
    if (formData.description && formData.description.length > 2000) {
      errors.description = 'Description must be 2000 characters or less';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      // Combine date and time into ISO format
      const dueDateTime = new Date(`${formData.due_date}T${formData.due_time}`);
      
      const payload = {
        title: formData.title.trim(),
        module_id: formData.module_id || null,
        due_date: dueDateTime.toISOString(),
        weighting_percent: formData.weighting_percent ? parseFloat(formData.weighting_percent) : null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        description: formData.description.trim() || null
      };

      await assignments.create(payload);

      // Show success message
      setSuccessMessage('✅ Assignment created successfully! Automatic reminders have been set.');
      
      // Reload dashboard data
      await loadDashboard();

      // Close modal after short delay
      setTimeout(() => {
        handleCloseModal();
        setSuccessMessage('');
      }, 1500);

    } catch (err) {
      console.error('Error creating assignment:', err);
      if (err.response?.status === 400) {
        setFormError(err.response.data.error || 'Invalid input. Please check your data.');
      } else if (err.response?.status === 401) {
        setFormError('Session expired. Please log in again.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else if (err.response?.status === 404) {
        setFormError('Selected module not found.');
      } else {
        setFormError('Unable to create assignment. Please check your internet connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusBadge = (status) => {
    const badgeClasses = {
      not_started: 'badge-gradient-primary',
      in_progress: 'badge-gradient-warning',
      done: 'badge-gradient-success',
    };
    const labels = {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      done: 'Done',
    };
    return <span className={`badge badge-custom ${badgeClasses[status]}`}>{labels[status]}</span>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-custom"></div>
        <p className="mt-4 text-muted">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert className="alert-custom alert-danger">{error}</Alert>
        <Button className="btn-gradient-primary" onClick={loadDashboard}>Retry</Button>
      </Container>
    );
  }

  return (
    <>
      <nav className="navbar custom-navbar">
        <Container>
          <h1 className="navbar-brand-custom" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            NoCram
          </h1>
          <div className="d-flex align-items-center gap-3">
            <Button 
              variant="link"
              className="text-decoration-none text-primary fw-bold"
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

        <div className="dashboard-header mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="dashboard-title">Your Dashboard</h2>
              <p className="dashboard-subtitle">Track your assignments and stay on top of deadlines</p>
            </div>
            <Button 
              className="btn-gradient-primary"
              size="lg"
              onClick={handleOpenModal}
            >
              ➕ Add Assignment
            </Button>
          </div>
        </div>

        <Row className="mb-5 g-4">
          <Col md={4}>
            <div className="stat-card text-center">
              <div className="stat-number">{data.stats.not_started}</div>
              <div className="stat-label">📋 Not Started</div>
            </div>
          </Col>
          <Col md={4}>
            <div className="stat-card text-center">
              <div className="stat-number">{data.stats.in_progress}</div>
              <div className="stat-label">⚡ In Progress</div>
            </div>
          </Col>
          <Col md={4}>
            <div className="stat-card text-center">
              <div className="stat-number">{data.workload.total_hours}h</div>
              <div className="stat-label">📅 This Week</div>
            </div>
          </Col>
        </Row>

        <Row className="g-4">
          <Col lg={6}>
            <div className="assignment-card slide-in">
              <div className="assignment-card-header">
                <h5>🗓️ Upcoming (Next 7 Days)</h5>
              </div>
              <div>
                {data.upcoming.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">✨</div>
                    <div className="empty-state-text">No upcoming deadlines</div>
                  </div>
                ) : (
                  data.upcoming.map((assignment) => (
                    <div key={assignment.id} className="assignment-list-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="assignment-title">{assignment.title}</div>
                          <div className="assignment-meta">
                            📚 {assignment.module_name} {assignment.module_code && `(${assignment.module_code})`}
                          </div>
                        </div>
                        <div className="text-end ms-3">
                          <div className="mb-2">{getStatusBadge(assignment.status)}</div>
                          <small className="text-muted">📅 {formatDate(assignment.due_date)}</small>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Col>

          <Col lg={6}>
            <div className="assignment-card slide-in" style={{animationDelay: '0.1s'}}>
              <div className="assignment-card-header" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white'}}>
                <h5>⚠️ Overdue</h5>
              </div>
              <div>
                {data.overdue.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🎉</div>
                    <div className="empty-state-text">No overdue assignments!</div>
                  </div>
                ) : (
                  data.overdue.map((assignment) => (
                    <div key={assignment.id} className="assignment-list-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="assignment-title">{assignment.title}</div>
                          <div className="assignment-meta">
                            📚 {assignment.module_name}
                          </div>
                        </div>
                        <div className="text-end ms-3">
                          <div className="mb-2">{getStatusBadge(assignment.status)}</div>
                          <small className="text-danger fw-bold">⏰ {formatDate(assignment.due_date)}</small>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Create Assignment Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title>
            <span className="gradient-text">➕ Create New Assignment</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {formError && (
            <Alert variant="danger" className="alert-custom mb-3">
              {formError}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {/* Title */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">
                Title <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Essay on Climate Change"
                maxLength={500}
                isInvalid={!!validationErrors.title}
                className="form-control-custom"
                autoFocus
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.title}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                {formData.title.length}/500 characters
              </Form.Text>
            </Form.Group>

            {/* Module */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">Module</Form.Label>
              <Form.Select
                name="module_id"
                value={formData.module_id}
                onChange={handleInputChange}
                className="form-control-custom"
                disabled={loadingModules}
              >
                <option value="">No module (standalone assignment)</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>
                    {module.icon} {module.name} {module.code && `(${module.code})`}
                  </option>
                ))}
              </Form.Select>
              {modules.length === 0 && !loadingModules && (
                <Form.Text className="text-muted">
                  No modules yet. You can create modules from the Modules page.
                </Form.Text>
              )}
            </Form.Group>

            {/* Due Date and Time Row */}
            <Row className="mb-3">
              <Col md={7}>
                <Form.Group>
                  <Form.Label className="form-label-custom">
                    Due Date <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.due_date}
                    className="form-control-custom"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.due_date}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group>
                  <Form.Label className="form-label-custom">Due Time</Form.Label>
                  <Form.Control
                    type="time"
                    name="due_time"
                    value={formData.due_time}
                    onChange={handleInputChange}
                    className="form-control-custom"
                  />
                  <Form.Text className="text-muted">Default: 11:59 PM</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Weighting and Estimated Hours Row */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label-custom">Weighting %</Form.Label>
                  <Form.Control
                    type="number"
                    name="weighting_percent"
                    value={formData.weighting_percent}
                    onChange={handleInputChange}
                    placeholder="e.g., 25"
                    min="0"
                    max="100"
                    step="0.1"
                    isInvalid={!!validationErrors.weighting_percent}
                    className="form-control-custom"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.weighting_percent}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Percentage towards final grade (0-100)
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label-custom">Estimated Hours</Form.Label>
                  <Form.Control
                    type="number"
                    name="estimated_hours"
                    value={formData.estimated_hours}
                    onChange={handleInputChange}
                    placeholder="e.g., 5.5"
                    min="0"
                    step="0.5"
                    isInvalid={!!validationErrors.estimated_hours}
                    className="form-control-custom"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.estimated_hours}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    How long will this take?
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Description */}
            <Form.Group className="mb-4">
              <Form.Label className="form-label-custom">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add any notes, requirements, or details about this assignment..."
                maxLength={2000}
                isInvalid={!!validationErrors.description}
                className="form-control-custom"
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.description}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                {formData.description.length}/2000 characters
              </Form.Text>
            </Form.Group>

            {/* Info Box */}
            <Alert variant="info" className="mb-4 border-0" style={{backgroundColor: '#e0f2fe'}}>
              <div className="d-flex align-items-start gap-2">
                <span>💡</span>
                <small>
                  <strong>Automatic Reminders:</strong> We'll send you email reminders 7 days, 2 days, 
                  and 1 day before the due date to help you stay on track.
                </small>
              </div>
            </Alert>

            {/* Action Buttons */}
            <div className="d-flex gap-2 justify-content-end">
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
                  '✨ Create Assignment'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default Dashboard;
