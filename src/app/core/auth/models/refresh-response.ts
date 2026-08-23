export interface RefreshResponse {
  token: string;
  fullName: string;
  role: string;
  tenantId: string;
  mustChangePassword: boolean;
}
