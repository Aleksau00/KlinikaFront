import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roleConfig } from '../../config/roles';

function RoleLoginScreen({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const nextSession = await onLogin({ email, password });
      navigate(roleConfig[nextSession.roleSlug]?.portalPath || '/', { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="layout-shell">
      <section className="login-layout">
        <article className="portal-card portal-card-large">
          <p className="eyebrow">Klinika Staff Access</p>
          <h1>Sign In</h1>
          <p className="support-copy">Use your assigned clinic email and password.</p>
        </article>

        <article className="auth-card">
          <div className="auth-card-header">
            <p className="eyebrow">Sign In</p>
            <h2>Staff login</h2>
            <p>You will be redirected to the correct workspace based on your role.</p>
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
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}

export default RoleLoginScreen;