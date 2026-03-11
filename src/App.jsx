import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  createWorker,
  fetchClinics,
  fetchCurrentWorker,
  fetchWorkers,
  getApiBaseUrlLabel,
  loginWorker,
  setWorkerActive,
  updateWorker,
} from './lib/api';

const SESSION_STORAGE_KEY = 'klinika-front-session';

const roleConfig = {
  admin: {
    label: 'Administrator',
    themeClass: 'theme-admin',
    eyebrow: 'Administrative Portal',
    title: 'Control the clinic workspace.',
    description: 'Authenticate as an administrator to manage staff access and clinic-wide operations.',
    helper: 'Only administrators can create staff accounts in the current backend.',
    loginPath: '/login/admin',
    portalPath: '/portal/admin',
    sampleEmail: 'admin@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['Create and assign staff accounts', 'Review clinic-level operational data', 'Access administrator-only endpoints'],
    sections: ['overview', 'account', 'admin-desk', 'staff', 'clinics'],
  },
  doctor: {
    label: 'Doctor',
    themeClass: 'theme-doctor',
    eyebrow: 'Doctor Portal',
    title: 'Enter the clinical workspace.',
    description: 'Authenticate as a doctor to continue into the consultation and appointment area.',
    helper: 'Doctor accounts are created by an administrator and authenticated through the shared worker login endpoint.',
    loginPath: '/login/doctor',
    portalPath: '/portal/doctor',
    sampleEmail: 'dr.nikolic@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['View assigned appointments', 'Open doctor-only clinical workflows', 'Access protected medical endpoints'],
    sections: ['overview', 'account'],
  },
  secretary: {
    label: 'Secretary',
    themeClass: 'theme-secretary',
    eyebrow: 'Secretary Portal',
    title: 'Open the front-desk workspace.',
    description: 'Authenticate as a secretary to continue into booking, intake, and front office workflows.',
    helper: 'Secretary accounts also use the worker JWT flow and are provisioned by administrators.',
    loginPath: '/login/secretary',
    portalPath: '/portal/secretary',
    sampleEmail: 'jovana.simic@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['Handle booking and check-in flows', 'Use secretary-authorized scheduling endpoints', 'Manage front-office patient intake'],
    sections: ['overview', 'account'],
  },
};

const roleSlugByApiRole = {
  Administrator: 'admin',
  Doctor: 'doctor',
  Secretary: 'secretary',
};

const workerRoleOptions = ['Administrator', 'Doctor', 'Secretary'];

const initialWorkerForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  gender: 'F',
  dateOfBirth: '1990-01-01',
  jmbg: '',
  temporaryPassword: 'Admin123!',
  role: 'Secretary',
  clinicId: '',
  seniorityLevel: '',
  specialty: '',
  licenseNumber: '',
  qualification: '',
};

