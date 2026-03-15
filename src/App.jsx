import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useParams,
} from 'react-router-dom';
import {
  fetchCurrentWorker,
  getApiBaseUrlLabel,
  loginWorker,
} from './lib/api';
import { roleConfig, roleSlugByApiRole } from './config/roles';
import AccountPanel from './components/account/AccountPanel';
import AdminClinicsPanel from './components/admin/AdminClinicsPanel';
import AdminDeskPanel from './components/admin/AdminDeskPanel';
import AdminStaffPanel from './components/admin/AdminStaffPanel';
import PortalChooser from './components/portal/PortalChooser';
import RoleLoginScreen from './components/portal/RoleLoginScreen';
import RoleOverview from './components/portal/RoleOverview';
import SecretaryAppointmentsPanel from './components/secretary/SecretaryAppointmentsPanel';
import SecretarySchedulingPanel from './components/secretary/SecretarySchedulingPanel';
import DoctorSlotsPanel from './components/doctor/DoctorSlotsPanel';
import DoctorAppointmentsPanel from './components/doctor/DoctorAppointmentsPanel';
import { clearStoredSession, createSession, decodeJwtPayload, isSessionExpired, readStoredSession, writeStoredSession } from './lib/session';
import { playUiFeedbackSound } from './lib/ui-feedback';

function App() {
  return (
    <BrowserRouter>
      <AuthApplication />
    </BrowserRouter>
  );
}

function AuthApplication() {
  const [session, setSession] = useState(() => {
    const stored = readStoredSession();

    if (stored && isSessionExpired(stored)) {
      clearStoredSession();
      return null;
    }

    return stored;
  });
  const [isRestoringSession, setIsRestoringSession] = useState(() => {
    const stored = readStoredSession();

    if (!stored?.token || isSessionExpired(stored)) {
      return false;
    }

    return true;
  });

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
    const nextSession = createSession(loginResponse, worker, roleSlugByApiRole);

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

  return <PortalChooser getApiBaseUrlLabel={getApiBaseUrlLabel} />;
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
                onClick={() => playUiFeedbackSound('tab')}
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
          {section === 'clinics' ? <AdminClinicsPanel session={session} /> : null}
          {section === 'desk-scheduling' ? <SecretarySchedulingPanel session={session} /> : null}
          {section === 'desk-appointments' ? <SecretaryAppointmentsPanel session={session} /> : null}
          {section === 'my-slots' ? <DoctorSlotsPanel session={session} /> : null}
          {section === 'my-appointments' ? <DoctorAppointmentsPanel session={session} /> : null}
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

  if (roleSlug === 'secretary') {
    items.push(
      {
        key: 'desk-scheduling',
        label: 'Desk scheduling',
        description: 'Doctor slots, patient selection, and booking',
        path: `${basePath}/desk-scheduling`,
      },
      {
        key: 'desk-appointments',
        label: 'Desk appointments',
        description: 'Patient and doctor appointment lookup/actions',
        path: `${basePath}/desk-appointments`,
      },
    );
  }

  if (roleSlug === 'doctor') {
    items.push(
      {
        key: 'my-slots',
        label: 'My slots',
        description: 'Create and manage availability slots',
        path: `${basePath}/my-slots`,
      },
      {
        key: 'my-appointments',
        label: 'My appointments',
        description: 'Schedule for the day, complete or no-show',
        path: `${basePath}/my-appointments`,
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

export default App;