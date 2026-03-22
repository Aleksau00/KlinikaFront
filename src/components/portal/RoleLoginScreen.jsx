import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roleConfig } from '../../config/roles';
import { ArrowRight, KeyRound, Mail, Sparkles, ShieldCheck } from 'lucide-react';
import dnaVideo from '../../../imgs/DNA.webm';

function inferRoleTone(email) {
  const value = String(email || '').toLowerCase();

  if (!value) {
    return 'default';
  }

  if (value.includes('admin') || value.includes('administrator') || value.includes('uprava')) {
    return 'admin';
  }

  if (value.includes('doctor') || value.includes('doktor') || value.includes('dr.') || value.includes('dr_') || value.includes('dr-') || value.startsWith('dr')) {
    return 'doctor';
  }

  if (value.includes('secretary') || value.includes('sekretar') || value.includes('reception') || value.includes('frontdesk')) {
    return 'secretary';
  }

  return 'default';
}

function getToneVariables(tone) {
  if (tone === 'admin') {
    return {
      '--login-accent': 'rgba(194, 111, 87, 0.95)',
      '--login-accent-soft': 'rgba(230, 155, 135, 0.4)',
      '--login-glow': 'rgba(197, 113, 90, 0.35)',
    };
  }

  if (tone === 'doctor') {
    return {
      '--login-accent': 'rgba(49, 196, 220, 0.95)',
      '--login-accent-soft': 'rgba(96, 223, 240, 0.4)',
      '--login-glow': 'rgba(46, 196, 221, 0.35)',
    };
  }

  if (tone === 'secretary') {
    return {
      '--login-accent': 'rgba(208, 161, 62, 0.95)',
      '--login-accent-soft': 'rgba(229, 187, 102, 0.4)',
      '--login-glow': 'rgba(213, 169, 73, 0.35)',
    };
  }

  return {
    '--login-accent': 'rgba(65, 181, 232, 0.92)',
    '--login-accent-soft': 'rgba(112, 209, 245, 0.38)',
    '--login-glow': 'rgba(70, 186, 236, 0.3)',
  };
}

function RoleLoginScreen({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const roleTone = inferRoleTone(email);
  const toneVars = getToneVariables(roleTone);
  const isReadyToSubmit = email.trim().length > 0 && password.length > 0;

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
    <main className="layout-shell login-shell">
      <section className="login-layout" style={toneVars}>
        <div aria-hidden="true" className="login-glass-bg">
          <span className="login-glass-blob login-glass-blob-a" />
          <span className="login-glass-blob login-glass-blob-b" />
          <span className="login-glass-blob login-glass-blob-c" />
        </div>

        <article className="portal-card portal-card-large reveal-card login-hero-card login-hero-reveal">
          <div className="login-hero-float login-hero-float-left" aria-hidden="true" />
          <div className="login-hero-float login-hero-float-right" aria-hidden="true" />
          <div className="login-hero-copy">
            <div className="login-hero-badge"><Sparkles className="panel-icon" /> Trusted clinical workflow</div>
            <p className="eyebrow">Klinika Staff Access</p>
            <h1 className="panel-title"><ShieldCheck className="panel-icon" /> Sign In</h1>
            <p className="support-copy">Use your assigned clinic email and password.</p>
          </div>

          <div aria-hidden="true" className="login-mascot-scene">
            <div className="login-dna-bubble">
              <video autoPlay className="login-dna-video" loop muted playsInline preload="metadata">
                <source src={dnaVideo} type="video/webm" />
              </video>
            </div>
          </div>
        </article>

        <article className="auth-card reveal-card login-auth-reveal">
          <div className="auth-card-header">
            <p className="eyebrow">Sign In</p>
            <h2 className="panel-title"><KeyRound className="panel-icon" /> Staff login</h2>
            <p>You will be redirected to the correct workspace based on your role.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <div className="input-with-icon">
                <Mail className="input-icon" />
                <input autoComplete="username" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
              </div>
            </label>

            <label>
              <span>Password</span>
              <div className="input-with-icon">
                <KeyRound className="input-icon" />
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>
            </label>

            {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

            <button className={`primary-button login-submit-button${isSubmitting ? ' is-loading' : ''}${isReadyToSubmit && !isSubmitting ? ' is-ready' : ''}`} disabled={isSubmitting} type="submit">
              <ArrowRight className="button-icon" />
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}

export default RoleLoginScreen;