import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { timeout, TimeoutError } from 'rxjs';
import { PackageNoticeService } from '../../../core/services/package-notices/package-notice-service';
import {
  PACKAGE_NOTICE_LIMITS,
  PackageNoticeFormData,
  PackageNoticeUnitOption,
} from '../../../core/services/package-notices/package-notice-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

const REQUEST_TIMEOUT = 10_000;

/** Hoy (hora local) como "yyyy-MM-dd" */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Modal (cliente): avisar que llegará un paquete.
 * Solo se puede ligar a un local con contrato vigente.
 */
@Component({
  selector: 'app-package-notice-form',
  imports: [ReactiveFormsModule],
  templateUrl: './package-notice-form.html',
  styleUrl: './package-notice-form.css',
})
export class PackageNoticeForm implements OnInit {
  private fb = inject(FormBuilder);
  private packageNoticeService = inject(PackageNoticeService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  readonly limits = PACKAGE_NOTICE_LIMITS;
  readonly minDate = todayIso();

  units = signal<PackageNoticeUnitOption[]>([]);
  loadingUnits = signal(true);
  isSubmitting = signal(false);
  serverError = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    unitId: ['', [Validators.required]],
    carrierCompany: ['', [Validators.required, Validators.maxLength(PACKAGE_NOTICE_LIMITS.carrierCompany)]],
    itemDescription: ['', [Validators.maxLength(PACKAGE_NOTICE_LIMITS.itemDescription)]],
    expectedDate: [todayIso(), [Validators.required]],
  });

  private get data(): PackageNoticeFormData {
    return (this.modalService.state()?.data as PackageNoticeFormData | null) ?? {};
  }

  get descriptionCharsLeft(): number {
    return this.limits.itemDescription - this.form.controls.itemDescription.value.length;
  }

  ngOnInit(): void {
    this.packageNoticeService
      .getMyUnits()
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: (units) => {
          this.units.set(units);
          this.loadingUnits.set(false);
          if (units.length === 1) {
            this.form.controls.unitId.setValue(units[0].unitId);
          }
        },
        error: (ex) => {
          this.loadingUnits.set(false);
          this.serverError.set(this.errorMessage(ex, 'No se pudieron cargar tus locales'));
        },
      });
  }

  unitLabel(unit: PackageNoticeUnitOption): string {
    return `${unit.buildingName} · ${unit.unitName}`;
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.controls.expectedDate.value < this.minDate) {
      this.serverError.set('La fecha esperada no puede ser en el pasado');
      return;
    }

    this.isSubmitting.set(true);
    const v = this.form.getRawValue();

    this.packageNoticeService
      .create({
        unitId: v.unitId,
        carrierCompany: v.carrierCompany.trim(),
        itemDescription: v.itemDescription.trim() || null,
        expectedDate: v.expectedDate,
      })
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success('Aviso de paquete creado');
          const onSaved = this.data.onSaved;
          this.modalService.close();
          onSaved?.();
        },
        error: (ex) => {
          this.isSubmitting.set(false);
          const msg = this.errorMessage(ex, 'No se pudo crear el aviso');
          this.serverError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  cancel(): void {
    this.modalService.close();
  }

  private errorMessage(ex: unknown, fallback: string): string {
    if (ex instanceof TimeoutError) return 'La solicitud tardó demasiado, intenta de nuevo';
    return (ex as { error?: { message?: string } })?.error?.message ?? fallback;
  }
}
