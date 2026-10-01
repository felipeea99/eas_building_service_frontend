// Incidencias de inquilinos y lista de morosos (solo staff) — WebApi.DTOs.Incidents
import { PaginationParams } from '../../../shared/shared-models';

// Domain.Contexts.PropertyContext.Enums.IncidentCategory (en requests viaja como número)
export enum IncidentCategory {
  PagoTardio = 1,
  AdeudoSinPagar = 2,
  ProblemaConVecinos = 3,
  RuidoOMolestias = 4,
  DanioAInstalaciones = 5,
  IncumplimientoReglamento = 6,
  UsoIndebidoAreasComunes = 7,
  Otro = 8,
}

/** Catálogo local (igual al de GET api/incidents/categories) */
export const INCIDENT_CATEGORY_OPTIONS: { value: IncidentCategory; label: string }[] = [
  { value: IncidentCategory.PagoTardio, label: 'Pago tardío' },
  { value: IncidentCategory.AdeudoSinPagar, label: 'Adeudo sin pagar' },
  { value: IncidentCategory.ProblemaConVecinos, label: 'Problema con vecinos' },
  { value: IncidentCategory.RuidoOMolestias, label: 'Ruido o molestias' },
  { value: IncidentCategory.DanioAInstalaciones, label: 'Daño a instalaciones' },
  { value: IncidentCategory.IncumplimientoReglamento, label: 'Incumplimiento de reglamento' },
  { value: IncidentCategory.UsoIndebidoAreasComunes, label: 'Uso indebido de áreas comunes' },
  { value: IncidentCategory.Otro, label: 'Otro' },
];

export const INCIDENT_LIMITS = {
  otherTitle: 150,
  description: 2000,
  resolutionNotes: 1000,
} as const;

// GET api/incidents/categories
export interface IncidentCategoryResponse {
  value: number;
  name: string;
  label: string;
  requiresTitle: boolean;
}

// Respuesta de GET {id}, GET (lista), POST, PUT, resolve, reopen
export interface IncidentResponse {
  id: string;
  tenantClientId: string;
  tenantClientName: string;
  unitContractId: string | null;
  unitNumber: string | null;
  buildingId: string | null;
  buildingName: string | null;
  categoryValue: IncidentCategory;
  category: string;          // nombre del enum
  categoryLabel: string;     // texto en español
  otherTitle: string | null;
  title: string;             // OtherTitle si es "Otro", si no la etiqueta
  description: string;
  occurredAt: string;        // fecha de calendario (00:00Z) → mostrar con timezone 'UTC'
  amount: number | null;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedByName: string | null;
  resolutionNotes: string | null;
  createdBy: string;
  createdByName: string | null;
  dateCreated: string;
}

// GET api/incidents/clients-summary (lista de morosos: un renglón por cliente)
export interface TenantClientIncidentSummaryResponse {
  tenantClientId: string;
  tenantClientName: string;
  email: string;
  phoneNumber: string;
  totalIncidents: number;
  openIncidents: number;
  openAmount: number;
  lastOccurredAt: string;
  byCategory: IncidentCategoryCount[];
}

export interface IncidentCategoryCount {
  categoryValue: IncidentCategory;
  category: string;
  label: string;
  total: number;
  open: number;
}

// Filtros de GET api/incidents
export interface IncidentFilter extends PaginationParams {
  buildingId?: string;
  tenantClientId?: string;
  category?: IncidentCategory;
  isResolved?: boolean;
  from?: string;   // "yyyy-MM-dd"
  to?: string;     // "yyyy-MM-dd"
}

// Filtros de GET api/incidents/clients-summary
export interface IncidentSummaryFilter extends PaginationParams {
  buildingId?: string;
  category?: IncidentCategory;
  onlyOpen?: boolean;   // default true en el backend
}

// POST api/incidents
export interface CreateIncidentRequest {
  tenantClientId: string;
  unitContractId: string | null;   // si se manda, el edificio se toma del contrato
  buildingId: string | null;
  category: IncidentCategory;
  otherTitle: string | null;       // obligatorio solo si category = Otro
  description: string;
  occurredAt: string;              // "yyyy-MM-dd" (no futura)
  amount: number | null;
}

// PUT api/incidents/{id}
export interface UpdateIncidentRequest {
  category: IncidentCategory;
  otherTitle: string | null;
  description: string;
  occurredAt: string;
  amount: number | null;
}

// PATCH api/incidents/{id}/resolve
export interface ResolveIncidentRequest {
  resolutionNotes: string | null;
}
