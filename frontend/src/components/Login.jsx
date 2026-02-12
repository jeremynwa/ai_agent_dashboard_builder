// frontend/src/components/Login.jsx
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { completeNewPassword } from '../services/auth';

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
        <div style={styles.logoRow}>
          <span style={styles.logo}>FACTORY</span>
        </div>

        <h1 style={styles.title}>
          {newPasswordMode ? 'Nouveau mot de passe' : 'Connexion'}
        </h1>
        <p style={styles.subtitle}>
          {newPasswordMode
            ? 'Choisissez un nouveau mot de passe pour activer votre compte.'
            : 'Connectez-vous pour accéder à la Factory.'}
        </p>

        {error && (
          <div style={styles.errorBox}>{error}</div>
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
        SK Consulting — App Factory
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0F0F12',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#FFFFFF',
  },
  card: {
    background: '#16161A',
    borderRadius: '16px',
    padding: '40px',
    border: '1px solid #2E2E36',
    width: '100%',
    maxWidth: '400px',
  },
  logoRow: {
    marginBottom: '32px',
  },
  logo: {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: '#FFFFFF',
  },
  title: {
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: '14px',
    color: '#71717A',
    marginBottom: '28px',
    lineHeight: '1.5',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#FCA5A5',
    marginBottom: '20px',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: '#A1A1AA',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    background: '#1C1C21',
    border: '1px solid #2E2E36',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  },
  button: {
    width: '100%',
    background: '#00765F',
    color: 'white',
    border: 'none',
    padding: '14px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '8px',
    fontFamily: 'inherit',
  },
  footer: {
    marginTop: '24px',
    fontSize: '12px',
    color: '#52525B',
  },
};