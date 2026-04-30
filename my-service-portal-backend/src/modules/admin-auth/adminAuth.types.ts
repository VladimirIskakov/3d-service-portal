export type UserRole = 'admin' | 'manager' | 'engineer' | 'viewer';

export interface AdminAuthUser {
  uid: string;
  email: string;
  role: UserRole;
}

export interface AdminSessionResponse {
  authenticated: boolean;
  user: AdminAuthUser | null;
}

export interface AdminUserDirectoryItem {
  email: string;
  role: UserRole;
}

export interface AdminLoginBody {
  login?: unknown;
  password?: unknown;
}

