export interface LoginResponse {
  token: string;
  refreshToken: string;
  fullName: string;
  role: string;
  tenantId: string;
  mustChangePassword: boolean;
}
