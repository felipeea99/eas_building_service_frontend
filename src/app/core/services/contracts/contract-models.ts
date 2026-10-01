// GET /api/contracts (WebApi.DTOs.UnitContracts.GetContractsResponse)
export interface GetContractsResponse {
  id: string;
  unitNumber: string;
  tenantClientId: string;
  tenantClientName: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  contractType: string;
  isSigned: boolean;
  isCancelled: boolean;
  contractStatus: string;
}

export interface DocumentUrlResponse {
  url: string;
}

// GET /api/contracts/contract/{contractId}
export interface GetContractDetailResponse {
  id: string;
  unitNumber: string;
  tenantClientName: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  contractType: string;
  isSigned: boolean;
  isCancelled: boolean;
  contractStatus: string;
  documentUrl: string | null;
}

// POST /api/contracts (WebApi.DTOs.UnitContracts.CreateContractRequest)
export interface CreateContractRequest {
  unitId: string;
  tenantClientId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  contractType: ContractType;
}

// POST /api/contracts → response (WebApi.DTOs.UnitContracts.CreateContractResponse)
export interface CreateContractResponse {
  id: string;
  unitNumber: string;
  tenantClientName: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  contractType: string;
  isSigned: boolean;
  contractStatus: string;
}

// GET /api/contracts/tenant-client/{tenantClientId}
// Todos los contratos de un inquilino; el estado se calcula a hoy y IsCurrent marca los vigentes
export interface GetTenantClientContractsResponse {
  tenantClientId: string;
  tenantClientName: string;
  email: string;
  totalContracts: number;
  activeContracts: number;
  contracts: TenantClientContractItem[]; // orden: vigentes, por iniciar, historial
}

export interface TenantClientContractItem {
  id: string;
  buildingId: string;
  buildingName: string;
  unitId: string;
  unitNumber: string;
  startDate: string; // fecha de calendario (00:00Z) → mostrar con timezone 'UTC'
  endDate: string;
  monthlyRent: number;
  contractType: string;
  isSigned: boolean;
  isCancelled: boolean;
  contractStatus: string; // PendingStart | Active | ExpiringSoon | Expired | Cancelled
  isCurrent: boolean;
  daysToExpire: number | null;
}

// Domain.Contexts.PropertyContext.Enums.ContractType
export enum ContractType {
  Fixed = 0,
  Monthly = 1,
  Annual = 2,
  Temporary = 3,
}

// GET /api/contracts/{contractId}/history (WebApi.DTOs.UnitContracts.GetContractHistoryResponse)
// Historial inmutable del contrato, del más reciente al más antiguo
export interface GetContractHistoryResponse {
  contractId: string;
  items: ContractHistoryItem[];
}

export interface ContractHistoryItem {
  id: string;
  action: ContractChangeAction;
  changedAt: string;            // instante UTC
  changedByUserId: string;
  changedByName: string | null; // null si el usuario no es visible (ej. soporte interno)
  reason: string | null;
  changes: ContractHistoryChange[];
}

// Valores ya formateados por el backend: fechas "yyyy-MM-dd", montos "0.00", booleanos "True"/"False"
export interface ContractHistoryChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

// Domain.Contexts.PropertyContext.Enums.ContractChangeAction (viaja como nombre)
export type ContractChangeAction = 'Created' | 'DocumentAttached' | 'DocumentReplaced' | 'Cancelled';
