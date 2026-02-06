// client/src/pages/Assignments.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, Form, InputGroup } from 'react-bootstrap';
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

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [assignments, searchQuery, filterModule, filterStatus, filterDateFrom, filterDateTo]);

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

    setFilteredAssignments(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterModule('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = () => {
    return searchQuery || filterModule || filterStatus || filterDateFrom || filterDateTo;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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

              <Col md={2}>
                <Form.Label className="form-label-custom small">From Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="form-control-custom"
                  size="sm"
                />
              </Col>

              <Col md={2}>
                <Form.Label className="form-label-custom small">To Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
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
                    className={`assignment-card ${overdue ? 'border-danger' : ''}`}
                    style={{
                      animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
                      borderLeft: overdue ? '4px solid #ef4444' : assignment.module_color ? `4px solid ${assignment.module_color}` : '4px solid transparent'
                    }}
                  >
                    <Card.Body>
                      <Row className="align-items-start">
                        {/* Left: Title and Module */}
                        <Col md={6}>
                          <div className="d-flex align-items-start gap-2 mb-2">
                            {assignment.module_color && !overdue && (
                              <span 
                                className="module-dot mt-1"
                                style={{ backgroundColor: assignment.module_color }}
                              />
                            )}
                            <div className="flex-grow-1">
                              <h5 className="mb-1">{assignment.title}</h5>
                              {assignment.module_name && (
                                <div className="text-muted small mb-2">
                                  📚 {assignment.module_icon} {assignment.module_name}
                                  {assignment.module_code && ` (${assignment.module_code})`}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {assignment.description && (
                            <p className="text-muted small mb-2">
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

                        {/* Right: Status */}
                        <Col md={3} className="text-end">
                          <div className="mb-3">
                            {getStatusBadge(assignment.status, assignment.due_date)}
                          </div>
                          {assignment.status === 'done' && assignment.completed_at && (
                            <small className="text-success d-block">
                              ✓ Completed {new Date(assignment.completed_at).toLocaleDateString()}
                            </small>
                          )}
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
    </>
  );
}

export default Assignments;
