import { Link } from 'react-router-dom';
import { roleConfig } from '../../config/roles';

function PortalChooser({ getApiBaseUrlLabel }) {
  return (
    <main className="layout-shell">
      <section className="hero-panel">
        <div className="hero-copy-wrap">
          <p className="eyebrow">Klinika Authentication</p>
          <h1>Three login portals, one backend authorization flow.</h1>
          <p className="support-copy">
            The frontend authenticates workers against your .NET JWT endpoint and splits access into role-specific entry points for administrators, doctors, and secretaries.
          </p>
        </div>

        <div className="status-card">
          <span className="status-label">API route</span>
          <strong>{getApiBaseUrlLabel()}</strong>
          <p>Self-sign-up is not enabled in the backend. Staff creation currently belongs to administrators only.</p>
        </div>
      </section>

      <section className="portal-grid">
        {Object.entries(roleConfig).map(([roleSlug, config]) => (
          <article className={`portal-card ${config.themeClass}`} key={roleSlug}>
            <p className="eyebrow">{config.eyebrow}</p>
            <h2>{config.label}</h2>
            <p>{config.description}</p>
            <ul className="task-list">
              {config.tasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
            <Link className="primary-link" to={config.loginPath}>
              Continue to {config.label} login
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

export default PortalChooser;