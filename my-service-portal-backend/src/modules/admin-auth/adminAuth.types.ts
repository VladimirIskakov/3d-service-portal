export interface AdminAuthUser {
  uid: string;
  email: string;
  role: 'admin';
}

export interface AdminSessionResponse {
  authenticated: boolean;
  user: AdminAuthUser | null;
}

export interface AdminLoginBody {
  login?: unknown;
  password?: unknown;
}

