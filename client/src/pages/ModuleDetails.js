// client/src/pages/ModuleDetails.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { modules as modulesApi, assignments as assignmentsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/custom.css';

function ModuleDetails() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [module, setModule] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    module_id: id,
    title: '',
    description: '',
    due_date: '',
    weighting_percent: '',
    estimated_hours: ''
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  
  // Load module and assignments
  useEffect(() => {
    loadModuleData();
  }, [id]);
  
  const loadModuleData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch module details
      const moduleRes = await modulesApi.getById(id);
      setModule(moduleRes.data.module);
      
      // Fetch assignments for this module
      const assignmentsRes = await assignmentsApi.getAll({ module_id: id });
      setAssignments(assignmentsRes.data.assignments);
    } catch (err) {
      console.error('Error loading module data:', err);
      if (err.response?.status === 404) {
        setError('Module not found');
      } else if (err.response?.status === 401) {
        logout();
        navigate('/login');
      } else {
        setError('Unable to load module data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate stats
  const calculateStats = () => {
    if (!assignments.length) {
      return {
        total: 0,
        completed: 0,
        totalHours: 0,
        avgWeighting: 0
      };
    }
    
    const completed = assignments.filter(a => a.status === 'Done').length;
    const totalHours = assignments.reduce((sum, a) => sum + (parseFloat(a.estimated_hours) || 0), 0);
    const totalWeighting = assignments.reduce((sum, a) => sum + (parseFloat(a.weighting_percent) || 0), 0);
    const avgWeighting = totalWeighting / assignments.length;
    
    return {
      total: assignments.length,
      completed,
      totalHours: totalHours.toFixed(1),
      avgWeighting: avgWeighting.toFixed(1)
    };
  };
  
  const stats = calculateStats();
  
  // Modal handlers
  const handleOpenModal = () => {
    setFormData({
      module_id: id,
      title: '',
      description: '',
      due_date: '',
      weighting_percent: '',
      estimated_hours: ''
    });
    setValidationErrors({});
    setFormError('');
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      module_id: id,
      title: '',
      description: '',
      due_date: '',
      weighting_percent: '',
      estimated_hours: ''
    });
    setValidationErrors({});
    setFormError('');
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Assignment title is required';
    }
    
    if (!formData.due_date) {
      errors.due_date = 'Due date is required';
    }
    
    if (formData.weighting_percent && (formData.weighting_percent < 0 || formData.weighting_percent > 100)) {
      errors.weighting_percent = 'Weighting must be between 0 and 100';
    }
    
    if (formData.estimated_hours && formData.estimated_hours < 0) {
      errors.estimated_hours = 'Estimated hours cannot be negative';
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
      
      const assignmentData = {
        module_id: id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        due_date: formData.due_date,
        weighting_percent: formData.weighting_percent ? parseFloat(formData.weighting_percent) : null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null
      };
      
      await assignmentsApi.create(assignmentData);
      
      setSuccessMessage(`✅ Assignment "${formData.title}" created successfully!`);
      handleCloseModal();
      await loadModuleData();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
      
    } catch (err) {
      console.error('Error creating assignment:', err);
      if (err.response?.status === 401) {
        setFormError('Session expired. Please log in again.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else if (err.response?.status === 400) {
        setFormError(err.response.data.error || 'Invalid assignment data');
      } else {
        setFormError('Unable to create assignment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleStatusChange = async (assignment, newStatus, e) => {
    e.stopPropagation();
    
    try {
      await assignmentsApi.updateStatus(assignment.id, newStatus);
      setSuccessMessage(`✅ Assignment status updated to "${newStatus}"!`);
      await loadModuleData();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update assignment status. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };
  
  const getStatusVariant = (status) => {
    switch (status) {
      case 'Not Started':
        return 'secondary';
      case 'In Progress':
        return 'primary';
      case 'Done':
        return 'success';
      default:
        return 'secondary';
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  const isOverdue = (dueDate, status) => {
    if (status === 'Done') return false;
    return new Date(dueDate) < new Date();
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-custom"></div>
        <p className="mt-4 text-muted">Loading module details...</p>
      </div>
    );
  }
  
  if (error && !module) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">{error}</Alert>
        <Button onClick={() => navigate('/modules')}>← Back to Modules</Button>
      </Container>
    );
  }
  
  return (
    <>
      {/* Navigation */}
      <nav className="custom-navbar">
        <Container className="d-flex justify-content-between align-items-center">
          <h3 className="gradient-text mb-0">📚 NoCram</h3>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted">{user?.email}</span>
            <Button variant="outline-light" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </Container>
      </nav>
      
      <Container className="py-4">
        {/* Back Button */}
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={() => navigate('/modules')}
          className="mb-3"
        >
          ← Back to Modules
        </Button>
        
        {/* Success/Error Messages */}
        {successMessage && (
          <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {/* Module Header */}
        {module && (
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <Row className="align-items-center">
                <Col md={8}>
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '8px',
                        backgroundColor: module.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}
                    >
                      {module.icon || '📘'}
                    </div>
                    <div>
                      <h2 className="mb-1">{module.name}</h2>
                      <div className="d-flex gap-2 align-items-center">
                        {module.code && (
                          <Badge bg="secondary">{module.code}</Badge>
                        )}
                        {module.credits && (
                          <span className="text-muted">
                            {module.credits} {module.credits === 1 ? 'credit' : 'credits'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Col>
                <Col md={4} className="text-md-end">
                  <Button 
                    className="btn-gradient-primary"
                    onClick={handleOpenModal}
                  >
                    ➕ Add Assignment
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
        
        {/* Stats Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center shadow-sm">
              <Card.Body>
                <h3 className="gradient-text mb-0">{stats.total}</h3>
                <p className="text-muted small mb-0">Total Assignments</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center shadow-sm">
              <Card.Body>
                <h3 className="text-success mb-0">{stats.completed}</h3>
                <p className="text-muted small mb-0">Completed</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center shadow-sm">
              <Card.Body>
                <h3 className="text-primary mb-0">{stats.totalHours}h</h3>
                <p className="text-muted small mb-0">Total Hours</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center shadow-sm">
              <Card.Body>
                <h3 className="text-info mb-0">{stats.avgWeighting}%</h3>
                <p className="text-muted small mb-0">Avg Weighting</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        {/* Assignments List */}
        <Card className="shadow-sm">
          <Card.Header>
            <h5 className="mb-0">📝 Assignments</h5>
          </Card.Header>
          <Card.Body>
            {assignments.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted mb-3">No assignments yet for this module</p>
                <Button 
                  variant="outline-primary"
                  onClick={handleOpenModal}
                >
                  ➕ Create First Assignment
                </Button>
              </div>
            ) : (
              <Row>
                {assignments.map(assignment => (
                  <Col key={assignment.id} md={12} className="mb-3">
                    <Card 
                      className={`assignment-card h-100 ${isOverdue(assignment.due_date, assignment.status) ? 'border-danger' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/assignments`)}
                    >
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="flex-grow-1">
                            <h5 className="mb-1">{assignment.title}</h5>
                            {assignment.description && (
                              <p className="text-muted small mb-2">{assignment.description}</p>
                            )}
                          </div>
                          <Badge bg={getStatusVariant(assignment.status)}>
                            {assignment.status}
                          </Badge>
                        </div>
                        
                        <div className="d-flex flex-wrap gap-3 small text-muted">
                          <span>
                            📅 Due: {formatDate(assignment.due_date)}
                            {isOverdue(assignment.due_date, assignment.status) && (
                              <span className="text-danger ms-1">(Overdue)</span>
                            )}
                          </span>
                          {assignment.weighting_percent && (
                            <span>⚖️ {assignment.weighting_percent}%</span>
                          )}
                          {assignment.estimated_hours && (
                            <span>⏱️ {assignment.estimated_hours}h</span>
                          )}
                        </div>
                        
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant={`outline-${getStatusVariant(assignment.status)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const statuses = ['Not Started', 'In Progress', 'Done'];
                              const currentIndex = statuses.indexOf(assignment.status);
                              const nextStatus = statuses[(currentIndex + 1) % 3];
                              handleStatusChange(assignment, nextStatus, e);
                            }}
                          >
                            Change Status
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card.Body>
        </Card>
      </Container>
      
      {/* Add Assignment Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title>
            <span className="gradient-text">➕ Add New Assignment</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            {formError && (
              <Alert variant="danger" className="mb-3">
                {formError}
              </Alert>
            )}
            
            <Alert variant="info" className="mb-3">
              This assignment will be added to <strong>{module?.name}</strong>
            </Alert>
            
            {/* Title */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">
                Assignment Title <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Final Project"
                isInvalid={!!validationErrors.title}
                required
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.title}
              </Form.Control.Feedback>
            </Form.Group>
            
            {/* Description */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the assignment"
              />
            </Form.Group>
            
            {/* Due Date */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">
                Due Date <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
                isInvalid={!!validationErrors.due_date}
                required
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.due_date}
              </Form.Control.Feedback>
            </Form.Group>
            
            <Row>
              {/* Weighting */}
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">
                    Weighting (%)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="weighting_percent"
                    value={formData.weighting_percent}
                    onChange={handleInputChange}
                    placeholder="0-100"
                    min="0"
                    max="100"
                    step="0.1"
                    isInvalid={!!validationErrors.weighting_percent}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.weighting_percent}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              {/* Estimated Hours */}
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">
                    Estimated Hours
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="estimated_hours"
                    value={formData.estimated_hours}
                    onChange={handleInputChange}
                    placeholder="e.g., 10"
                    min="0"
                    step="0.5"
                    isInvalid={!!validationErrors.estimated_hours}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.estimated_hours}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            <div className="d-flex justify-content-end gap-2 mt-4">
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
                  '✓ Create Assignment'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default ModuleDetails;
