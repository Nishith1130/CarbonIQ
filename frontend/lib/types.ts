export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user?: User;
}

export interface ApiError {
  code: string;
  message: string;
}
