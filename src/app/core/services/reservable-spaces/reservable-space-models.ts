import { PaginatedResponse } from "../../../shared/shared-models";

export enum ReservableSpaceType {
  MeetingRoom = 0,
  Rooftop = 1,
  EventArea = 2,
  Terrace = 3,
  Other = 4,
}

export const ReservableSpaceTypeLabels: Record<number, string> = {
  [ReservableSpaceType.MeetingRoom]: 'Sala de juntas',
  [ReservableSpaceType.Rooftop]: 'Rooftop',
  [ReservableSpaceType.EventArea]: 'Área de eventos',
  [ReservableSpaceType.Terrace]: 'Terraza',
  [ReservableSpaceType.Other]: 'Otro',
};

export enum ReservationRateType {
  PerReservation = 0,
  PerHour = 1,
  PerDay = 2,
}

export const ReservationRateTypeLabels: Record<number, string> = {
  [ReservationRateType.PerReservation]: 'Por reservación',
  [ReservationRateType.PerHour]: 'Por hora',
  [ReservationRateType.PerDay]: 'Por día',
};

// Domain.Contexts.PropertyContext.Enums.ReservationSlotUnit
export enum ReservationSlotUnit {
  Hour = 0,
  HalfHour = 1,
  FullDay = 2,
}

export const ReservationSlotUnitLabels: Record<number, string> = {
  [ReservationSlotUnit.Hour]: 'Por hora',
  [ReservationSlotUnit.HalfHour]: 'Por media hora',
  [ReservationSlotUnit.FullDay]: 'Día completo',
};

/** El GET regresa el nombre del enum (string) → enum numérico */
export const SLOT_UNIT_FROM_NAME: Record<string, ReservationSlotUnit> = {
  Hour: ReservationSlotUnit.Hour,
  HalfHour: ReservationSlotUnit.HalfHour,
  FullDay: ReservationSlotUnit.FullDay,
};

/** Duración del bloque en minutos (FullDay = toda la ventana, se calcula aparte) */
export const SLOT_MINUTES: Record<number, number | null> = {
  [ReservationSlotUnit.Hour]: 60,
  [ReservationSlotUnit.HalfHour]: 30,
  [ReservationSlotUnit.FullDay]: null,
};

// System.DayOfWeek (el backend lo manda como número; 0 = Domingo)
export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
}

/** Semana en orden Lunes → Domingo */
export const WEEK_DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: DayOfWeek.Monday, label: 'Lunes', short: 'Lun' },
  { value: DayOfWeek.Tuesday, label: 'Martes', short: 'Mar' },
  { value: DayOfWeek.Wednesday, label: 'Miércoles', short: 'Mié' },
  { value: DayOfWeek.Thursday, label: 'Jueves', short: 'Jue' },
  { value: DayOfWeek.Friday, label: 'Viernes', short: 'Vie' },
  { value: DayOfWeek.Saturday, label: 'Sábado', short: 'Sáb' },
  { value: DayOfWeek.Sunday, label: 'Domingo', short: 'Dom' },
];

export interface CreateReservableSpaceRequest {
  buildingId: string;
  name: string;
  type: ReservableSpaceType;
  capacity: number;
  hasCost: boolean;
  rate: number;
  requiresApproval: boolean;
  reservationRateType: ReservationRateType;
  imageFileS3?: File | null;
}

export interface CreateReservableSpaceResponse {
  reservableSpaceId: string;
}

export interface ReservableSpaceResponse {
  reservableSpaceId: string;
  buildingId: string;
  name: string;
  type: string;
  capacity: number;
  hasCost: boolean;
  rate: number;
  requiresApproval: boolean;
  status: boolean;
  reservationRateType: string;
  imageS3?: string;
  slotUnit: string;      // 'Hour' | 'HalfHour' | 'FullDay'
  hasSchedule: boolean;  // false = aún no tiene horario, no se puede reservar
}

export interface PaginatedReservableResponse {
  buildingId: string;
  buildingName: string;
  reservableSpaceResponses: PaginatedResponse<ReservableSpaceResponse>;
}

export interface ChangeStatusRequest {
  reservableSpaceId: string;
  isActive: boolean;
}

// ── Reservation Details ──

export interface CreateReservationRequest {
  reservableSpaceId: string;
  tenantClientId?: string;
  startTime: string;
  endTime: string;
  purpose?: string;
}

export interface CreateReservationResponse {
  id: string;
}

export interface GetReservableSpaceDetailsResponse {
  id: string;
  spaceName: string;
  tenantClientName: string;
  startTime: string;
  endTime: string;
  totalCost: number;
  status: string;
  purpose?: string;
}

// ── Schedule (horario semanal) ──

// PUT /api/reservable-space/{id}/schedule
export interface ScheduleDayRequest {
  dayOfWeek: DayOfWeek;
  openTime: string;  // 'HH:mm' hora local del edificio
  closeTime: string; // 'HH:mm'
}

export interface SetReservableSpaceScheduleRequest {
  slotUnit: ReservationSlotUnit;
  minSlots: number;
  maxSlots: number | null;
  maxAdvanceDays: number;
  days: ScheduleDayRequest[]; // los días que no vengan quedan cerrados
}

// GET /api/reservable-space/{id}/schedule
export interface ScheduleDayResponse {
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface GetReservableSpaceScheduleResponse {
  reservableSpaceId: string;
  spaceName: string;
  slotUnit: string;
  minSlots: number;
  maxSlots: number | null;
  maxAdvanceDays: number;
  timeZoneId: string;
  days: ScheduleDayResponse[]; // siempre los 7 días
}

// GET /api/reservable-space/{id}/available-slots?date=yyyy-MM-dd
export interface AvailableSlotResponse {
  localStart: string; // 'HH:mm' para mostrar
  localEnd: string;
  startUtc: string;   // para mandar al crear la reservación
  endUtc: string;
  isAvailable: boolean;
  reason: string | null; // 'Ocupado' | 'Ya pasó'
}

export interface GetAvailableSlotsResponse {
  reservableSpaceId: string;
  spaceName: string;
  date: string; // 'yyyy-MM-dd' día local del edificio
  timeZoneId: string;
  isOpen: boolean;
  slotUnit: string;
  openTime: string | null;
  closeTime: string | null;
  minSlots: number;
  maxSlots: number | null;
  slots: AvailableSlotResponse[];
}

// ── Update Reservable Space ──

export interface UpdateReservableSpaceRequest {
  reservableSpaceId: string;
  name: string;
  type: ReservableSpaceType;
  capacity: number;
  hasCost: boolean;
  rate: number;
  requiresApproval: boolean;
  reservationRateType: ReservationRateType;
  imageFileS3?: File | null;
}
