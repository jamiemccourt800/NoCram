import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/custom.css';

function Settings() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    email_enabled: true,
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
      const response = await api.get('/auth/me');
      // Try to fetch notification preferences
      try {
        const prefsResponse = await api.get('/auth/notification-preferences');
        if (prefsResponse.data) {
          setPreferences(prefsResponse.data);
        }
      } catch (err) {
        // If preferences don't exist yet, use defaults
        console.log('Using default preferences');
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
          <h2 className="settings-title">⚙️ Notification Settings</h2>
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
                <strong>📧 Enable Email Reminders</strong>
                <p className="text-muted mb-0 small mt-1">
                  Receive email notifications for upcoming assignment deadlines
                </p>
              </label>
            </div>
          </div>

          {preferences.email_enabled && (
            <>
              <div className="mb-4">
                <label htmlFor="default_reminder_days" className="form-label-custom">
                  <strong>🗓️ Reminder Days</strong>
                </label>
                <input
                  type="text"
                  className="form-control form-control-custom"
                  id="default_reminder_days"
                  name="default_reminder_days"
                  value={preferences.default_reminder_days}
                  onChange={handleChange}
                  placeholder="7,2,1"
                />
                <div className="form-text">
                  Comma-separated list of days before deadline to send reminders (e.g., "7,2,1" for 7 days, 2 days, and 1 day before)
                </div>
              </div>
            </>
          )}

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
          <li>Reminders are checked daily at 9:00 AM (server time)</li>
          <li>You'll receive one email per assignment within your reminder window</li>
          <li>Emails won't be sent more than once per day for the same assignment</li>
          <li>Completed assignments won't trigger reminders</li>
        </ul>
      </div>
    </div>
  );
}

export default Settings;
