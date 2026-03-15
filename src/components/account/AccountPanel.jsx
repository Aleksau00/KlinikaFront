import { useState } from 'react';
import { roleConfig } from '../../config/roles';

function formatDate(value) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(parsed);
}

function formatDateTime(value) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function getRoleSpecificSummary(worker) {
  if (!worker) return 'Unavailable';
  if (worker.role === 'Administrator') return worker.seniorityLevel || 'No seniority level set';
  if (worker.role === 'Doctor') return worker.specialty ? `${worker.specialty} • ${worker.licenseNumber || 'No license number'}` : 'No specialty set';
  if (worker.role === 'Secretary') return worker.qualification || 'No qualification set';
  return 'Unavailable';
}

function AccountPanel({ onRefreshSession, roleSlug, session }) {
  const config = roleConfig[roleSlug];
  const [statusMessage, setStatusMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setStatusMessage('');
    setIsRefreshing(true);

    try {
      await onRefreshSession();
      setStatusMessage('Account details refreshed from the backend.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to refresh account details.');
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="portal-stack">
      <article className={`workspace-panel ${config.themeClass}`}>
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">My account</p>
            <h2>Personal worker profile</h2>
          </div>
          <button className="ghost-button" disabled={isRefreshing} onClick={handleRefresh} type="button">
            {isRefreshing ? 'Refreshing...' : 'Refresh from backend'}
          </button>
        </div>
        <p>This panel now reflects the richer worker payload returned by the backend for the authenticated user.</p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}

      <div className="workspace-grid compact-grid secretary-grid">
        <article className="workspace-panel profile-panel">
          <p className="eyebrow">Profile</p>
          <h2>Worker details</h2>
          <dl className="profile-list">
            <div>
              <dt>First name</dt>
              <dd>{session.worker?.firstName || 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Last name</dt>
              <dd>{session.worker?.lastName || 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{session.worker?.email || session.email || 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{session.worker?.phoneNumber || 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Gender</dt>
              <dd>{session.worker?.gender || 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{formatDate(session.worker?.dateOfBirth)}</dd>
            </div>
          </dl>
        </article>

        <article className="workspace-panel secretary-card-regular">
          <p className="eyebrow">Role and assignment</p>
          <h2>Access context</h2>
          <dl className="profile-list">
            <div>
              <dt>Role</dt>
              <dd>{session.role}</dd>
            </div>
            <div>
              <dt>Worker ID</dt>
              <dd>{session.worker?.id || 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Clinic</dt>
              <dd>{session.worker?.clinicName || 'No clinic assigned'}</dd>
            </div>
            <div>
              <dt>Clinic ID</dt>
              <dd>{session.worker?.clinicId || 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Address ID</dt>
              <dd>{session.worker?.addressId || 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>{session.worker?.isActive ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </article>

        <article className="workspace-panel workspace-panel-dark">
          <p className="eyebrow">Session</p>
          <h2>Authentication details</h2>
          <dl className="profile-list light-profile-list">
            <div>
              <dt>Portal</dt>
              <dd>{config.label}</dd>
            </div>
            <div>
              <dt>Authenticated at</dt>
              <dd>{formatDateTime(session.authenticatedAt)}</dd>
            </div>
            <div>
              <dt>Token expires</dt>
              <dd>{formatDateTime(session.tokenPayload?.exp ? session.tokenPayload.exp * 1000 : null)}</dd>
            </div>
            <div>
              <dt>Created at</dt>
              <dd>{formatDateTime(session.worker?.createdAt)}</dd>
            </div>
            <div>
              <dt>Role-specific field</dt>
              <dd>{getRoleSpecificSummary(session.worker)}</dd>
            </div>
          </dl>
        </article>
      </div>
    </div>
  );
}

export default AccountPanel;