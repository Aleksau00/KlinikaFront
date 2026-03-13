import { Link } from 'react-router-dom';

function AdminDeskPanel({ session }) {
  const cards = [
    {
      title: 'Staff module',
      copy: 'Browse the worker directory and create new worker accounts from the admin shell.',
      link: '/portal/admin/staff',
      cta: 'Open staff module',
    },
    {
      title: 'Clinics module',
      copy: 'Review current clinics and their public directory data inside the administrator portal.',
      link: '/portal/admin/clinics',
      cta: 'Open clinics module',
    },
    {
      title: 'Account module',
      copy: 'Review your own worker identity, clinic assignment, and token timing information.',
      link: '/portal/admin/account',
      cta: 'Open my account',
    },
  ];

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-admin">
        <p className="eyebrow">Admin desk</p>
        <h2>Administrative shell</h2>
        <p>
          The administrator portal now has live modules connected to backend data, while still keeping the scope centered on account management and access-control setup.
        </p>
      </article>

      <div className="workspace-grid compact-grid secretary-grid">
        {cards.map((card) => (
          <article className="workspace-panel" key={card.title}>
            <p className="eyebrow">Module</p>
            <h2>{card.title}</h2>
            <p>{card.copy}</p>
            <Link className="primary-link inline-action" to={card.link}>
              {card.cta}
            </Link>
          </article>
        ))}
      </div>

      <article className="workspace-panel workspace-panel-dark">
        <p className="eyebrow">Current admin</p>
        <h2>{[session.worker?.firstName, session.worker?.lastName].filter(Boolean).join(' ') || session.email}</h2>
        <p>
          Your administrator token is active, and the admin shell can now be expanded into more detailed operations without reworking the authentication layer again.
        </p>
      </article>
    </div>
  );
}

export default AdminDeskPanel;