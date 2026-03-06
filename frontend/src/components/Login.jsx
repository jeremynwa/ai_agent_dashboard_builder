// frontend/src/components/Login.jsx
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { completeNewPassword } from '../services/auth';
import { SK } from '../services/sk-theme';
import logoSK from '../assets/SK_Paris_logo.png';

export default function Login() {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New password flow (first login after admin-created account)
  const [newPasswordMode, setNewPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [cognitoUser, setCognitoUser] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsSubmitting(true);
    clearError();

    const result = await login(email, password);

    if (result.newPasswordRequired) {
      setCognitoUser(result.cognitoUser);
      setNewPasswordMode(true);
    }

    setIsSubmitting(false);
  };

  const handleNewPassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim() || !cognitoUser) return;

    setIsSubmitting(true);
    clearError();

    try {
      await completeNewPassword(cognitoUser, newPassword);
      // After completing, re-login with new password
      await login(email, newPassword);
    } catch (err) {
      // error is handled by AuthProvider
    }

    setIsSubmitting(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ ...styles.logoRow, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logoSK} alt="Simon-Kucher Paris" style={{ height: 32, objectFit: 'contain' }} />
          <span style={styles.logo}>EDOUARD AI</span>
        </div>
        <div style={{ width: '52px', height: '2px', background: SK.ruby, borderRadius: '1px', marginBottom: '24px' }} />

        <h1 style={styles.title}>
          {newPasswordMode ? 'Nouveau mot de passe' : 'Connexion'}
        </h1>
        <p style={styles.subtitle}>
          {newPasswordMode
            ? 'Choisissez un nouveau mot de passe pour activer votre compte.'
            : 'Connectez-vous pour accéder à Edouard AI.'}
        </p>

        {error && (
          <div style={styles.errorBox} role="alert">{error}</div>
        )}

        {newPasswordMode ? (
          <form onSubmit={handleNewPassword}>
            <div style={styles.field}>
              <label style={styles.label}>Nouveau mot de passe</label>
              <input
                style={styles.input}
                type="password"
                placeholder="Min 8 caractères, majuscule, chiffre"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
              />
            </div>

            <button
              type="submit"
              style={{ ...styles.button, opacity: isSubmitting ? 0.5 : 1 }}
              disabled={isSubmitting || !newPassword.trim()}
            >
              {isSubmitting ? 'Activation...' : 'Activer le compte'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                type="email"
                placeholder="nom@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Mot de passe</label>
              <input
                style={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              style={{ ...styles.button, opacity: isSubmitting ? 0.5 : 1 }}
              disabled={isSubmitting || !email.trim() || !password.trim()}
            >
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        )}
      </div>

      <div style={styles.footer}>
        Simon-Kucher Paris
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: `linear-gradient(160deg, ${SK.bgPrimary} 0%, ${SK.bgSecondary} 60%, rgba(200, 0, 65, 0.03) 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    fontFamily: SK.fontFamily,
    color: SK.textPrimary,
  },
  card: {
    background: SK.bgPrimary,
    borderRadius: '16px',
    padding: '48px 40px',
    border: `1px solid ${SK.border}`,
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 12px 40px rgba(50, 63, 72, 0.12)',
  },
  logoRow: {
    marginBottom: '12px',
  },
  logo: {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: SK.ruby,
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '8px',
    color: SK.textPrimary,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '14px',
    color: SK.textSecondary,
    marginBottom: '32px',
    lineHeight: '1.6',
  },
  errorBox: {
    background: 'rgba(228, 84, 68, 0.06)',
    border: `1px solid rgba(228, 84, 68, 0.2)`,
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '13px',
    color: SK.signalRed,
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: SK.textSecondary,
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    background: SK.bgSecondary,
    border: `1px solid ${SK.border}`,
    borderRadius: '8px',
    padding: '12px 16px',
    color: SK.textPrimary,
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  button: {
    width: '100%',
    background: SK.ruby,
    color: SK.textInverse,
    border: 'none',
    padding: '14px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '12px',
    fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(200, 0, 65, 0.2)',
  },
  footer: {
    marginTop: '32px',
    fontSize: '12px',
    color: SK.textMuted,
    letterSpacing: '0.02em',
  },
};
