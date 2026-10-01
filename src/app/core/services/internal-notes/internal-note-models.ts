// Bitácora interna (solo staff) — WebApi.DTOs.InternalNotes

// Domain.Contexts.PropertyContext.Enums.InternalNoteCategory (en requests viaja como número)
export enum InternalNoteCategory {
  General = 0,
  Call = 1,
  PaymentPromise = 2,
  Visit = 3,
  Message = 4,
  Agreement = 5,
}

/** Nombre del enum (como llega en las respuestas) → etiqueta en español */
export const INTERNAL_NOTE_CATEGORY_LABELS: Record<string, string> = {
  General: 'General',
  Call: 'Llamada',
  PaymentPromise: 'Promesa de pago',
  Visit: 'Visita',
  Message: 'Mensaje',
  Agreement: 'Acuerdo',
};

export const INTERNAL_NOTE_CATEGORY_OPTIONS: { value: InternalNoteCategory; label: string }[] = [
  { value: InternalNoteCategory.General, label: 'General' },
  { value: InternalNoteCategory.Call, label: 'Llamada' },
  { value: InternalNoteCategory.PaymentPromise, label: 'Promesa de pago' },
  { value: InternalNoteCategory.Visit, label: 'Visita' },
  { value: InternalNoteCategory.Message, label: 'Mensaje' },
  { value: InternalNoteCategory.Agreement, label: 'Acuerdo' },
];

// Respuesta de todos los endpoints de api/internal-notes
export interface InternalNoteResponse {
  id: string;
  tenantClientId: string;
  tenantClientName: string;
  unitContractId: string | null;
  unitNumber: string | null;
  category: keyof typeof InternalNoteCategory; // nombre del enum
  body: string;
  followUpDate: string | null;   // fecha de calendario (00:00Z) → mostrar con timezone 'UTC'
  isFollowUpDone: boolean;
  isFollowUpDue: boolean;        // pendiente con fecha de hoy o anterior
  isPinned: boolean;
  createdBy: string;
  createdByName: string | null;
  dateCreated: string;
  dateUpdated: string | null;
  canEdit: boolean;              // solo el autor (o SuperAdmin)
}

// POST api/internal-notes
export interface CreateInternalNoteRequest {
  tenantClientId: string;
  unitContractId: string | null;
  category: InternalNoteCategory;
  body: string;
  followUpDate: string | null;   // "yyyy-MM-dd"
}

// PUT api/internal-notes/{id}
export interface UpdateInternalNoteRequest {
  category: InternalNoteCategory;
  body: string;
  followUpDate: string | null;   // "yyyy-MM-dd"; null = quitar seguimiento
}

export const INTERNAL_NOTE_MAX_LENGTH = 2000;
