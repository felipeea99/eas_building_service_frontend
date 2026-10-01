/** Estado del aviso tal como llega en las respuestas (nombre del enum) */
export type PackageNoticeState = 'Pending' | 'Received' | 'Cancelled';

/** Valor numérico para filtrar (los enums viajan como número en los requests) */
export enum PackageNoticeStateValue {
  Pending = 0,
  Received = 1,
  Cancelled = 2,
}

export const PACKAGE_NOTICE_STATE_LABELS: Record<PackageNoticeState, string> = {
  Pending: 'En espera',
  Received: 'Recibido',
  Cancelled: 'Cancelado',
};

export const PACKAGE_NOTICE_LIMITS = {
  carrierCompany: 150,
  itemDescription: 300,
} as const;

export interface PackageNoticeResponse {
  id: string;
  buildingId: string;
  buildingName: string;
  unitId: string;
  unitName: string;
  tenantClientId: string;
  tenantClientName: string;
  carrierCompany: string;
  itemDescription: string | null;
  /** Fecha de calendario (00:00Z) → mostrar con timeZone 'UTC' */
  expectedDate: string;
  state: PackageNoticeState;
  /** Instante UTC en que se recibió */
  receivedAt: string | null;
  receivedByName: string | null;
  cancelledAt: string | null;
  dateCreated: string;
}

/** Local del cliente con contrato vigente */
export interface PackageNoticeUnitOption {
  buildingId: string;
  buildingName: string;
  unitId: string;
  unitName: string;
}

export interface CreatePackageNoticeRequest {
  unitId: string;
  carrierCompany: string;
  itemDescription: string | null;
  /** "yyyy-MM-dd" */
  expectedDate: string;
}

export interface PackageNoticeFilter {
  buildingId?: string;
  state?: PackageNoticeStateValue;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Datos que recibe el modal 'package-notice-form' */
export interface PackageNoticeFormData {
  onSaved?: () => void;
}
