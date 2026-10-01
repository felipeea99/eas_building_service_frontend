export interface LoginResponse {
  token: string;
  fullName: string;
  role: string;
  tenantId: string;
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangeUserStatusRequest {
  userId: string;
  isActive: boolean;
}
