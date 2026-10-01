/** Debe coincidir con el enum UserRole del backend (viaja como número) */
export enum UserRole {
  SuperAdmin = 0,
  Support = 1,
  Admin = 2,
  Manager = 3,
  Staff = 4,
  Guard = 5,
  Tenant = 10, // Client en el backend
}

export interface RegisterUserRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  secondLastName?: string;
  email: string;
  temporaryPassword: string;
  buildingId: string; // Guid
  role: UserRole;
  companyName?: string;
  phoneNumber: string;
  rfc?: string;
}

export interface RegisterUserResponse {
  id: string;
  fullName: string;
  email: string;
  role: string;
  /** true si el correo ya tenía cuenta: no se creó otra, solo se asignó al edificio */
  accountAlreadyExisted: boolean;
  warning: string | null;
}

export interface TenantUserResponse {
  id: string;
  userFullName: string;
  role: number;
}

export interface GetUserResponse {
  id: string;
  userFullName: string;
  role: number;
  status : boolean;
}
