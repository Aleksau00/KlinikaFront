import { Link } from 'react-router-dom';
import { roleConfig } from '../../config/roles';

function PortalChooser({ getApiBaseUrlLabel }) {
  return (
    <main className="layout-shell">
      <section className="hero-panel">
        <div className="hero-copy-wrap">
          <p className="eyebrow">Klinika Staff Access</p>
          <h1>Choose your work area and sign in.</h1>
          <p className="support-copy">
            This page is for clinic staff. Select your role to open the tools you use every day.
          </p>
        </div>

        <div className="status-card">
          <span className="status-label">System connection</span>
          <strong>{getApiBaseUrlLabel()}</strong>
          <p>New staff accounts are created by clinic administration.</p>
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
              Sign In
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

export default PortalChooser;