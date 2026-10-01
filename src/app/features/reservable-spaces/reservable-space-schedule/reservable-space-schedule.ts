import { Component, inject, signal, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { timeout, TimeoutError } from 'rxjs';
import { ReservableSpaceService } from '../../../core/services/reservable-spaces/reservable-spaces';
import {
  DayOfWeek,
  ReservableSpaceResponse,
  ReservationSlotUnit,
  ReservationSlotUnitLabels,
  SetReservableSpaceScheduleRequest,
  SLOT_MINUTES,
  SLOT_UNIT_FROM_NAME,
  WEEK_DAYS,
} from '../../../core/services/reservable-spaces/reservable-space-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

type DayForm = FormGroup<{
  dayOfWeek: FormControl<DayOfWeek>;
  isOpen: FormControl<boolean>;
  openTime: FormControl<string>;
  closeTime: FormControl<string>;
}>;

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Modal: horario semanal de un espacio reservable.
 * Las horas son locales del edificio. Los días que no estén abiertos quedan cerrados.
 */
@Component({
  selector: 'app-reservable-space-schedule',
  imports: [ReactiveFormsModule],
  templateUrl: './reservable-space-schedule.html',
  styleUrl: './reservable-space-schedule.css',
})
export class ReservableSpaceSchedule implements OnInit {
  private fb = inject(FormBuilder);
  private reservableSpaceService = inject(ReservableSpaceService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  readonly weekDays = WEEK_DAYS;
  readonly SlotUnit = ReservationSlotUnit;
  readonly slotUnits = Object.entries(ReservationSlotUnitLabels).map(([value, label]) => ({
    value: Number(value) as ReservationSlotUnit,
    label,
  }));

  isLoading = signal(true);
  isSubmitting = signal(false);
  serverError = signal<string | null>(null);
  spaceName = signal('');
  private spaceId = '';

  form = this.fb.nonNullable.group({
    slotUnit: [ReservationSlotUnit.Hour as ReservationSlotUnit, [Validators.required]],
    minSlots: [1, [Validators.required, Validators.min(1)]],
    maxSlots: this.fb.control<number | null>(null, [Validators.min(1)]),
    maxAdvanceDays: [30, [Validators.required, Validators.min(0), Validators.max(365)]],
    days: this.fb.array<DayForm>(WEEK_DAYS.map((d) => this.createDay(d.value))),
  });

  get days(): FormArray<DayForm> {
    return this.form.controls.days;
  }

  get isFullDay(): boolean {
    return Number(this.form.controls.slotUnit.value) === ReservationSlotUnit.FullDay;
  }

  ngOnInit(): void {
    const data = this.modalService.state()?.data as ReservableSpaceResponse | null;

    if (!data?.reservableSpaceId) {
      this.isLoading.set(false);
      this.serverError.set('No se recibió el espacio reservable');
      return;
    }

    this.spaceId = data.reservableSpaceId;
    this.spaceName.set(data.name);

    this.reservableSpaceService
      .getSchedule(this.spaceId)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (res) => {
          this.form.patchValue({
            slotUnit: SLOT_UNIT_FROM_NAME[res.slotUnit] ?? ReservationSlotUnit.Hour,
            minSlots: res.minSlots,
            maxSlots: res.maxSlots,
            maxAdvanceDays: res.maxAdvanceDays,
          });

          for (const day of res.days) {
            const control = this.days.controls.find((c) => c.controls.dayOfWeek.value === day.dayOfWeek);
            control?.patchValue({
              isOpen: day.isOpen,
              openTime: day.openTime?.slice(0, 5) ?? '09:00',
              closeTime: day.closeTime?.slice(0, 5) ?? '18:00',
            });
          }

          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          const msg = this.errorMessage(ex, 'Error al cargar el horario');
          this.serverError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  /** Por día completo solo existe un bloque */
  onSlotUnitChange(): void {
    if (this.isFullDay) {
      this.form.patchValue({ minSlots: 1, maxSlots: null });
    }
  }

  /** Copia el horario del lunes a los demás días abiertos */
  copyMondayToOpenDays(): void {
    const monday = this.days.at(0).getRawValue();
    this.days.controls.forEach((control, index) => {
      if (index > 0 && control.controls.isOpen.value) {
        control.patchValue({ openTime: monday.openTime, closeTime: monday.closeTime });
      }
    });
  }

  dayError(index: number): string | null {
    const day = this.days.at(index).getRawValue();
    if (!day.isOpen) return null;

    const open = this.toMinutes(day.openTime);
    const close = this.toMinutes(day.closeTime);

    if (open === null || close === null) return 'Indica la hora de apertura y cierre';
    if (close <= open) return 'El cierre debe ser después de la apertura';

    const slot = SLOT_MINUTES[Number(this.form.controls.slotUnit.value)];
    if (slot && (close - open) % slot !== 0) {
      return `La ventana no se divide exacta en bloques de ${slot} min`;
    }

    return null;
  }

  /** Ej. "9 bloques · el último inicia 17:00" */
  dayPreview(index: number): string | null {
    const day = this.days.at(index).getRawValue();
    if (!day.isOpen || this.dayError(index)) return null;

    const open = this.toMinutes(day.openTime)!;
    const close = this.toMinutes(day.closeTime)!;
    const slot = SLOT_MINUTES[Number(this.form.controls.slotUnit.value)];

    if (!slot) {
      return `Un bloque: ${day.openTime} – ${day.closeTime}`;
    }

    const count = (close - open) / slot;
    return `${count} ${count === 1 ? 'bloque' : 'bloques'} · el último inicia ${this.fromMinutes(close - slot)}`;
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const openDays = v.days.filter((d) => d.isOpen);

    if (openDays.length === 0) {
      this.toast.warning('Marca al menos un día abierto');
      return;
    }

    if (this.days.controls.some((_, i) => this.dayError(i) !== null)) {
      this.toast.warning('Revisa los horarios marcados en rojo');
      return;
    }

    const minSlots = Number(v.minSlots);
    const maxSlots = v.maxSlots === null || v.maxSlots === undefined || `${v.maxSlots}` === '' ? null : Number(v.maxSlots);

    if (maxSlots !== null && maxSlots < minSlots) {
      this.toast.warning('El máximo de bloques no puede ser menor al mínimo');
      return;
    }

    const request: SetReservableSpaceScheduleRequest = {
      slotUnit: Number(v.slotUnit) as ReservationSlotUnit,
      minSlots,
      maxSlots: this.isFullDay ? null : maxSlots,
      maxAdvanceDays: Number(v.maxAdvanceDays),
      days: openDays.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        openTime: d.openTime,
        closeTime: d.closeTime,
      })),
    };

    this.isSubmitting.set(true);

    this.reservableSpaceService
      .setSchedule(this.spaceId, request)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success(`Horario de ${this.spaceName()} guardado`);
          this.modalService.close();
        },
        error: (ex) => {
          this.isSubmitting.set(false);
          const msg = this.errorMessage(ex, 'Error al guardar el horario');
          this.serverError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  private createDay(dayOfWeek: DayOfWeek): DayForm {
    return this.fb.nonNullable.group({
      dayOfWeek: [dayOfWeek],
      isOpen: [false],
      openTime: ['09:00'],
      closeTime: ['18:00'],
    });
  }

  private toMinutes(value: string): number | null {
    const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  private fromMinutes(total: number): string {
    const h = Math.floor(total / 60).toString().padStart(2, '0');
    const m = (total % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private errorMessage(ex: unknown, fallback: string): string {
    if (ex instanceof TimeoutError) return 'La solicitud tardó demasiado, intenta de nuevo';
    return (ex as { error?: { message?: string } })?.error?.message ?? fallback;
  }
}
