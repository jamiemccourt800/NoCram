// client/src/pages/Assignments.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, Form, InputGroup, Modal, Dropdown, ButtonGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { assignments as assignmentsApi, modules as modulesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/custom.css';

function Assignments() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showCompleted, setShowCompleted] = useState(true); // Show completed by default
  const [quickDateFilter, setQuickDateFilter] = useState(''); // Track active quick filter

  // Sort state with localStorage persistence
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem('assignmentsSortBy') || 'due_date';
  });
  const [sortOrder, setSortOrder] = useState(() => {
    return localStorage.getItem('assignmentsSortOrder') || 'asc';
  });

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
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
  const [validationErrors, setValidationErrors] = useState({});

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [assignments, searchQuery, filterModule, filterStatus, filterDateFrom, filterDateTo, showCompleted, sortBy, sortOrder]);

  // Persist sort preferences to localStorage
  useEffect(() => {
    localStorage.setItem('assignmentsSortBy', sortBy);
    localStorage.setItem('assignmentsSortOrder', sortOrder);
  }, [sortBy, sortOrder]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch assignments
      const assignmentsRes = await assignmentsApi.getAll();
      const assignmentsData = assignmentsRes.data.assignments || [];
      
      // Sort by due date (soonest first)
      const sorted = assignmentsData.sort((a, b) => 
        new Date(a.due_date) - new Date(b.due_date)
      );
      
      setAssignments(sorted);

      // Fetch modules for filter dropdown
      const modulesRes = await modulesApi.getAll();
      setModules(modulesRes.data.modules || []);

    } catch (err) {
      console.error('Error loading assignments:', err);
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
      } else {
        setError('Failed to load assignments. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...assignments];

    // Search by title
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(assignment =>
        assignment.title.toLowerCase().includes(query) ||
        assignment.description?.toLowerCase().includes(query)
      );
    }

    // Filter by module
    if (filterModule) {
      filtered = filtered.filter(assignment => 
        assignment.module_id?.toString() === filterModule
      );
    }

    // Filter by status
    if (filterStatus) {
      filtered = filtered.filter(assignment => {
        if (filterStatus === 'overdue') {
          return new Date(assignment.due_date) < new Date() && assignment.status !== 'done';
        }
        return assignment.status === filterStatus;
      });
    }

    // Filter by date range
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter(assignment => 
        new Date(assignment.due_date) >= fromDate
      );
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(assignment => 
        new Date(assignment.due_date) <= toDate
      );
    }

    // Hide completed assignments if showCompleted is false
    if (!showCompleted) {
      filtered = filtered.filter(assignment => assignment.status !== 'done');
    }

    // Apply sorting
    filtered = applySorting(filtered);

    setFilteredAssignments(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterModule('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setQuickDateFilter('');
  };

  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const applyQuickDateFilter = (filterType) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (filterType) {
      case 'today':
        const todayStr = formatLocalDate(today);
        setFilterDateFrom(todayStr);
        setFilterDateTo(todayStr);
        setQuickDateFilter('today');
        break;
        
      case 'week':
        // Start of week (Monday)
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        
        // End of week (Sunday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        setFilterDateFrom(formatLocalDate(startOfWeek));
        setFilterDateTo(formatLocalDate(endOfWeek));
        setQuickDateFilter('week');
        break;
        
      case 'month':
        // Start of month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // End of month
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        setFilterDateFrom(formatLocalDate(startOfMonth));
        setFilterDateTo(formatLocalDate(endOfMonth));
        setQuickDateFilter('month');
        break;
        
      case 'custom':
        setQuickDateFilter('custom');
        break;
        
      default:
        setFilterDateFrom('');
        setFilterDateTo('');
        setQuickDateFilter('');
    }
  };

  const handleManualDateChange = (field, value) => {
    if (field === 'from') {
      setFilterDateFrom(value);
    } else {
      setFilterDateTo(value);
    }
    // Switch to custom when user manually changes dates
    if (value && quickDateFilter !== 'custom') {
      setQuickDateFilter('custom');
    }
  };

  const hasActiveFilters = () => {
    return searchQuery || filterModule || filterStatus || filterDateFrom || filterDateTo;
  };

  const applySorting = (list) => {
    const sorted = [...list];
    
    sorted.sort((a, b) => {
      let compareA, compareB;
      
      switch (sortBy) {
        case 'due_date':
          compareA = new Date(a.due_date).getTime();
          compareB = new Date(b.due_date).getTime();
          // Guard against invalid dates - sort them to the end
          if (!Number.isFinite(compareA)) compareA = Infinity;
          if (!Number.isFinite(compareB)) compareB = Infinity;
          break;
          
        case 'title':
          compareA = a.title.toLowerCase();
          compareB = b.title.toLowerCase();
          break;
          
        case 'module':
          compareA = a.module_name?.toLowerCase() || 'zzz'; // Put unassigned at end
          compareB = b.module_name?.toLowerCase() || 'zzz';
          break;
          
        case 'weighting':
          compareA = parseFloat(a.weighting_percent) || 0;
          compareB = parseFloat(b.weighting_percent) || 0;
          break;
          
        case 'estimated_hours':
          compareA = parseFloat(a.estimated_hours) || 0;
          compareB = parseFloat(b.estimated_hours) || 0;
          break;
          
        case 'status':
          // Custom order: not_started, in_progress, done
          const statusOrder = { 'not_started': 0, 'in_progress': 1, 'done': 2 };
          compareA = statusOrder[a.status] ?? 3;
          compareB = statusOrder[b.status] ?? 3;
          break;
          
        default:
          compareA = new Date(a.due_date).getTime();
          compareB = new Date(b.due_date).getTime();
      }
      
      // Compare and apply sort order
      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if clicking same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const getSortLabel = (field) => {
    const labels = {
      'due_date': 'Due Date',
      'title': 'Title',
      'module': 'Module',
      'weighting': 'Weighting',
      'estimated_hours': 'Estimated Hours',
      'status': 'Status'
    };
    return labels[field] || field;
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
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateEditForm = () => {
    const errors = {};

    // Title validation
    if (!editFormData.title || editFormData.title.trim().length === 0) {
      errors.title = 'Title is required';
    } else if (editFormData.title.length > 500) {
      errors.title = 'Title must be 500 characters or less';
    }

    // Due date validation
    if (!editFormData.due_date) {
      errors.due_date = 'Due date is required';
    }

    // Weighting validation
    if (editFormData.weighting_percent !== '') {
      const weighting = parseFloat(editFormData.weighting_percent);
      if (isNaN(weighting) || weighting < 0 || weighting > 100) {
        errors.weighting_percent = 'Weighting must be between 0 and 100';
      }
    }

    // Estimated hours validation
    if (editFormData.estimated_hours !== '') {
      const hours = parseFloat(editFormData.estimated_hours);
      if (isNaN(hours) || hours < 0) {
        errors.estimated_hours = 'Estimated hours must be a positive number';
      }
    }

    // Description validation
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

      // Combine date and time into ISO format
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

      await assignmentsApi.update(editingAssignment.id, payload);

      // Show success message
      setSuccessMessage('✅ Assignment updated successfully! Reminders have been updated if due date changed.');
      
      // Reload data
      await loadData();

      // Close modal after short delay
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
        setFormError('Unable to update assignment. Please check your internet connection and try again.');
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
    if (deleting) return;

    try {
      setDeleting(true);

      await assignmentsApi.delete(deletingAssignment.id);

      setSuccessMessage(`✅ "${deletingAssignment.title}" deleted successfully. Associated reminders were also removed.`);
      
      // Reload data
      await loadData();

      // Close modal and clear success message after delay
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
        await loadData();
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
      await assignmentsApi.updateStatus(assignment.id, newStatus);
      
      // Show success message
      const statusLabels = {
        not_started: 'Not Started',
        in_progress: 'In Progress',
        done: 'Done'
      };
      setSuccessMessage(`✅ "${assignment.title}" status updated to "${statusLabels[newStatus]}"!`);
      
      // Reload data to update the list
      await loadData();
      
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
        await loadData();
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
      await assignmentsApi.updateStatus(assignment.id, newStatus);
      
      // Show success message
      if (newStatus === 'done') {
        setSuccessMessage(`✅ "${assignment.title}" marked as complete!`);
      } else {
        setSuccessMessage(`↩️ "${assignment.title}" marked as incomplete.`);
      }
      
      // Reload data to update the list
      await loadData();
      
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
        await loadData();
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

  const isOverdue = (dueDate, status) => {
    return new Date(dueDate) < new Date() && status !== 'done';
  };

  const formatDueDate = (dueDate) => {
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const assignmentDate = new Date(date);
    assignmentDate.setHours(0, 0, 0, 0);

    if (assignmentDate.getTime() === today.getTime()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (assignmentDate.getTime() === tomorrow.getTime()) {
      return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (assignmentDate < today) {
      const daysOverdue = Math.floor((today - assignmentDate) / (1000 * 60 * 60 * 24));
      return `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;
    } else {
      const daysUntil = Math.floor((assignmentDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 7) {
        return `In ${daysUntil} day${daysUntil > 1 ? 's' : ''} (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      }
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  const getStatusBadge = (status, dueDate) => {
    if (isOverdue(dueDate, status)) {
      return <span className="badge badge-gradient-red">🔥 Overdue</span>;
    }

    const badges = {
      not_started: <span className="badge badge-gradient-blue">Not Started</span>,
      in_progress: <span className="badge badge-gradient-purple">In Progress</span>,
      done: <span className="badge badge-gradient-green">✓ Done</span>
    };
    return badges[status] || badges.not_started;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-custom mb-3"></div>
          <p className="text-muted">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Navbar */}
      <nav className="navbar custom-navbar">
        <Container>
          <h1 className="navbar-brand-custom" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            NoCram
          </h1>
          <div className="d-flex align-items-center gap-3">
            <Button 
              variant="link"
              className="text-decoration-none"
              onClick={() => navigate('/dashboard')}
            >
              🏠 Dashboard
            </Button>
            <Button 
              variant="link"
              className="text-decoration-none text-primary fw-bold"
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
            <span className="text-muted d-none d-md-inline">{user?.name || user?.email}</span>
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
        {error && (
          <Alert variant="danger" className="alert-custom mb-4">
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" className="alert-custom fade-in mb-4">
            {successMessage}
          </Alert>
        )}

        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="dashboard-title">All Assignments</h2>
            <p className="dashboard-subtitle">
              {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
              {hasActiveFilters() && ' (filtered)'}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-sm mb-4">
          <Card.Body>
            <Row className="g-3">
              {/* Search */}
              <Col md={12}>
                <InputGroup>
                  <InputGroup.Text>🔍</InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search assignments by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-control-custom"
                  />
                  {searchQuery && (
                    <Button 
                      variant="outline-secondary"
                      onClick={() => setSearchQuery('')}
                    >
                      ✕
                    </Button>
                  )}
                </InputGroup>
              </Col>

              {/* Filters Row */}
              <Col md={3}>
                <Form.Label className="form-label-custom small">Module</Form.Label>
                <Form.Select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="form-control-custom"
                  size="sm"
                >
                  <option value="">All Modules</option>
                  {modules.map(module => (
                    <option key={module.id} value={module.id}>
                      {module.icon} {module.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={3}>
                <Form.Label className="form-label-custom small">Status</Form.Label>
                <Form.Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="form-control-custom"
                  size="sm"
                >
                  <option value="">All Statuses</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="overdue">Overdue</option>
                </Form.Select>
              </Col>
            </Row>

            {/* Quick Date Filters */}
            <Row className="mt-3">
              <Col md={12}>
                <Form.Label className="form-label-custom small">Quick Date Filters</Form.Label>
                <ButtonGroup size="sm" className="d-flex flex-wrap gap-2">
                  <Button 
                    variant={quickDateFilter === 'today' ? 'primary' : 'outline-primary'}
                    onClick={() => applyQuickDateFilter('today')}
                    style={{ flex: '1 1 auto' }}
                  >
                    📅 Today
                  </Button>
                  <Button 
                    variant={quickDateFilter === 'week' ? 'primary' : 'outline-primary'}
                    onClick={() => applyQuickDateFilter('week')}
                    style={{ flex: '1 1 auto' }}
                  >
                    📆 This Week
                  </Button>
                  <Button 
                    variant={quickDateFilter === 'month' ? 'primary' : 'outline-primary'}
                    onClick={() => applyQuickDateFilter('month')}
                    style={{ flex: '1 1 auto' }}
                  >
                    🗓️ This Month
                  </Button>
                  <Button 
                    variant={quickDateFilter === 'custom' ? 'primary' : 'outline-primary'}
                    onClick={() => applyQuickDateFilter('custom')}
                    style={{ flex: '1 1 auto' }}
                  >
                    ✏️ Custom Range
                  </Button>
                  {quickDateFilter && (
                    <Button 
                      variant="outline-secondary"
                      onClick={() => applyQuickDateFilter('')}
                      style={{ flex: '1 1 auto' }}
                    >
                      ✕ Clear Date Filter
                    </Button>
                  )}
                </ButtonGroup>
              </Col>
            </Row>

            {/* Date Range Inputs */}
            <Row className="mt-3">
              <Col md={2}>
                <Form.Label className="form-label-custom small">From Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => handleManualDateChange('from', e.target.value)}
                  className="form-control-custom"
                  size="sm"
                />
              </Col>

              <Col md={2}>
                <Form.Label className="form-label-custom small">To Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => handleManualDateChange('to', e.target.value)}
                  className="form-control-custom"
                  size="sm"
                />
              </Col>

              <Col md={2} className="d-flex align-items-end">
                {hasActiveFilters() && (
                  <Button 
                    variant="outline-secondary"
                    size="sm"
                    onClick={clearFilters}
                    className="w-100"
                  >
                    Clear Filters
                  </Button>
                )}
              </Col>
            </Row>

            {/* Show Completed Toggle */}
            <Row className="mt-3">
              <Col>
                <Form.Check
                  type="checkbox"
                  id="show-completed"
                  label="Show completed assignments"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="text-muted"
                />
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Sort Controls */}
        <Card className="shadow-sm">
          <Card.Body>
            <Row className="align-items-center">
              <Col xs="auto">
                <strong className="text-muted">Sort by:</strong>
              </Col>
              <Col xs="auto">
                <Dropdown as={ButtonGroup}>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => handleSortChange(sortBy)}
                  >
                    {getSortLabel(sortBy)} {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                  <Dropdown.Toggle 
                    split 
                    variant="outline-primary" 
                    size="sm"
                    id="sort-dropdown"
                  />
                  <Dropdown.Menu>
                    <Dropdown.Item 
                      onClick={() => handleSortChange('due_date')}
                      active={sortBy === 'due_date'}
                    >
                      📅 Due Date {sortBy === 'due_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Dropdown.Item>
                    <Dropdown.Item 
                      onClick={() => handleSortChange('title')}
                      active={sortBy === 'title'}
                    >
                      📝 Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Dropdown.Item>
                    <Dropdown.Item 
                      onClick={() => handleSortChange('module')}
                      active={sortBy === 'module'}
                    >
                      📚 Module {sortBy === 'module' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Dropdown.Item>
                    <Dropdown.Item 
                      onClick={() => handleSortChange('weighting')}
                      active={sortBy === 'weighting'}
                    >
                      ⚖️ Weighting {sortBy === 'weighting' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Dropdown.Item>
                    <Dropdown.Item 
                      onClick={() => handleSortChange('estimated_hours')}
                      active={sortBy === 'estimated_hours'}
                    >
                      ⏱️ Estimated Hours {sortBy === 'estimated_hours' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Dropdown.Item>
                    <Dropdown.Item 
                      onClick={() => handleSortChange('status')}
                      active={sortBy === 'status'}
                    >
                      📊 Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
              <Col xs="auto">
                <span className="text-muted small">
                  {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
                </span>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Assignments List */}
        {filteredAssignments.length === 0 ? (
          <Card className="shadow-sm">
            <Card.Body className="text-center py-5">
              <div className="mb-3" style={{ fontSize: '4rem' }}>
                {hasActiveFilters() ? '🔍' : '📭'}
              </div>
              <h5 className="text-muted mb-2">
                {hasActiveFilters() 
                  ? 'No assignments match your filters' 
                  : 'No assignments yet'}
              </h5>
              <p className="text-muted mb-3">
                {hasActiveFilters() 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Create your first assignment to get started!'}
              </p>
              {hasActiveFilters() && (
                <Button 
                  variant="outline-primary"
                  onClick={clearFilters}
                >
                  Clear All Filters
                </Button>
              )}
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-3">
            {filteredAssignments.map((assignment, index) => {
              const overdue = isOverdue(assignment.due_date, assignment.status);
              
              return (
                <Col key={assignment.id} xs={12}>
                  <Card 
                    className={`assignment-card ${overdue ? 'border-danger' : ''} ${assignment.status === 'done' ? 'completed' : ''}`}
                    style={{
                      animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
                      borderLeft: overdue ? '4px solid #ef4444' : assignment.module_color ? `4px solid ${assignment.module_color}` : '4px solid transparent',
                      opacity: assignment.status === 'done' ? 0.7 : 1
                    }}
                  >
                    <Card.Body>
                      <Row className="align-items-start">
                        {/* Left: Checkbox, Title and Module */}
                        <Col md={6}>
                          <div className="d-flex align-items-start gap-3 mb-2">
                            <div className="mt-1">
                              <Form.Check
                                type="checkbox"
                                checked={assignment.status === 'done'}
                                onChange={(e) => handleToggleComplete(assignment, e)}
                                className="completion-checkbox"
                                title={assignment.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
                              />
                            </div>
                            <div className="d-flex align-items-start gap-2 flex-grow-1">
                              {assignment.module_color && !overdue && (
                                <span 
                                  className="module-dot mt-1"
                                  style={{ backgroundColor: assignment.module_color }}
                                />
                              )}
                              <div className="flex-grow-1">
                                <h5 className={`mb-1 ${assignment.status === 'done' ? 'text-decoration-line-through text-muted' : ''}`}>
                                  {assignment.status === 'done' && '✓ '}{assignment.title}
                                </h5>
                                {assignment.module_name && (
                                  <div className="text-muted small mb-2">
                                    📚 {assignment.module_icon} {assignment.module_name}
                                    {assignment.module_code && ` (${assignment.module_code})`}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {assignment.description && (
                            <p className={`text-muted small mb-2 ${assignment.status === 'done' ? 'opacity-50' : ''}`}>
                              {assignment.description.substring(0, 150)}
                              {assignment.description.length > 150 ? '...' : ''}
                            </p>
                          )}
                        </Col>

                        {/* Middle: Metadata */}
                        <Col md={3}>
                          <div className="assignment-meta-vertical">
                            <div className="mb-2">
                              <small className="text-muted d-block">Due Date</small>
                              <span className={overdue ? 'text-danger fw-bold' : ''}>
                                📅 {formatDueDate(assignment.due_date)}
                              </span>
                            </div>
                            
                            {assignment.weighting_percent && (
                              <div className="mb-2">
                                <small className="text-muted d-block">Weighting</small>
                                <span>⚖️ {assignment.weighting_percent}%</span>
                              </div>
                            )}
                            
                            {assignment.estimated_hours && (
                              <div className="mb-2">
                                <small className="text-muted d-block">Estimated Time</small>
                                <span>⏱️ {assignment.estimated_hours}h</span>
                              </div>
                            )}
                          </div>
                        </Col>

                        {/* Right: Status and Actions */}
                        <Col md={3} className="text-end">
                          <Dropdown as={ButtonGroup} className="mb-3">
                            <div className="d-flex align-items-center">
                              {getStatusBadge(assignment.status, assignment.due_date)}
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
                          {assignment.status === 'done' && assignment.completed_at && (
                            <small className="text-success d-block mb-2">
                              ✓ Completed {new Date(assignment.completed_at).toLocaleDateString()}
                            </small>
                          )}
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
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        {/* Summary Stats */}
        {filteredAssignments.length > 0 && (
          <Card className="shadow-sm mt-4 bg-light">
            <Card.Body>
              <Row className="text-center">
                <Col md={3}>
                  <div className="stat-label">Total Assignments</div>
                  <div className="stat-value-small">{filteredAssignments.length}</div>
                </Col>
                <Col md={3}>
                  <div className="stat-label">Not Started</div>
                  <div className="stat-value-small">
                    {filteredAssignments.filter(a => a.status === 'not_started').length}
                  </div>
                </Col>
                <Col md={3}>
                  <div className="stat-label">In Progress</div>
                  <div className="stat-value-small">
                    {filteredAssignments.filter(a => a.status === 'in_progress').length}
                  </div>
                </Col>
                <Col md={3}>
                  <div className="stat-label">Completed</div>
                  <div className="stat-value-small text-success">
                    {filteredAssignments.filter(a => a.status === 'done').length}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
      </Container>

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

          {successMessage && (
            <Alert variant="success" className="alert-custom mb-3">
              {successMessage}
            </Alert>
          )}

          <Form onSubmit={handleEditSubmit}>
            {/* Title */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">
                Title <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={editFormData.title}
                onChange={handleEditInputChange}
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
                {editFormData.title.length}/500 characters
              </Form.Text>
            </Form.Group>

            {/* Module */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">Module</Form.Label>
              <Form.Select
                name="module_id"
                value={editFormData.module_id}
                onChange={handleEditInputChange}
                className="form-control-custom"
              >
                <option value="">No module (standalone assignment)</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>
                    {module.icon} {module.name} {module.code && `(${module.code})`}
                  </option>
                ))}
              </Form.Select>
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

            {/* Weighting and Estimated Hours Row */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label-custom">Weighting %</Form.Label>
                  <Form.Control
                    type="number"
                    name="weighting_percent"
                    value={editFormData.weighting_percent}
                    onChange={handleEditInputChange}
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
                    placeholder="e.g., 5.5"
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

            {/* Status */}
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

            {/* Description */}
            <Form.Group className="mb-4">
              <Form.Label className="form-label-custom">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="description"
                value={editFormData.description}
                onChange={handleEditInputChange}
                placeholder="Add any notes, requirements, or details about this assignment..."
                maxLength={2000}
                isInvalid={!!validationErrors.description}
                className="form-control-custom"
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.description}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                {editFormData.description.length}/2000 characters
              </Form.Text>
            </Form.Group>

            {/* Info Box */}
            <Alert variant="info" className="mb-4 border-0" style={{backgroundColor: '#e0f2fe'}}>
              <div className="d-flex align-items-start gap-2">
                <span>💡</span>
                <small>
                  <strong>Automatic Reminder Updates:</strong> If you change the due date, 
                  your email reminders will be automatically updated to 7 days, 2 days, 
                  and 1 day before the new due date.
                </small>
              </div>
            </Alert>

            {/* Action Buttons */}
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

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onHide={() => { if (!deleting) handleCloseDeleteModal(); }}
        backdrop={deleting ? "static" : true}
        keyboard={!deleting}
        centered
      >
        <Modal.Header closeButton={!deleting} className="border-0">
          <Modal.Title>
            <span className="text-danger">🗑️ Delete Assignment</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Alert variant="warning" className="mb-3">
            <div className="d-flex align-items-start gap-2">
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div>
                <strong>Are you sure you want to delete this assignment?</strong>
                <p className="mb-0 mt-2">This action cannot be undone.</p>
              </div>
            </div>
          </Alert>

          {deletingAssignment && (
            <div className="mb-3">
              <h6 className="mb-2">Assignment Details:</h6>
              <div className="p-3 bg-light rounded">
                <div className="mb-2">
                  <strong>Title:</strong> {deletingAssignment.title}
                </div>
                {deletingAssignment.module_name && (
                  <div className="mb-2">
                    <strong>Module:</strong> {deletingAssignment.module_icon} {deletingAssignment.module_name}
                  </div>
                )}
                <div>
                  <strong>Due Date:</strong> {new Date(deletingAssignment.due_date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          )}

          <Alert variant="info" className="mb-0 border-0" style={{backgroundColor: '#e0f2fe'}}>
            <small>
              💡 <strong>Note:</strong> All associated email reminders will also be deleted.
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer className="border-0">
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

export default Assignments;
