import { roleConfig } from '../../config/roles';

function RoleOverview({ roleSlug, session }) {
  const config = roleConfig[roleSlug];

  const panelsByRole = {
    admin: {
      title: 'Administrator shell is live.',
      copy: 'The admin portal now exposes real shell modules for worker access and clinic visibility, in addition to the shared account panel.',
      highlights: ['Administrator-only routes stay isolated behind this portal', 'Live worker directory and worker provisioning are available', 'Clinic list is available inside the admin shell'],
    },
    doctor: {
      title: 'Doctor workspace entry is in place.',
      copy: 'This panel is ready to receive consultation, appointment, and patient-facing doctor workflows once you finish validating authentication.',
      highlights: ['Doctor-only login route is enforced', 'JWT role mismatch is blocked before portal entry', 'Account panel shows richer profile data from the backend'],
    },
    secretary: {
      title: 'Secretary workspace entry is in place.',
      copy: 'This panel is prepared for booking, reception, and patient intake flows after you validate login behavior end to end.',
      highlights: ['Secretary-only login route is enforced', 'JWT session survives reload through local storage', 'Account panel shows clinic assignment and session timing'],
    },
  };

  const content = panelsByRole[roleSlug];

  return (
    <div className="portal-stack">
      <article className={`workspace-panel ${config.themeClass}`}>
        <p className="eyebrow">Overview</p>
        <h2>{content.title}</h2>
        <p>{content.copy}</p>
      </article>

      <div className="workspace-grid compact-grid secretary-grid">
        <article className="workspace-panel profile-panel">
          <p className="eyebrow">Identity</p>
          <h2>Signed-in worker</h2>
          <dl className="profile-list">
            <div>
              <dt>Name</dt>
              <dd>{[session.worker?.firstName, session.worker?.lastName].filter(Boolean).join(' ') || 'Unknown worker'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{session.worker?.email || session.email}</dd>
            </div>
            <div>
              <dt>Clinic</dt>
              <dd>{session.worker?.clinicName || 'No clinic assigned'}</dd>
            </div>
          </dl>
        </article>

        <article className="workspace-panel secretary-card-wide">
          <p className="eyebrow">Current scope</p>
          <h2>{config.label} tasks</h2>
          <ul className="task-list">
            {config.tasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ul>
        </article>

        <article className="workspace-panel workspace-panel-dark">
          <p className="eyebrow">Validation</p>
          <h2>Auth checks completed.</h2>
          <ul className="task-list dark-list">
            {content.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}

export default RoleOverview;