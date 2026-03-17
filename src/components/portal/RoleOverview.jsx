import { roleConfig } from '../../config/roles';

function RoleOverview({ roleSlug, session }) {
  const config = roleConfig[roleSlug];

  const panelsByRole = {
    admin: {
      title: 'Administration workspace',
      copy: 'From here you can manage staff accounts, review clinic information, and keep operations organized.',
      highlights: ['Only administrators can access these tools', 'Staff accounts can be created and updated here', 'Clinic details are available in one place'],
    },
    doctor: {
      title: 'Doctor workspace',
      copy: 'Use this area to review your schedule, open patient records, and complete visit notes.',
      highlights: ['Appointments show current and completed visits', 'Patient records include important medical context', 'Visit notes can be completed by appointment type'],
    },
    secretary: {
      title: 'Front-desk workspace',
      copy: 'Use this area to register patients, connect guardians for minors, and book appointments with available doctors.',
      highlights: ['Patients under 18 must have a linked guardian', 'Guardians can be searched or created during intake', 'Scheduling tools help fill available doctor slots'],
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
          <p className="eyebrow">What You Can Do Here</p>
          <h2>Role access summary</h2>
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