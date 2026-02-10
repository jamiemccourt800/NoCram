import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import api from '../services/api';
import '../styles/custom.css';

function Settings() {
  const navigate = useNavigate();
  
  // Profile state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    timezone: 'UTC',
    semester_start: '',
    semester_end: '',
  });
  const [originalEmail, setOriginalEmail] = useState('');
  
  // Password confirmation state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [pendingProfileUpdate, setPendingProfileUpdate] = useState(null);
  
  // Notification preferences state
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    push_enabled: false,
    in_app_enabled: true,
    default_reminder_days: '7,2,1',
  });
  
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [preferencesMessage, setPreferencesMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch user profile
    try {
      const userResponse = await api.get('/auth/me');
      if (userResponse.data.user) {
        const userData = userResponse.data.user;
        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          timezone: userData.timezone || 'UTC',
          semester_start: userData.semester_start || '',
          semester_end: userData.semester_end || '',
        });
        setOriginalEmail(userData.email);
      }
      
      // Fetch notification preferences (only if profile fetch succeeds)
      try {
        const prefsResponse = await api.get('/auth/notification-preferences');
        if (prefsResponse.data) {
          setPreferences(prev => ({ ...prev, ...prefsResponse.data }));
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
        // Preferences can fail gracefully - use defaults
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
      
      // If authentication fails, redirect to login
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        // For other errors, show error message
        setProfileMessage({ 
          type: 'danger', 
          text: 'Failed to load profile. Please try refreshing the page.' 
        });
      }
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });

    // Check if email has changed
    if (profile.email !== originalEmail) {
      // Show password confirmation modal
      setPendingProfileUpdate(profile);
      setShowPasswordModal(true);
      return;
    }

    // No email change, proceed with update
    await submitProfileUpdate(profile, null);
  };

  const submitProfileUpdate = async (profileData, password) => {
    setSavingProfile(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const updateData = { ...profileData };
      if (password) {
        updateData.currentPassword = password;
      }

      const response = await api.put('/auth/profile', updateData);
      
      if (response.data.user) {
        setProfile({
          name: response.data.user.name || '',
          email: response.data.user.email || '',
          timezone: response.data.user.timezone || 'UTC',
        });
        setOriginalEmail(response.data.user.email);
      }
      
      setProfileMessage({ type: 'success', text: response.data.message || 'Profile updated successfully!' });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setPendingProfileUpdate(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMsg = error.response?.data?.error || 'Failed to update profile';
      setProfileMessage({ type: 'danger', text: errorMsg });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordConfirm = async () => {
    if (!currentPassword) {
      setProfileMessage({ type: 'danger', text: 'Please enter your password' });
      return;
    }
    await submitProfileUpdate(pendingProfileUpdate, currentPassword);
  };

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setPendingProfileUpdate(null);
    setSavingProfile(false);
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setSavingPreferences(true);
    setPreferencesMessage({ type: '', text: '' });

    try {
      await api.put('/auth/notification-preferences', preferences);
      setPreferencesMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (error) {
      console.error('Error saving preferences:', error);
      setPreferencesMessage({ type: 'danger', text: 'Failed to save preferences' });
    } finally {
      setSavingPreferences(false);
    }
  };

  const handlePreferencesChange = (e) => {
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

  // Common timezone options
  const timezones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris, Berlin, Rome' },
    { value: 'Europe/Athens', label: 'Athens, Istanbul' },
    { value: 'Asia/Dubai', label: 'Dubai' },
    { value: 'Asia/Kolkata', label: 'Mumbai, Kolkata' },
    { value: 'Asia/Shanghai', label: 'Beijing, Shanghai' },
    { value: 'Asia/Tokyo', label: 'Tokyo, Osaka' },
    { value: 'Australia/Sydney', label: 'Sydney, Melbourne' },
    { value: 'Pacific/Auckland', label: 'Auckland, Wellington' },
  ];

  return (
    <div className="settings-container fade-in">
      {/* Header */}
      <div className="settings-card">
        <div className="settings-header">
          <h2 className="settings-title">⚙️ Settings</h2>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn-outline-custom"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Profile Information Section */}
      <div className="settings-card">
        <h3 className="mb-4" style={{fontWeight: 600}}>👤 Profile Information</h3>

        {profileMessage.text && (
          <div className={`alert alert-custom alert-${profileMessage.type} mb-4`} role="alert">
            {profileMessage.text}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setProfileMessage({ type: '', text: '' })}
            ></button>
          </div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="form-label-custom">
              <strong>📝 Name</strong>
            </label>
            <input
              type="text"
              className="form-control form-control-custom"
              id="name"
              name="name"
              value={profile.name}
              onChange={handleProfileChange}
              placeholder="Your name"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="form-label-custom">
              <strong>📧 Email</strong>
            </label>
            <input
              type="email"
              className="form-control form-control-custom"
              id="email"
              name="email"
              value={profile.email}
              onChange={handleProfileChange}
              placeholder="your.email@example.com"
              required
            />
            {profile.email !== originalEmail && (
              <div className="form-text text-warning">
                ⚠️ Changing your email will require password confirmation
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="timezone" className="form-label-custom">
              <strong>🌍 Timezone</strong>
            </label>
            <select
              className="form-select form-control-custom"
              id="timezone"
              name="timezone"
              value={profile.timezone}
              onChange={handleProfileChange}
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <div className="form-text">
              Your timezone affects how assignment due dates and times are displayed
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="semester_start" className="form-label-custom">
              <strong>📅 Semester Start Date</strong>
            </label>
            <input
              type="date"
              className="form-control form-control-custom"
              id="semester_start"
              name="semester_start"
              value={profile.semester_start}
              onChange={handleProfileChange}
            />
            <div className="form-text">
              Optional: Set your semester start date to filter assignments by term
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="semester_end" className="form-label-custom">
              <strong>📅 Semester End Date</strong>
            </label>
            <input
              type="date"
              className="form-control form-control-custom"
              id="semester_end"
              name="semester_end"
              value={profile.semester_end}
              onChange={handleProfileChange}
            />
            <div className="form-text">
              Optional: Set your semester end date to filter assignments by term
            </div>
          </div>

          <div className="d-grid gap-2">
            <button 
              type="submit" 
              className="btn btn-gradient-primary"
              disabled={savingProfile}
            >
              {savingProfile ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                '💾 Save Profile'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Notification Preferences Section */}
      <div className="settings-card">
        <h3 className="mb-4" style={{fontWeight: 600}}>🔔 Notification Preferences</h3>

        {preferencesMessage.text && (
          <div className={`alert alert-custom alert-${preferencesMessage.type} mb-4`} role="alert">
            {preferencesMessage.text}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setPreferencesMessage({ type: '', text: '' })}
            ></button>
          </div>
        )}

        <form onSubmit={handlePreferencesSubmit}>
          <h5 className="mb-3" style={{fontWeight: 600}}>📬 Notification Types</h5>
          
          <div className="mb-4">
            <div className="form-check form-switch form-switch-custom">
              <input
                className="form-check-input"
                type="checkbox"
                id="email_enabled"
                name="email_enabled"
                checked={preferences.email_enabled}
                onChange={handlePreferencesChange}
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
                onChange={handlePreferencesChange}
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
                onChange={handlePreferencesChange}
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
              onChange={handlePreferencesChange}
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
              disabled={savingPreferences}
            >
              {savingPreferences ? (
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

      {/* How Reminders Work */}
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

      {/* Password Confirmation Modal */}
      <Modal show={showPasswordModal} onHide={handlePasswordModalClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Email Change</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            To change your email address, please enter your current password for verification.
          </p>
          <div className="mb-3">
            <label htmlFor="currentPassword" className="form-label">
              <strong>Current Password</strong>
            </label>
            <input
              type="password"
              className="form-control"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
            />
          </div>
          {profileMessage.type === 'danger' && (
            <div className="alert alert-danger" role="alert">
              {profileMessage.text}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handlePasswordModalClose} disabled={savingProfile}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handlePasswordConfirm} disabled={savingProfile}>
            {savingProfile ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Confirming...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Settings;
