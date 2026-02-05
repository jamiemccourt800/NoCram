// client/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { dashboard } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusBadge = (status) => {
    const badges = {
      not_started: 'secondary',
      in_progress: 'warning',
      done: 'success',
    };
    const labels = {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      done: 'Done',
    };
    return <Badge bg={badges[status]}>{labels[status]}</Badge>;
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
      <Container className="text-center mt-5">
        <Spinner animation="border" />
        <p className="mt-3">Loading dashboard...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">{error}</Alert>
        <Button onClick={loadDashboard}>Retry</Button>
      </Container>
    );
  }

  return (
    <>
      <nav className="navbar navbar-light bg-light border-bottom">
        <Container>
          <span className="navbar-brand mb-0 h1">NoCram</span>
          <div>
            <span className="me-3">Welcome, {user?.name || user?.email}</span>
            <Button variant="outline-secondary" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </Container>
      </nav>

      <Container className="mt-4">
        <h2 className="mb-4">Dashboard</h2>

        <Row className="mb-4">
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3>{data.stats.not_started}</h3>
                <p className="text-muted mb-0">Not Started</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3>{data.stats.in_progress}</h3>
                <p className="text-muted mb-0">In Progress</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3>{data.workload.total_hours}h</h3>
                <p className="text-muted mb-0">This Week</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Upcoming (Next 7 Days)</h5>
              </Card.Header>
              <ListGroup variant="flush">
                {data.upcoming.length === 0 ? (
                  <ListGroup.Item className="text-muted">No upcoming deadlines</ListGroup.Item>
                ) : (
                  data.upcoming.map((assignment) => (
                    <ListGroup.Item key={assignment.id}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>{assignment.title}</strong>
                          <br />
                          <small className="text-muted">
                            {assignment.module_name} {assignment.module_code && `(${assignment.module_code})`}
                          </small>
                        </div>
                        <div className="text-end">
                          <div className="mb-1">{getStatusBadge(assignment.status)}</div>
                          <small>{formatDate(assignment.due_date)}</small>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))
                )}
              </ListGroup>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="mb-4">
              <Card.Header className="bg-danger text-white">
                <h5 className="mb-0">Overdue</h5>
              </Card.Header>
              <ListGroup variant="flush">
                {data.overdue.length === 0 ? (
                  <ListGroup.Item className="text-muted">No overdue assignments!</ListGroup.Item>
                ) : (
                  data.overdue.map((assignment) => (
                    <ListGroup.Item key={assignment.id}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>{assignment.title}</strong>
                          <br />
                          <small className="text-muted">
                            {assignment.module_name}
                          </small>
                        </div>
                        <div className="text-end">
                          <div className="mb-1">{getStatusBadge(assignment.status)}</div>
                          <small className="text-danger">{formatDate(assignment.due_date)}</small>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))
                )}
              </ListGroup>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default Dashboard;
