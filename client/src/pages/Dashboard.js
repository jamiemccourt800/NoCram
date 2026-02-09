// client/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, Badge, Spinner, Alert, Button, Modal, Form, Dropdown, ButtonGroup } from 'react-bootstrap';
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

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    module_id: '',
    due_date: '',
    due_time: '',
    weighting_percent: '',
    estimated_hours: '',
    description: '',
    status: 'not_started'
  });

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleOpenEditModal = (assignment) => {
    // Format due date and time
    const dueDate = new Date(assignment.due_date);
    const dateStr = dueDate.toISOString().split('T')[0];
    const timeStr = dueDate.toTimeString().substring(0, 5);

    setEditingAssignment(assignment);
    setEditFormData({
      title: assignment.title || '',
      module_id: assignment.module_id || '',
      due_date: dateStr,
      due_time: timeStr,
      weighting_percent: assignment.weighting_percent || '',
      estimated_hours: assignment.estimated_hours || '',
      description: assignment.description || '',
      status: assignment.status || 'not_started'
    });
    setValidationErrors({});
    setFormError('');
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingAssignment(null);
    setFormError('');
    setValidationErrors({});
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateEditForm = () => {
    const errors = {};

    if (!editFormData.title || editFormData.title.trim().length === 0) {
      errors.title = 'Title is required';
    } else if (editFormData.title.length > 500) {
      errors.title = 'Title must be 500 characters or less';
    }

    if (!editFormData.due_date) {
      errors.due_date = 'Due date is required';
    }

    if (editFormData.weighting_percent !== '') {
      const weighting = parseFloat(editFormData.weighting_percent);
      if (isNaN(weighting) || weighting < 0 || weighting > 100) {
        errors.weighting_percent = 'Weighting must be between 0 and 100';
      }
    }

    if (editFormData.estimated_hours !== '') {
      const hours = parseFloat(editFormData.estimated_hours);
      if (isNaN(hours) || hours < 0) {
        errors.estimated_hours = 'Estimated hours must be a positive number';
      }
    }

    if (editFormData.description && editFormData.description.length > 2000) {
      errors.description = 'Description must be 2000 characters or less';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateEditForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const dueDateTime = new Date(`${editFormData.due_date}T${editFormData.due_time}`);
      
      const payload = {
        title: editFormData.title.trim(),
        module_id: editFormData.module_id || null,
        due_date: dueDateTime.toISOString(),
        weighting_percent: editFormData.weighting_percent ? parseFloat(editFormData.weighting_percent) : null,
        estimated_hours: editFormData.estimated_hours ? parseFloat(editFormData.estimated_hours) : null,
        description: editFormData.description.trim() || null,
        status: editFormData.status
      };

      await assignments.update(editingAssignment.id, payload);

      setSuccessMessage('✅ Assignment updated successfully!');
      
      await loadDashboard();

      setTimeout(() => {
        handleCloseEditModal();
        setSuccessMessage('');
      }, 2000);

    } catch (err) {
      console.error('Error updating assignment:', err);
      if (err.response?.status === 400) {
        setFormError(err.response.data.error || 'Invalid input. Please check your data.');
      } else if (err.response?.status === 401) {
        setFormError('Session expired. Please log in again.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else if (err.response?.status === 404) {
        setFormError('Assignment not found.');
      } else {
        setFormError('Unable to update assignment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (assignment) => {
    setDeletingAssignment(assignment);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingAssignment(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAssignment) return;

    try {
      setDeleting(true);

      await assignments.delete(deletingAssignment.id);

      setSuccessMessage(`✅ "${deletingAssignment.title}" deleted successfully. Associated reminders were also removed.`);
      
      await loadDashboard();

      handleCloseDeleteModal();
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);

    } catch (err) {
      console.error('Error deleting assignment:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else if (err.response?.status === 404) {
        setError('Assignment not found. It may have already been deleted.');
        handleCloseDeleteModal();
        await loadDashboard();
      } else {
        setError('Unable to delete assignment. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleStatusChange = async (assignment, newStatus, e) => {
    // Prevent event bubbling
    if (e) e.stopPropagation();
    
    // Don't update if status is the same
    if (assignment.status === newStatus) return;
    
    try {
      await assignments.updateStatus(assignment.id, newStatus);
      
      // Show success message
      const statusLabels = {
        not_started: 'Not Started',
        in_progress: 'In Progress',
        done: 'Done'
      };
      setSuccessMessage(`✅ "${assignment.title}" status updated to "${statusLabels[newStatus]}"!`);
      
      // Reload dashboard to update stats and lists
      await loadDashboard();
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (err) {
      console.error('Error updating assignment status:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else if (err.response?.status === 404) {
        setError('Assignment not found.');
        await loadDashboard();
        setTimeout(() => {
          setError('');
        }, 3000);
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || 'Invalid status value.');
        setTimeout(() => {
          setError('');
        }, 3000);
      } else {
        const errorMsg = err.response?.data?.error || err.message || 'Unable to update assignment status. Please try again.';
        setError(errorMsg);
        setTimeout(() => {
          setError('');
        }, 3000);
      }
    }
  };

  const handleToggleComplete = async (assignment, e) => {
    // Prevent event bubbling
    if (e) e.stopPropagation();

    const newStatus = assignment.status === 'done' ? 'not_started' : 'done';
    
    try {
      await assignments.updateStatus(assignment.id, newStatus);
      
      // Show success message
      if (newStatus === 'done') {
        setSuccessMessage(`✅ "${assignment.title}" marked as complete!`);
      } else {
        setSuccessMessage(`↩️ "${assignment.title}" marked as incomplete.`);
      }
      
      // Reload dashboard to update stats and lists
      await loadDashboard();
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (err) {
      console.error('Error updating assignment status:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else if (err.response?.status === 404) {
        setError('Assignment not found.');
        await loadDashboard();
        setTimeout(() => {
          setError('');
        }, 3000);
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || 'Invalid status value.');
        setTimeout(() => {
          setError('');
        }, 3000);
      } else {
        const errorMsg = err.response?.data?.error || err.message || 'Unable to update assignment status. Please try again.';
        setError(errorMsg);
        setTimeout(() => {
          setError('');
        }, 3000);
      }
    }
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

  const calculateDaysOverdue = (dueDateString) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    
    // Reset time to compare only dates
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const formatCompletionDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    
    // If completed today, show time
    if (date.toDateString() === today.toDateString()) {
      return `Completed today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    // Otherwise show date
    return `Completed on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
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
              className="text-decoration-none text-primary fw-bold position-relative"
              onClick={() => navigate('/dashboard')}
            >
              🏠 Dashboard
              {data?.overdue && data.overdue.length > 0 && (
                <Badge 
                  bg="danger" 
                  pill 
                  className="position-absolute top-0 start-100 translate-middle"
                  style={{ fontSize: '0.6rem' }}
                >
                  {data.overdue.length}
                </Badge>
              )}
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
              className="text-decoration-none"
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
            <div className={`stat-card text-center ${data.workload.total_hours > 40 ? 'workload-warning' : data.workload.total_hours > 30 ? 'workload-caution' : ''}`}>
              <div className="stat-number">
                {data.workload.total_hours}h
                {data.workload.total_hours > 40 && (
                  <span className="ms-2" style={{ fontSize: '0.6em' }}>⚠️</span>
                )}
              </div>
              <div className="stat-label">📅 This Week's Workload</div>
              {data.workload.total_hours > 40 && (
                <small className="text-danger d-block mt-2 fw-bold">High workload!</small>
              )}
              {data.workload.total_hours > 30 && data.workload.total_hours <= 40 && (
                <small className="text-warning d-block mt-2">Busy week ahead</small>
              )}
            </div>
          </Col>
        </Row>

        {/* Workload Breakdown Section */}
        {data.workload.breakdown && data.workload.breakdown.length > 0 && (
          <Row className="mt-4 mb-4">
            <Col>
              <Card className="shadow-sm">
                <Card.Header className="bg-light">
                  <h6 className="mb-0">📊 Workload Breakdown by Module</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    {data.workload.breakdown.map(module => (
                      <Col key={module.module_id} md={6} lg={4} className="mb-3">
                        <div 
                          className="d-flex align-items-center gap-3 p-3 rounded" 
                          style={{ 
                            backgroundColor: `${module.module_color}15`,
                            border: `2px solid ${module.module_color}`
                          }}
                        >
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: module.module_color,
                              flexShrink: 0
                            }}
                          />
                          <div className="flex-grow-1">
                            <div className="fw-bold text-truncate">{module.module_name}</div>
                            <small className="text-muted">{module.hours}h estimated</small>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

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
                    <div key={assignment.id} className={`assignment-list-item ${assignment.status === 'done' ? 'completed' : ''}`}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex align-items-start gap-3 flex-grow-1">
                          <div className="mt-1">
                            <Form.Check
                              type="checkbox"
                              checked={assignment.status === 'done'}
                              onChange={(e) => handleToggleComplete(assignment, e)}
                              className="completion-checkbox"
                              title={assignment.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
                            />
                          </div>
                          <div className="flex-grow-1">
                            <div className={`assignment-title ${assignment.status === 'done' ? 'text-decoration-line-through text-muted' : ''}`}>
                              {assignment.status === 'done' && '✓ '}{assignment.title}
                            </div>
                            <div className="assignment-meta">
                              📚 {assignment.module_name} {assignment.module_code && `(${assignment.module_code})`}
                            </div>
                            {assignment.status === 'done' && assignment.completed_at && (
                              <div className="text-success small mt-1">
                                {formatCompletionDate(assignment.completed_at)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-end ms-3">
                          <Dropdown as={ButtonGroup} className="mb-2">
                            <div className="d-flex align-items-center">
                              {getStatusBadge(assignment.status)}
                            </div>
                            <Dropdown.Toggle 
                              split 
                              variant="link" 
                              size="sm" 
                              id={`status-dropdown-${assignment.id}`}
                              className="text-decoration-none p-0 ms-1"
                              style={{border: 'none', boxShadow: 'none'}}
                            />
                            <Dropdown.Menu>
                              <Dropdown.Item 
                                onClick={(e) => handleStatusChange(assignment, 'not_started', e)}
                                active={assignment.status === 'not_started'}
                              >
                                📋 Not Started
                              </Dropdown.Item>
                              <Dropdown.Item 
                                onClick={(e) => handleStatusChange(assignment, 'in_progress', e)}
                                active={assignment.status === 'in_progress'}
                              >
                                ⚡ In Progress
                              </Dropdown.Item>
                              <Dropdown.Item 
                                onClick={(e) => handleStatusChange(assignment, 'done', e)}
                                active={assignment.status === 'done'}
                              >
                                ✓ Done
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                          <small className="text-muted d-block mb-2">📅 {formatDate(assignment.due_date)}</small>
                          <div className="d-flex gap-2 justify-content-end">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleOpenEditModal(assignment)}
                            >
                              ✏️ Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleOpenDeleteModal(assignment)}
                            >
                              🗑️ Delete
                            </Button>
                          </div>
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
                    <div key={assignment.id} className={`assignment-list-item ${assignment.status === 'done' ? 'completed' : ''}`}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex align-items-start gap-3 flex-grow-1">
                          <div className="mt-1">
                            <Form.Check
                              type="checkbox"
                              checked={assignment.status === 'done'}
                              onChange={(e) => handleToggleComplete(assignment, e)}
                              className="completion-checkbox"
                              title={assignment.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
                            />
                          </div>
                          <div className="flex-grow-1">
                            <div className={`assignment-title ${assignment.status === 'done' ? 'text-decoration-line-through text-muted' : ''}`}>
                              {assignment.status === 'done' && '✓ '}{assignment.title}
                            </div>
                            <div className="assignment-meta">
                              📚 {assignment.module_name} {assignment.module_code && `(${assignment.module_code})`}
                            </div>
                            {assignment.status === 'done' && assignment.completed_at && (
                              <div className="text-success small mt-1">
                                {formatCompletionDate(assignment.completed_at)}
                              </div>
                            )}
                            {assignment.status !== 'done' && (
                              <div className="text-danger small mt-1 fw-bold">
                                {calculateDaysOverdue(assignment.due_date) === 1 
                                  ? '1 day overdue' 
                                  : `${calculateDaysOverdue(assignment.due_date)} days overdue`}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-end ms-3">
                          <Dropdown as={ButtonGroup} className="mb-2">
                            <div className="d-flex align-items-center">
                              {getStatusBadge(assignment.status)}
                            </div>
                            <Dropdown.Toggle 
                              split 
                              variant="link" 
                              size="sm" 
                              id={`status-dropdown-overdue-${assignment.id}`}
                              className="text-decoration-none p-0 ms-1"
                              style={{border: 'none', boxShadow: 'none'}}
                            />
                            <Dropdown.Menu>
                              <Dropdown.Item 
                                onClick={(e) => handleStatusChange(assignment, 'not_started', e)}
                                active={assignment.status === 'not_started'}
                              >
                                📋 Not Started
                              </Dropdown.Item>
                              <Dropdown.Item 
                                onClick={(e) => handleStatusChange(assignment, 'in_progress', e)}
                                active={assignment.status === 'in_progress'}
                              >
                                ⚡ In Progress
                              </Dropdown.Item>
                              <Dropdown.Item 
                                onClick={(e) => handleStatusChange(assignment, 'done', e)}
                                active={assignment.status === 'done'}
                              >
                                ✓ Done
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                          <small className="text-danger fw-bold d-block mb-2">⏰ {formatDate(assignment.due_date)}</small>
                          <div className="d-flex gap-2 justify-content-end">
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleOpenEditModal(assignment)}
                            >
                              ✏️ Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleOpenDeleteModal(assignment)}
                            >
                              🗑️ Delete
                            </Button>
                          </div>
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

      {/* Edit Assignment Modal */}
      <Modal show={showEditModal} onHide={handleCloseEditModal} size="lg" centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title>
            <span className="gradient-text">✏️ Edit Assignment</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {formError && (
            <Alert variant="danger" className="alert-custom mb-3">
              {formError}
            </Alert>
          )}

          <Form onSubmit={handleEditSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">
                Title <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={editFormData.title}
                onChange={handleEditInputChange}
                maxLength={500}
                isInvalid={!!validationErrors.title}
                className="form-control-custom"
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.title}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">Module</Form.Label>
              <Form.Select
                name="module_id"
                value={editFormData.module_id}
                onChange={handleEditInputChange}
                className="form-control-custom"
              >
                <option value="">No module</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>
                    {module.icon} {module.name} {module.code && `(${module.code})`}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Row className="mb-3">
              <Col md={7}>
                <Form.Group>
                  <Form.Label className="form-label-custom">
                    Due Date <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="due_date"
                    value={editFormData.due_date}
                    onChange={handleEditInputChange}
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
                    value={editFormData.due_time}
                    onChange={handleEditInputChange}
                    className="form-control-custom"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label-custom">Weighting %</Form.Label>
                  <Form.Control
                    type="number"
                    name="weighting_percent"
                    value={editFormData.weighting_percent}
                    onChange={handleEditInputChange}
                    min="0"
                    max="100"
                    step="0.1"
                    isInvalid={!!validationErrors.weighting_percent}
                    className="form-control-custom"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.weighting_percent}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label-custom">Estimated Hours</Form.Label>
                  <Form.Control
                    type="number"
                    name="estimated_hours"
                    value={editFormData.estimated_hours}
                    onChange={handleEditInputChange}
                    min="0"
                    step="0.5"
                    isInvalid={!!validationErrors.estimated_hours}
                    className="form-control-custom"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.estimated_hours}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">Status</Form.Label>
              <Form.Select
                name="status"
                value={editFormData.status}
                onChange={handleEditInputChange}
                className="form-control-custom"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="form-label-custom">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="description"
                value={editFormData.description}
                onChange={handleEditInputChange}
                maxLength={2000}
                isInvalid={!!validationErrors.description}
                className="form-control-custom"
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.description}
              </Form.Control.Feedback>
            </Form.Group>

            <Alert variant="info" className="mb-4 border-0" style={{backgroundColor: '#e0f2fe'}}>
              <div className="d-flex align-items-start gap-2">
                <span>💡</span>
                <small>
                  <strong>Reminder Updates:</strong> If you change the due date, 
                  email reminders will be automatically updated.
                </small>
              </div>
            </Alert>

            <div className="d-flex gap-2 justify-content-end">
              <Button 
                variant="outline-secondary" 
                onClick={handleCloseEditModal}
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
                    Saving...
                  </>
                ) : (
                  '💾 Save Changes'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Delete Assignment Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onHide={handleCloseDeleteModal}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <span className="gradient-text">🗑️ Delete Assignment</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <Alert.Heading>⚠️ Are you sure?</Alert.Heading>
            <p className="mb-0">
              This action cannot be undone. The assignment and all associated reminders will be permanently deleted.
            </p>
          </Alert>

          {deletingAssignment && (
            <div className="mb-3">
              <p className="mb-2"><strong>Assignment Details:</strong></p>
              <div className="p-3 bg-light rounded">
                <p className="mb-1"><strong>Title:</strong> {deletingAssignment.title}</p>
                <p className="mb-1"><strong>Module:</strong> {deletingAssignment.module_name || 'No module (standalone assignment)'}</p>
                <p className="mb-0"><strong>Due Date:</strong> {formatDate(deletingAssignment.due_date)}</p>
              </div>
            </div>
          )}

          <Alert variant="info" className="mb-0">
            <small>
              💡 <strong>Note:</strong> All reminders associated with this assignment will also be deleted automatically.
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-secondary" 
            onClick={handleCloseDeleteModal}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              '🗑️ Yes, Delete Assignment'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default Dashboard;
