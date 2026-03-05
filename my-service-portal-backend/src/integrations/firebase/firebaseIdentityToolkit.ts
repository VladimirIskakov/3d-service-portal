export interface FirebasePasswordLoginResult {
  uid: string;
  email: string;
}

interface FirebaseErrorResponse {
  error?: {
    message?: string;
  };
}

interface FirebaseLoginResponse {
  localId: string;
  email: string;
}

export interface FirebaseAuthClientError extends Error {
  code: string;
}

const mapFirebaseErrorCode = (message: string): string => {
  switch (message) {
    case 'INVALID_LOGIN_CREDENTIALS':
    case 'INVALID_PASSWORD':
    case 'EMAIL_NOT_FOUND':
      return 'invalid_credentials';
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'firebase_rate_limited';
    case 'API_KEY_INVALID':
    case 'PROJECT_NOT_FOUND':
      return 'server_misconfigured';
    default:
      return 'firebase_auth_failed';
  }
};

const createFirebaseError = (code: string, message: string): FirebaseAuthClientError => {
  const error = new Error(message) as FirebaseAuthClientError;
  error.code = code;
  return error;
};

export const signInWithFirebasePassword = async (
  apiKey: string,
  email: string,
  password: string,
): Promise<FirebasePasswordLoginResult> => {
  const endpoint =
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });
  } catch {
    throw createFirebaseError('firebase_request_failed', 'Failed to reach Firebase Auth.');
  }

  const payload = (await response.json()) as FirebaseLoginResponse | FirebaseErrorResponse;

  if (!response.ok) {
    const firebaseMessage = (payload as FirebaseErrorResponse).error?.message ?? 'UNKNOWN';
    throw createFirebaseError(mapFirebaseErrorCode(firebaseMessage), firebaseMessage);
  }

  const data = payload as FirebaseLoginResponse;

  return {
    uid: data.localId,
    email: data.email,
  };
};

