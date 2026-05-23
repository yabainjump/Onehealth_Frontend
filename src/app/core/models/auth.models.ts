export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  institution: string;
  typeMedecin?: string;
  country?: string;
  city?: string;
  phone?: string;
  bio?: string;
  photoURL?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  institution: string;
  typeMedecin: string;
  country: string;
  city: string;
  phone: string;
  bio: string;
  photoURL: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: AuthUser;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
  resetUrl?: string;
  expiresInMinutes?: number;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

