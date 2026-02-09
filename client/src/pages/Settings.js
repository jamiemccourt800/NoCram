import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/custom.css';

function Settings() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    push_enabled: false,
    in_app_enabled: true,
    default_reminder_days: '7,2,1',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const prefsResponse = await api.get('/auth/notification-preferences');
      if (prefsResponse.data) {
        setPreferences(prefsResponse.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // If preferences don't exist yet, just use defaults (don't show error)
      if (error.response && error.response.status === 404) {
        console.log('Using default preferences - no preferences found');
      } else {
        // Only show error for non-404 errors
        setMessage({ type: 'danger', text: 'Failed to load preferences. Please try again.' });
      }
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
      <div className="loading-container">
        <div className="spinner-custom"></div>
        <p className="mt-4 text-muted">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-container fade-in">
      <div className="settings-card">
        <div className="settings-header">
          <h2 className="settings-title">🔔 Notification Preferences</h2>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn-outline-custom"
          >
            ← Back to Dashboard
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-custom alert-${message.type} mb-4`} role="alert">
            {message.text}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setMessage({ type: '', text: '' })}
            ></button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h5 className="mb-3" style={{fontWeight: 600}}>📬 Notification Types</h5>
          
          <div className="mb-4">
            <div className="form-check form-switch form-switch-custom">
              <input
                className="form-check-input"
                type="checkbox"
                id="email_enabled"
                name="email_enabled"
                checked={preferences.email_enabled}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="email_enabled">
                <strong>📧 Email Reminders</strong>
                <p className="text-muted mb-0 small mt-1">
                  Receive email notifications for upcoming assignment deadlines
                </p>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <div className="form-check form-switch form-switch-custom">
              <input
                className="form-check-input"
                type="checkbox"
                id="in_app_enabled"
                name="in_app_enabled"
                checked={preferences.in_app_enabled}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="in_app_enabled">
                <strong>🔔 In-App Notifications</strong>
                <p className="text-muted mb-0 small mt-1">
                  See notifications in the app when you log in
                </p>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <div className="form-check form-switch form-switch-custom">
              <input
                className="form-check-input"
                type="checkbox"
                id="push_enabled"
                name="push_enabled"
                checked={preferences.push_enabled}
                onChange={handleChange}
                disabled
              />
              <label className="form-check-label" htmlFor="push_enabled" style={{opacity: 0.6}}>
                <strong>📱 Push Notifications</strong>
                <span className="badge bg-secondary ms-2">Coming Soon</span>
                <p className="text-muted mb-0 small mt-1">
                  Receive push notifications on your mobile device (future feature)
                </p>
              </label>
            </div>
          </div>

          <hr className="my-4" />

          <h5 className="mb-3" style={{fontWeight: 600}}>⏰ Reminder Schedule</h5>

          <div className="mb-4">
            <label htmlFor="default_reminder_days" className="form-label-custom">
              <strong>🗓️ Days Before Deadline</strong>
            </label>
            <input
              type="text"
              className="form-control form-control-custom"
              id="default_reminder_days"
              name="default_reminder_days"
              value={preferences.default_reminder_days}
              onChange={handleChange}
              placeholder="7,2,1"
              disabled={!preferences.email_enabled && !preferences.in_app_enabled}
            />
            <div className="form-text">
              Comma-separated list of days before deadline to send reminders
              <br />
              <strong>Examples:</strong> "7,2,1" (7 days, 2 days, 1 day before) or "14,7,3,1"
            </div>
          </div>

          <div className="d-grid gap-2 mt-4">
            <button 
              type="submit" 
              className="btn btn-gradient-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                '💾 Save Preferences'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="settings-card">
        <h5 className="mb-3" style={{fontWeight: 600}}>💡 How Reminders Work</h5>
        <ul className="mb-0" style={{lineHeight: '1.8'}}>
          <li><strong>Email Reminders:</strong> Checked daily at 9:00 AM (server time) and sent to your email</li>
          <li><strong>In-App Notifications:</strong> Displayed in the app dashboard for upcoming assignments</li>
          <li><strong>Push Notifications:</strong> Will notify you on mobile devices (coming soon)</li>
          <li>You'll receive notifications based on your reminder schedule (e.g., 7, 2, 1 days before)</li>
          <li>Reminders won't be sent more than once per day for the same assignment</li>
          <li>Completed assignments won't trigger reminders</li>
        </ul>
      </div>
    </div>
  );
}

export default Settings;
