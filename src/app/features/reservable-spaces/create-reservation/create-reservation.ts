import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { timeout, TimeoutError } from 'rxjs';
import { ReservableSpaceDetailsService } from '../../../core/services/reservable-spaces/reservable-space-details';
import { ReservableSpaceService } from '../../../core/services/reservable-spaces/reservable-spaces';
import {
  CreateReservationRequest,
  GetAvailableSlotsResponse,
  ReservableSpaceResponse,
  GetReservableSpaceScheduleResponse,
  ReservationSlotUnitLabels,
  SLOT_UNIT_FROM_NAME,
  WEEK_DAYS,
} from '../../../core/services/reservable-spaces/reservable-space-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Modal: nueva reservación.
 * Flujo: espacio → día → bloques disponibles (según el horario del espacio) → propósito.
 * Se mandan startUtc / endUtc tal como los regresa el backend.
 */
@Component({
  selector: 'app-create-reservation',
  imports: [ReactiveFormsModule],
  templateUrl: './create-reservation.html',
  styleUrl: './create-reservation.css',
})
export class CreateReservation {
  private fb = inject(FormBuilder);
  private detailsService = inject(ReservableSpaceDetailsService);
  private spaceService = inject(ReservableSpaceService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isCreating = signal(false);
  isLoadingSchedule = signal(false);
  isLoadingSlots = signal(false);

  schedule = signal<GetReservableSpaceScheduleResponse | null>(null);
  availability = signal<GetAvailableSlotsResponse | null>(null);
  startIndex = signal<number | null>(null);
  endIndex = signal<number | null>(null);

  form = this.fb.nonNullable.group({
    spaceId: ['', [Validators.required]],
    date: ['', [Validators.required]],
    purpose: [''],
  });

  /** Hoy en la zona del navegador (el backend valida con la zona del edificio) */
  readonly minDate = this.toDateInput(new Date());

  maxDate = computed(() => {
    const s = this.schedule();
    if (!s) return '';
    const d = new Date();
    d.setDate(d.getDate() + s.maxAdvanceDays);
    return this.toDateInput(d);
  });

  /** Ej. "Lun, Mar, Mié, Jue, Vie" */
  openDaysLabel = computed(() => {
    const s = this.schedule();
    if (!s) return '';
    return WEEK_DAYS
      .filter((w) => s.days.some((d) => d.dayOfWeek === w.value && d.isOpen))
      .map((w) => w.short)
      .join(', ');
  });

  selectedCount = computed(() => {
    const s = this.startIndex();
    const e = this.endIndex();
    return s === null || e === null ? 0 : e - s + 1;
  });

  selectionLabel = computed(() => {
    const slots = this.availability()?.slots ?? [];
    const s = this.startIndex();
    const e = this.endIndex();
    if (s === null || e === null || !slots[s] || !slots[e]) return '';
    return `${slots[s].localStart} – ${slots[e].localEnd}`;
  });

  hasAvailableSlots = computed(() => (this.availability()?.slots ?? []).some((s) => s.isAvailable));

  /** Solo espacios activos y con horario configurado */
  get spaces(): ReservableSpaceResponse[] {
    const data = this.modalService.state()?.data as { spaces?: ReservableSpaceResponse[] } | null;
    return (data?.spaces ?? []).filter((s) => s.status && s.hasSchedule);
  }

  get hiddenSpacesCount(): number {
    const data = this.modalService.state()?.data as { spaces?: ReservableSpaceResponse[] } | null;
    return (data?.spaces ?? []).length - this.spaces.length;
  }

  getSlotUnitLabel(slotUnit: string | undefined): string {
    const unit = slotUnit ? SLOT_UNIT_FROM_NAME[slotUnit] : undefined;
    return unit === undefined ? '' : ReservationSlotUnitLabels[unit];
  }

  onSpaceChange(): void {
    this.schedule.set(null);
    this.resetSlots();

    const spaceId = this.form.controls.spaceId.value;
    if (!spaceId) return;

    this.isLoadingSchedule.set(true);
    this.spaceService
      .getSchedule(spaceId)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (res) => {
          this.schedule.set(res);
          this.isLoadingSchedule.set(false);
          this.loadSlots();
        },
        error: (ex) => {
          this.isLoadingSchedule.set(false);
          this.toast.error(this.errorMessage(ex, 'Error al cargar el horario del espacio'));
        },
      });
  }

  onDateChange(): void {
    this.resetSlots();
    this.loadSlots();
  }

  onSlotClick(index: number): void {
    const slots = this.availability()?.slots ?? [];
    if (!slots[index]?.isAvailable) return;

    const s = this.startIndex();
    const e = this.endIndex();

    // mismo bloque seleccionado → deseleccionar
    if (s === index && e === index) {
      this.startIndex.set(null);
      this.endIndex.set(null);
      return;
    }

    // nueva selección: no hay inicio, ya hay un rango, o se eligió antes del inicio
    if (s === null || e === null || s !== e || index < s) {
      this.startIndex.set(index);
      this.endIndex.set(index);
      return;
    }

    // extender el rango s → index: todos los bloques intermedios deben estar libres
    const range = slots.slice(s, index + 1);
    if (!range.every((slot) => slot.isAvailable)) {
      this.startIndex.set(index);
      this.endIndex.set(index);
      return;
    }

    const max = this.availability()?.maxSlots ?? null;
    if (max !== null && range.length > max) {
      this.toast.warning(`Solo puedes reservar máximo ${max} ${max === 1 ? 'bloque' : 'bloques'} seguidos`);
      return;
    }

    this.endIndex.set(index);
  }

  isSelected(index: number): boolean {
    const s = this.startIndex();
    const e = this.endIndex();
    return s !== null && e !== null && index >= s && index <= e;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Selecciona el espacio y el día');
      return;
    }

    const slots = this.availability()?.slots ?? [];
    const s = this.startIndex();
    const e = this.endIndex();

    if (s === null || e === null || !slots[s] || !slots[e]) {
      this.toast.warning('Selecciona el horario de la reservación');
      return;
    }

    const min = this.availability()?.minSlots ?? 1;
    if (this.selectedCount() < min) {
      this.toast.warning(`Debes reservar mínimo ${min} ${min === 1 ? 'bloque' : 'bloques'}`);
      return;
    }

    const v = this.form.getRawValue();
    const request: CreateReservationRequest = {
      reservableSpaceId: v.spaceId,
      startTime: slots[s].startUtc,
      endTime: slots[e].endUtc,
      purpose: v.purpose.trim() || undefined,
    };

    this.isCreating.set(true);

    this.detailsService
      .create(request)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: () => {
          this.toast.success('Reservación creada exitosamente');
          this.isCreating.set(false);
          this.modalService.close();
        },
        error: (ex) => {
          this.isCreating.set(false);
          this.toast.error(this.errorMessage(ex, 'Error al crear la reservación'));
          // el horario pudo cambiar (alguien más reservó): refrescar bloques
          this.resetSlots();
          this.loadSlots();
        },
      });
  }

  private loadSlots(): void {
    const { spaceId, date } = this.form.getRawValue();
    if (!spaceId || !date || !this.schedule()) return;

    this.isLoadingSlots.set(true);
    this.spaceService
      .getAvailableSlots(spaceId, date)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (res) => {
          this.availability.set(res);
          this.isLoadingSlots.set(false);
        },
        error: (ex) => {
          this.isLoadingSlots.set(false);
          this.toast.error(this.errorMessage(ex, 'Error al cargar los horarios disponibles'));
        },
      });
  }

  private resetSlots(): void {
    this.availability.set(null);
    this.startIndex.set(null);
    this.endIndex.set(null);
  }

  private toDateInput(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private errorMessage(ex: unknown, fallback: string): string {
    if (ex instanceof TimeoutError) return 'La solicitud tardó demasiado, intenta de nuevo';
    return (ex as { error?: { message?: string } })?.error?.message ?? fallback;
  }
}
