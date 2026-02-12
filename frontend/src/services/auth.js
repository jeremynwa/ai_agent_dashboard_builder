// frontend/src/services/auth.js
// Lightweight Cognito auth using amazon-cognito-identity-js
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

const POOL_CONFIG = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
};

const userPool = new CognitoUserPool(POOL_CONFIG);

// ============ GET CURRENT SESSION ============
export function getCurrentUser() {
  return userPool.getCurrentUser();
}

export function getSession() {
  return new Promise((resolve, reject) => {
    const user = getCurrentUser();
    if (!user) return resolve(null);

    user.getSession((err, session) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve(session);
    });
  });
}

export async function getIdToken() {
  const session = await getSession();
  return session?.getIdToken()?.getJwtToken() || null;
}

export async function getAccessToken() {
  const session = await getSession();
  return session?.getAccessToken()?.getJwtToken() || null;
}

// ============ LOGIN ============
export function login(email, password) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve({
          user,
          idToken: session.getIdToken().getJwtToken(),
          email: session.getIdToken().payload.email,
        });
      },
      onFailure: (err) => {
        reject(err);
      },
      // Handle first-time login where Cognito forces password change
      newPasswordRequired: (userAttributes) => {
        resolve({ newPasswordRequired: true, user, userAttributes });
      },
    });
  });
}

// ============ COMPLETE NEW PASSWORD ============
export function completeNewPassword(user, newPassword) {
  return new Promise((resolve, reject) => {
    user.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: (session) => {
        resolve({
          user,
          idToken: session.getIdToken().getJwtToken(),
          email: session.getIdToken().payload.email,
        });
      },
      onFailure: (err) => reject(err),
    });
  });
}

// ============ SIGNUP ============
export function signUp(email, password) {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
    ];

    userPool.signUp(email, password, attributes, null, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// ============ CONFIRM SIGNUP (verification code) ============
export function confirmSignUp(email, code) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmRegistration(code, true, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// ============ RESEND CONFIRMATION CODE ============
export function resendConfirmation(email) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.resendConfirmationCode((err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// ============ FORGOT PASSWORD ============
export function forgotPassword(email) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.forgotPassword({
      onSuccess: (result) => resolve(result),
      onFailure: (err) => reject(err),
    });
  });
}

export function confirmForgotPassword(email, code, newPassword) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

// ============ LOGOUT ============
export function logout() {
  const user = getCurrentUser();
  if (user) user.signOut();
}