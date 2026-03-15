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
      title: 'Pediatric clinical workspace is active.',
      copy: 'Use this portal to manage your daily pediatric appointments, complete visit notes, and review patient allergen and vaccination context before consultations.',
      highlights: ['Appointment list shows active and completed visits', 'Patient context loads allergens, vaccinations, and prior appointments', 'Treatment and preventive note forms are available per visit type'],
    },
    secretary: {
      title: 'Pediatric front-desk workspace is active.',
      copy: 'Use this portal to register pediatric patients, link guardians for minors under 18, and book appointments across available doctor slots.',
      highlights: ['Minor patients require a guardian to be linked or created at intake', 'Guardian search filters to adults only', 'Patient list flags minors with missing guardian links'],
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