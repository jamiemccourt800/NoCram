import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Settings() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    days_before: 2,
    reminder_time: '09:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.notification_preferences) {
        setPreferences(response.data.notification_preferences);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setMessage({ type: 'danger', text: 'Failed to load preferences' });
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put('/auth/notification-preferences', preferences);
      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'danger', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Notification Settings</h2>
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="btn btn-outline-secondary"
                >
                  Back to Dashboard
                </button>
              </div>

              {message.text && (
                <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
                  {message.text}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setMessage({ type: '', text: '' })}
                  ></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="email_enabled"
                      name="email_enabled"
                      checked={preferences.email_enabled}
                      onChange={handleChange}
                    />
                    <label className="form-check-label" htmlFor="email_enabled">
                      <strong>Enable Email Reminders</strong>
                      <p className="text-muted mb-0 small">
                        Receive email notifications for upcoming assignment deadlines
                      </p>
                    </label>
                  </div>
                </div>

                {preferences.email_enabled && (
                  <>
                    <div className="mb-4">
                      <label htmlFor="days_before" className="form-label">
                        <strong>Remind me (days before deadline)</strong>
                      </label>
                      <select
                        className="form-select"
                        id="days_before"
                        name="days_before"
                        value={preferences.days_before}
                        onChange={handleChange}
                      >
                        <option value="1">1 day before</option>
                        <option value="2">2 days before</option>
                        <option value="3">3 days before</option>
                        <option value="5">5 days before</option>
                        <option value="7">1 week before</option>
                      </select>
                      <div className="form-text">
                        You'll receive reminders for assignments due within this timeframe
                      </div>
                    </div>

                    <div className="mb-4">
                      <label htmlFor="reminder_time" className="form-label">
                        <strong>Preferred reminder time</strong>
                      </label>
                      <input
                        type="time"
                        className="form-control"
                        id="reminder_time"
                        name="reminder_time"
                        value={preferences.reminder_time}
                        onChange={handleChange}
                      />
                      <div className="form-text">
                        Daily reminders will be sent around this time
                      </div>
                    </div>
                  </>
                )}

                <div className="d-grid gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Saving...
                      </>
                    ) : (
                      'Save Preferences'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="card shadow mt-4">
            <div className="card-body">
              <h5 className="card-title">How Reminders Work</h5>
              <ul className="mb-0">
                <li>Reminders are checked daily at 9:00 AM (server time)</li>
                <li>You'll receive one email per assignment within your reminder window</li>
                <li>Emails won't be sent more than once per day for the same assignment</li>
                <li>Completed assignments won't trigger reminders</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