function readStoredSession() {
  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.');

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = window.atob(padded);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function createSession(loginResponse, worker) {
  const roleSlug = roleSlugByApiRole[loginResponse.role] || roleSlugByApiRole[worker?.role];

  return {
    token: loginResponse.token,
    email: loginResponse.email,
    role: loginResponse.role,
    roleSlug,
    worker,
    tokenPayload: decodeJwtPayload(loginResponse.token),
    authenticatedAt: new Date().toISOString(),
  };
}

function App() {
  return (
    <BrowserRouter>
      <AuthApplication />
    </BrowserRouter>
  );
}

function AuthApplication() {
  const [session, setSession] = useState(() => readStoredSession());
  const [isRestoringSession, setIsRestoringSession] = useState(() => Boolean(readStoredSession()?.token));

  useEffect(() => {
    if (!session?.token) {
      setIsRestoringSession(false);
      return;
    }

    let ignore = false;

    async function restoreSession() {
      try {
        const worker = await fetchCurrentWorker(session.token);
        const roleSlug = roleSlugByApiRole[worker.role || session.role];

        if (!ignore && roleSlug) {
          const nextSession = {
            ...session,
            role: worker.role || session.role,
            roleSlug,
            worker,
            tokenPayload: session.tokenPayload || decodeJwtPayload(session.token),
          };

          setSession(nextSession);
          writeStoredSession(nextSession);
        }
      } catch {
        if (!ignore) {
          clearStoredSession();
          setSession(null);
        }
      } finally {
        if (!ignore) {
          setIsRestoringSession(false);
        }
      }
    }

    restoreSession();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleLogin(roleSlug, credentials) {
    const loginResponse = await loginWorker(credentials);
    const resolvedRoleSlug = roleSlugByApiRole[loginResponse.role];

    if (!resolvedRoleSlug) {
      throw new Error('The backend returned an unsupported worker role.');
    }

    if (resolvedRoleSlug !== roleSlug) {
      throw new Error(`${loginResponse.role} accounts must use the ${roleConfig[resolvedRoleSlug].label} login screen.`);
    }

    const worker = await fetchCurrentWorker(loginResponse.token);
    const nextSession = createSession(loginResponse, worker);

    setSession(nextSession);
    writeStoredSession(nextSession);

    return nextSession;
  }

  async function handleRefreshSession() {
    if (!session?.token) {
      return null;
    }

    const worker = await fetchCurrentWorker(session.token);
    const nextSession = {
      ...session,
      role: worker.role || session.role,
      roleSlug: roleSlugByApiRole[worker.role] || session.roleSlug,
      worker,
      tokenPayload: session.tokenPayload || decodeJwtPayload(session.token),
    };

    setSession(nextSession);
    writeStoredSession(nextSession);

    return nextSession;
  }

  function handleLogout() {
    clearStoredSession();
    setSession(null);
  }

  return (
    <div className="app-shell">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />
      <div className="background-grid" />

      {isRestoringSession ? (
        <main className="boot-screen">
          <section className="boot-card">
            <p className="eyebrow">Restoring Session</p>
            <h1>Checking your existing Klinika token.</h1>
            <p className="support-copy">The frontend is validating the stored JWT against the backend before continuing.</p>
          </section>
        </main>
      ) : (
        <Routes>
          <Route path="/" element={<HomeRoute session={session} />} />
          <Route path="/login/:roleSlug" element={<LoginRoute onLogin={handleLogin} session={session} />} />
          <Route
            path="/portal/:roleSlug"
            element={<PortalRoute onLogout={handleLogout} onRefreshSession={handleRefreshSession} session={session} />}
          />
          <Route
            path="/portal/:roleSlug/:section"
            element={<PortalRoute onLogout={handleLogout} onRefreshSession={handleRefreshSession} session={session} />}
          />
          <Route path="*" element={<Navigate replace to={session ? roleConfig[session.roleSlug]?.portalPath || '/' : '/'} />} />
        </Routes>
      )}
    </div>
  );
}

function HomeRoute({ session }) {
  if (session?.roleSlug && roleConfig[session.roleSlug]) {
    return <Navigate replace to={roleConfig[session.roleSlug].portalPath} />;
  }

  return <PortalChooser />;
}

function LoginRoute({ onLogin, session }) {
  const { roleSlug } = useParams();

  if (!roleConfig[roleSlug]) {
    return <Navigate replace to="/" />;
  }

  if (session?.roleSlug && roleConfig[session.roleSlug]) {
    return <Navigate replace to={roleConfig[session.roleSlug].portalPath} />;
  }

  return <RoleLoginScreen onLogin={onLogin} roleSlug={roleSlug} />;
}

function PortalRoute({ onLogout, onRefreshSession, session }) {
  const { roleSlug, section } = useParams();
  const config = roleConfig[roleSlug];

  if (!session?.token) {
    return <Navigate replace to={config?.loginPath || '/'} />;
  }

  if (roleSlug !== session.roleSlug) {
    return <Navigate replace to={roleConfig[session.roleSlug].portalPath} />;
  }

  if (!config) {
    return <Navigate replace to="/" />;
  }

  const resolvedSection = section || 'overview';

  if (!config.sections.includes(resolvedSection)) {
    return <Navigate replace to={config.portalPath} />;
  }

  return (
    <RoleWorkspace
      onLogout={onLogout}
      onRefreshSession={onRefreshSession}
      roleSlug={roleSlug}
      section={resolvedSection}
      session={session}
    />
  );
}

function PortalChooser() {
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

function RoleLoginScreen({ onLogin, roleSlug }) {
  const config = roleConfig[roleSlug];
  const navigate = useNavigate();
  const [email, setEmail] = useState(config.sampleEmail);
  const [password, setPassword] = useState(config.samplePassword);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await onLogin(roleSlug, { email, password });
      navigate(config.portalPath, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="layout-shell">
      <section className="login-layout">
        <article className={`portal-card portal-card-large ${config.themeClass}`}>
          <Link className="secondary-link" to="/">
            Back to portal selection
          </Link>
          <p className="eyebrow">{config.eyebrow}</p>
          <h1>{config.title}</h1>
          <p className="support-copy">{config.helper}</p>

          <div className="sample-box">
            <span className="status-label">Seeded test account</span>
            <strong>{config.sampleEmail}</strong>
            <span>Password: {config.samplePassword}</span>
          </div>
        </article>

        <article className="auth-card">
          <div className="auth-card-header">
            <p className="eyebrow">Sign In</p>
            <h2>{config.label} login</h2>
            <p>Use the same worker credentials issued by the backend. The portal rejects users whose returned role does not match this screen.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input autoComplete="username" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
            </label>

            <label>
              <span>Password</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>

            {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Signing in...' : `Sign in as ${config.label}`}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}

function RoleWorkspace({ onLogout, onRefreshSession, roleSlug, section, session }) {
  const config = roleConfig[roleSlug];
  const navItems = getPortalNav(roleSlug);

  return (
    <main className="layout-shell">
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Authenticated</p>
          <h1>{config.label} portal.</h1>
          <p className="support-copy">
            Shared account access is now available in every role panel. The administrator portal includes live staff and clinic modules on top of the authentication shell.
          </p>
        </div>

        <div className="workspace-actions">
          <span className={`role-pill ${config.themeClass}`}>{session.role}</span>
          <button className="ghost-button" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </section>

      <section className="portal-shell">
        <aside className="portal-sidebar">
          <div className={`sidebar-identity ${config.themeClass}`}>
            <p className="eyebrow">Signed in</p>
            <strong>{[session.worker?.firstName, session.worker?.lastName].filter(Boolean).join(' ') || session.email}</strong>
            <span>{session.worker?.email || session.email}</span>
            <small>{session.worker?.clinicName || 'No clinic assigned'}</small>
          </div>

          <nav className="portal-nav">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) => `portal-nav-link${isActive ? ' is-active' : ''}`}
                end={item.key === 'overview'}
                key={item.key}
                to={item.path}
              >
                <span>{item.label}</span>
                <small>{item.description}</small>
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="portal-content">
          {section === 'overview' ? <RoleOverview roleSlug={roleSlug} session={session} /> : null}
          {section === 'account' ? <AccountPanel onRefreshSession={onRefreshSession} roleSlug={roleSlug} session={session} /> : null}
          {section === 'admin-desk' ? <AdminDeskPanel session={session} /> : null}
          {section === 'staff' ? <AdminStaffPanel session={session} /> : null}
          {section === 'clinics' ? <AdminClinicsPanel /> : null}
        </section>
      </section>
    </main>
  );
}

function getPortalNav(roleSlug) {
  const config = roleConfig[roleSlug];
  const basePath = config.portalPath;

  const items = [
    {
      key: 'overview',
      label: `${config.label} overview`,
      description: 'Role-specific landing panel',
      path: basePath,
    },
    {
      key: 'account',
      label: 'My account',
      description: 'Personal session and identity data',
      path: `${basePath}/account`,
    },
  ];

  if (roleSlug === 'admin') {
    items.push(
      {
        key: 'admin-desk',
        label: 'Admin desk',
        description: 'Administrative shell and module map',
        path: `${basePath}/admin-desk`,
      },
      {
        key: 'staff',
        label: 'Staff',
        description: 'Worker directory and account provisioning',
        path: `${basePath}/staff`,
      },
      {
        key: 'clinics',
        label: 'Clinics',
        description: 'Clinic directory snapshot',
        path: `${basePath}/clinics`,
      },
    );
  }

  return items;
}

function formatDateTime(value) {
  if (!value) {
    return 'Unavailable';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatDate(value) {
  if (!value) {
    return 'Unavailable';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(parsed);
}

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

      <div className="workspace-grid compact-grid">
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

        <article className="workspace-panel">
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

      <div className="workspace-grid compact-grid">
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

        <article className="workspace-panel">
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

function getRoleSpecificSummary(worker) {
  if (!worker) {
    return 'Unavailable';
  }

  if (worker.role === 'Administrator') {
    return worker.seniorityLevel || 'No seniority level set';
  }

  if (worker.role === 'Doctor') {
    return worker.specialty ? `${worker.specialty} • ${worker.licenseNumber || 'No license number'}` : 'No specialty set';
  }

  if (worker.role === 'Secretary') {
    return worker.qualification || 'No qualification set';
  }

  return 'Unavailable';
}

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

      <div className="workspace-grid compact-grid">
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

function AdminStaffPanel({ session }) {
  const [workers, setWorkers] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formState, setFormState] = useState(initialWorkerForm);
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [editFormState, setEditFormState] = useState({});
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setErrorMessage('');
      setIsLoading(true);

      try {
        const [workersResponse, clinicsResponse] = await Promise.all([
          fetchWorkers(session.token),
          fetchClinics(),
        ]);

        if (!ignore) {
          setWorkers(workersResponse);
          setClinics(clinicsResponse);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load staff data.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [session.token]);

  function updateField(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    setIsSubmitting(true);

    const payload = {
      email: formState.email,
      firstName: formState.firstName,
      lastName: formState.lastName,
      phoneNumber: formState.phoneNumber,
      jmbg: formState.jmbg,
      gender: formState.gender,
      dateOfBirth: formState.dateOfBirth,
      clinicId: formState.clinicId ? Number(formState.clinicId) : null,
      temporaryPassword: formState.temporaryPassword,
      role: formState.role,
      seniorityLevel: formState.role === 'Administrator' ? formState.seniorityLevel : null,
      specialty: formState.role === 'Doctor' ? formState.specialty : null,
      licenseNumber: formState.role === 'Doctor' ? formState.licenseNumber : null,
      qualification: formState.role === 'Secretary' ? formState.qualification : null,
    };

    try {
      const response = await createWorker(session.token, payload);
      const freshWorkers = await fetchWorkers(session.token);

      setWorkers(freshWorkers);
      setFormState(initialWorkerForm);
      setStatusMessage(`Worker created successfully with id ${response.workerId}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create worker.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEditOpen(worker) {
    setEditingWorker(worker);
    setEditFormState({
      firstName: worker.firstName || '',
      lastName: worker.lastName || '',
      email: worker.email || '',
      phoneNumber: worker.phoneNumber || '',
      jmbg: worker.jmbg || '',
      gender: worker.gender || 'F',
      dateOfBirth: worker.dateOfBirth ? worker.dateOfBirth.split('T')[0] : '',
      role: worker.role || 'Secretary',
      clinicId: worker.clinicId ? String(worker.clinicId) : '',
      seniorityLevel: worker.seniorityLevel || '',
      specialty: worker.specialty || '',
      licenseNumber: worker.licenseNumber || '',
      qualification: worker.qualification || '',
      newPassword: '',
    });
    setShowForm(false);
    setStatusMessage('');
    setErrorMessage('');
  }

  function updateEditField(field, value) {
    setEditFormState((current) => ({ ...current, [field]: value }));
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    setIsEditSubmitting(true);

    const payload = {
      email: editFormState.email,
      firstName: editFormState.firstName,
      lastName: editFormState.lastName,
      phoneNumber: editFormState.phoneNumber,
      jmbg: editFormState.jmbg,
      gender: editFormState.gender,
      dateOfBirth: editFormState.dateOfBirth,
      clinicId: editFormState.clinicId ? Number(editFormState.clinicId) : null,
      role: editingWorker.role,
      seniorityLevel: editingWorker.role === 'Administrator' ? editFormState.seniorityLevel : null,
      specialty: editingWorker.role === 'Doctor' ? editFormState.specialty : null,
      licenseNumber: editingWorker.role === 'Doctor' ? editFormState.licenseNumber : null,
      qualification: editingWorker.role === 'Secretary' ? editFormState.qualification : null,
    };

    if (editFormState.newPassword) {
      payload.newPassword = editFormState.newPassword;
    }

    try {
      await updateWorker(session.token, editingWorker.id, payload);
      const freshWorkers = await fetchWorkers(session.token);
      setWorkers(freshWorkers);
      setEditingWorker(null);
      setStatusMessage(`Worker #${editingWorker.id} updated successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update worker.');
    } finally {
      setIsEditSubmitting(false);
    }
  }

  async function handleDeleteConfirm(workerId) {
    const target = workers.find((w) => w.id === workerId);
    const nextActive = target ? !target.isActive : false;
    setIsDeleting(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      await setWorkerActive(session.token, workerId, nextActive);
      const freshWorkers = await fetchWorkers(session.token);
      setWorkers(freshWorkers);
      setConfirmDeleteId(null);
      setStatusMessage(`Worker #${workerId} ${nextActive ? 'activated' : 'deactivated'} successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update worker status.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-admin">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Staff module</p>
            <h2>Worker directory and provisioning</h2>
          </div>
          <div className="panel-heading-actions">
            <span className="status-chip">{workers.length} workers</span>
            <button className="ghost-button" onClick={() => setShowForm((current) => !current)} type="button">
              {showForm ? 'Cancel' : 'Add worker'}
            </button>
          </div>
        </div>
        <p>This admin module is connected to the live backend worker list and create-worker endpoint.</p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}
      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      {showForm ? (
        <article className="workspace-panel">
          <p className="eyebrow">Create worker</p>
          <h2>Provision a new account</h2>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                <span>First name</span>
                <input onChange={(event) => updateField('firstName', event.target.value)} required type="text" value={formState.firstName} />
              </label>
              <label>
                <span>Last name</span>
                <input onChange={(event) => updateField('lastName', event.target.value)} required type="text" value={formState.lastName} />
              </label>
              <label>
                <span>Email</span>
                <input onChange={(event) => updateField('email', event.target.value)} required type="email" value={formState.email} />
              </label>
              <label>
                <span>Phone number</span>
                <input onChange={(event) => updateField('phoneNumber', event.target.value)} required type="text" value={formState.phoneNumber} />
              </label>
              <label>
                <span>JMBG</span>
                <input onChange={(event) => updateField('jmbg', event.target.value)} required type="text" value={formState.jmbg} />
              </label>
              <label>
                <span>Gender</span>
                <select onChange={(event) => updateField('gender', event.target.value)} value={formState.gender}>
                  <option value="F">F</option>
                  <option value="M">M</option>
                </select>
              </label>
              <label>
                <span>Date of birth</span>
                <input onChange={(event) => updateField('dateOfBirth', event.target.value)} required type="date" value={formState.dateOfBirth} />
              </label>
              <label>
                <span>Temporary password</span>
                <input onChange={(event) => updateField('temporaryPassword', event.target.value)} required type="text" value={formState.temporaryPassword} />
              </label>
              <label>
                <span>Role</span>
                <select onChange={(event) => updateField('role', event.target.value)} value={formState.role}>
                  {workerRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Clinic</span>
                <select onChange={(event) => updateField('clinicId', event.target.value)} value={formState.clinicId}>
                  <option value="">No clinic assignment</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {formState.role === 'Administrator' ? (
              <label>
                <span>Seniority level</span>
                <input onChange={(event) => updateField('seniorityLevel', event.target.value)} type="text" value={formState.seniorityLevel} />
              </label>
            ) : null}

            {formState.role === 'Doctor' ? (
              <div className="form-grid">
                <label>
                  <span>Specialty</span>
                  <input onChange={(event) => updateField('specialty', event.target.value)} type="text" value={formState.specialty} />
                </label>
                <label>
                  <span>License number</span>
                  <input onChange={(event) => updateField('licenseNumber', event.target.value)} type="text" value={formState.licenseNumber} />
                </label>
              </div>
            ) : null}

            {formState.role === 'Secretary' ? (
              <label>
                <span>Qualification</span>
                <input onChange={(event) => updateField('qualification', event.target.value)} type="text" value={formState.qualification} />
              </label>
            ) : null}

            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating worker...' : 'Create worker'}
            </button>
          </form>
        </article>
      ) : null}

      {editingWorker ? (
        <article className="workspace-panel">
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Edit worker</p>
              <h2>Update {editingWorker.firstName} {editingWorker.lastName}</h2>
            </div>
            <button className="ghost-button" onClick={() => setEditingWorker(null)} type="button">
              Cancel
            </button>
          </div>
          <form className="admin-form" onSubmit={handleEditSubmit}>
            <div className="form-grid">
              <label>
                <span>First name</span>
                <input onChange={(event) => updateEditField('firstName', event.target.value)} required type="text" value={editFormState.firstName} />
              </label>
              <label>
                <span>Last name</span>
                <input onChange={(event) => updateEditField('lastName', event.target.value)} required type="text" value={editFormState.lastName} />
              </label>
              <label>
                <span>Email</span>
                <input onChange={(event) => updateEditField('email', event.target.value)} required type="email" value={editFormState.email} />
              </label>
              <label>
                <span>Phone number</span>
                <input onChange={(event) => updateEditField('phoneNumber', event.target.value)} required type="text" value={editFormState.phoneNumber} />
              </label>
              <label>
                <span>JMBG</span>
                <input onChange={(event) => updateEditField('jmbg', event.target.value)} required type="text" value={editFormState.jmbg} />
              </label>
              <label>
                <span>Gender</span>
                <select onChange={(event) => updateEditField('gender', event.target.value)} value={editFormState.gender}>
                  <option value="F">F</option>
                  <option value="M">M</option>
                </select>
              </label>
              <label>
                <span>Date of birth</span>
                <input onChange={(event) => updateEditField('dateOfBirth', event.target.value)} required type="date" value={editFormState.dateOfBirth} />
              </label>
              <label>
                <span>New password</span>
                <input onChange={(event) => updateEditField('newPassword', event.target.value)} placeholder="Leave blank to keep unchanged" type="password" value={editFormState.newPassword} />
              </label>
              <label>
                <span>Role</span>
                <input disabled readOnly type="text" value={editingWorker.role} />
              </label>
              <label>
                <span>Clinic</span>
                <select onChange={(event) => updateEditField('clinicId', event.target.value)} value={editFormState.clinicId}>
                  <option value="">No clinic assignment</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {editFormState.role === 'Administrator' ? (
              <label>
                <span>Seniority level</span>
                <input onChange={(event) => updateEditField('seniorityLevel', event.target.value)} type="text" value={editFormState.seniorityLevel} />
              </label>
            ) : null}

            {editFormState.role === 'Doctor' ? (
              <div className="form-grid">
                <label>
                  <span>Specialty</span>
                  <input onChange={(event) => updateEditField('specialty', event.target.value)} type="text" value={editFormState.specialty} />
                </label>
                <label>
                  <span>License number</span>
                  <input onChange={(event) => updateEditField('licenseNumber', event.target.value)} type="text" value={editFormState.licenseNumber} />
                </label>
              </div>
            ) : null}

            {editFormState.role === 'Secretary' ? (
              <label>
                <span>Qualification</span>
                <input onChange={(event) => updateEditField('qualification', event.target.value)} type="text" value={editFormState.qualification} />
              </label>
            ) : null}

            <button className="primary-button" disabled={isEditSubmitting} type="submit">
              {isEditSubmitting ? 'Updating worker...' : 'Update worker'}
            </button>
          </form>
        </article>
      ) : null}

      <article className="workspace-panel">
        <p className="eyebrow">Directory</p>
        <h2>Existing workers</h2>
        {isLoading ? <p>Loading worker directory...</p> : null}
        {!isLoading ? (
          <div className="data-list data-list-scroll">
            {workers.map((worker) => (
              <article className={`data-row data-row-editable${worker.isActive ? '' : ' data-row-inactive'}`} key={worker.id}>
                <div>
                  <strong>{worker.firstName} {worker.lastName}</strong>
                  <p>{worker.email}</p>
                </div>
                <div className="data-meta">
                  <span>{worker.role}</span>
                  <small>{worker.clinicName || 'No clinic'}</small>
                  <small>{worker.isActive ? 'Active' : 'Inactive'}</small>
                </div>
                {confirmDeleteId === worker.id ? (
                  <div className="row-actions">
                    <span className="delete-confirm-label">{worker.isActive ? 'Deactivate?' : 'Activate?'}</span>
                    <button className={worker.isActive ? 'danger-button' : 'primary-button'} disabled={isDeleting} onClick={() => handleDeleteConfirm(worker.id)} type="button">
                      {isDeleting ? '...' : 'Confirm'}
                    </button>
                    <button className="ghost-button" disabled={isDeleting} onClick={() => setConfirmDeleteId(null)} type="button">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="row-actions">
                    <button className="ghost-button" onClick={() => handleEditOpen(worker)} type="button">
                      Edit
                    </button>
                    <button
                      className={worker.isActive ? 'danger-button-outline' : 'ghost-button'}
                      onClick={() => setConfirmDeleteId(worker.id)}
                      type="button"
                    >
                      {worker.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  );
}

function AdminClinicsPanel() {
  const [clinics, setClinics] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadClinics() {
      setErrorMessage('');
      setIsLoading(true);

      try {
        const response = await fetchClinics();
        if (!ignore) {
          setClinics(response);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load clinics.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadClinics();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-admin">
        <p className="eyebrow">Clinics module</p>
        <h2>Clinic directory snapshot</h2>
        <p>This panel reads the backend clinic directory so the administrator shell can reference the current clinic structure.</p>
      </article>

      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      <article className="workspace-panel">
        <p className="eyebrow">Clinics</p>
        <h2>Available clinics</h2>
        {isLoading ? <p>Loading clinics...</p> : null}
        {!isLoading ? (
          <div className="data-list">
            {clinics.map((clinic) => (
              <article className="data-row" key={clinic.id}>
                <div>
                  <strong>{clinic.name}</strong>
                  <p>{clinic.email}</p>
                </div>
                <div className="data-meta">
                  <span>{clinic.phoneNumber}</span>
                  <small>{clinic.address?.streetName} {clinic.address?.streetNumber}</small>
                  <small>{clinic.address?.city?.name || clinic.address?.cityName || 'Clinic address available in backend data'}</small>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  );
}

export default App;