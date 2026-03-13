import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { roleConfig } from '../../config/roles';

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

export default RoleLoginScreen;