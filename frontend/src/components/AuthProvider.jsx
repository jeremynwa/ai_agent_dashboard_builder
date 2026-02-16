// frontend/src/components/AuthProvider.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { getSession, login as cognitoLogin, logout as cognitoLogout, getIdToken } from '../services/auth';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { email }
  const [loading, setLoading] = useState(true);  // checking stored session
  const [error, setError] = useState(null);

  // On mount: check if user has a valid stored session
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      console.log('[Auth] Checking stored session...');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth session check timeout')), 10000)
      );
      const session = await Promise.race([getSession(), timeoutPromise]);
      console.log('[Auth] Session result:', session ? 'valid' : 'none');
      if (session) {
        const email = session.getIdToken().payload.email;
        setUser({ email });
      }
    } catch (_) {
      // No valid session or timeout
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const result = await cognitoLogin(email, password);

      // Handle new password required (first login after admin creates user)
      if (result.newPasswordRequired) {
        return { newPasswordRequired: true, cognitoUser: result.user };
      }

      setUser({ email: result.email });
      return { success: true };
    } catch (err) {
      const message = mapCognitoError(err);
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    cognitoLogout();
    setUser(null);
  };

  // Get fresh token for API calls
  const getToken = async () => {
    return await getIdToken();
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, getToken, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// Map Cognito error codes to user-friendly messages
function mapCognitoError(err) {
  const code = err.code || err.name || '';
  switch (code) {
    case 'NotAuthorizedException':
      return 'Email ou mot de passe incorrect';
    case 'UserNotFoundException':
      return 'Aucun compte avec cet email';
    case 'UserNotConfirmedException':
      return 'Compte non confirmé. Vérifiez votre email.';
    case 'PasswordResetRequiredException':
      return 'Réinitialisation du mot de passe requise';
    case 'TooManyRequestsException':
      return 'Trop de tentatives. Réessayez plus tard.';
    case 'InvalidPasswordException':
      return 'Mot de passe invalide (min 8 caractères, majuscule, chiffre)';
    case 'UsernameExistsException':
      return 'Un compte existe déjà avec cet email';
    default:
      return err.message || 'Erreur de connexion';
  }
}