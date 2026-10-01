// --- Request: crear tenant client ---
export interface TenantClientRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  email: string;
  phoneNumber: string;
  companyName?: string;
  rfc?: string;
}

// --- Response general (GetAll, GetById, Create, Update) ---
export interface TenantClientResponse {
  id: string;
  fullName: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  companyName?: string;
  rfc?: string;
  status: boolean;
  hasAccount: boolean;
}

// --- Request: actualizar tenant client (PUT) ---
export interface TenantClientUpdate {
  id: string;
  companyName?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  secondLastName?: string;
  rfc?: string;
  phoneNumber: string;
}

// --- Request: cambiar status ---
export interface TenantClientChangeStatus {
  tenantClientId: string;
  newStatus: boolean;
}

// --- Request: vincular cuenta de usuario a tenant client ---
export interface LinkUserAccountRequest {
  userId: string;
  tenantClientId: string;
}
