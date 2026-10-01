import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UnitService } from '../../../core/services/units/unit-service';
import { UpdateUnitRequest, UnitType, UnitStatus } from '../../../core/services/units/units-model';
import { UnitResponse } from '../../../core/services/building/building-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

const TYPE_FROM_LABEL: Record<string, UnitType> = {
  Apartment: UnitType.Apartment,
  Commercial: UnitType.Commercial,
  Office: UnitType.Office,
  Warehouse: UnitType.Warehouse,
  Parking: UnitType.Parking,
  Storage: UnitType.Storage,
  Other: UnitType.Other,
};

const STATUS_FROM_LABEL: Record<string, UnitStatus> = {
  Available: UnitStatus.Available,
  Occupied: UnitStatus.Occupied,
  Maintenance: UnitStatus.Maintenance,
  Reserved: UnitStatus.Reserved,
};

@Component({
  selector: 'app-edit-unit',
  imports: [ReactiveFormsModule],
  templateUrl: './edit-unit.html',
  styleUrl: './edit-unit.css',
})
export class EditUnit implements OnInit {
  private fb = inject(FormBuilder);
  private unitService = inject(UnitService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isSubmitting = signal(false);
  serverError = signal<string | null>(null);
  private unitId = '';

  readonly unitTypes = [
    { value: UnitType.Apartment, label: 'Departamento' },
    { value: UnitType.Commercial, label: 'Comercial' },
    { value: UnitType.Office, label: 'Oficina' },
    { value: UnitType.Warehouse, label: 'Bodega' },
    { value: UnitType.Parking, label: 'Estacionamiento' },
    { value: UnitType.Storage, label: 'Almacén' },
    { value: UnitType.Other, label: 'Otro' },
  ];

  /** Solo se puede cambiar manualmente entre Disponible y Mantenimiento */
  readonly editableStatuses = [
    { value: UnitStatus.Available, label: 'Disponible' },
    { value: UnitStatus.Maintenance, label: 'Mantenimiento' },
  ];

  private readonly allStatuses = [
    ...this.editableStatuses,
    { value: UnitStatus.Occupied, label: 'Ocupada' },
    { value: UnitStatus.Reserved, label: 'Reservada' },
  ];

  /** true si el local está Ocupado/Reservado: el estado lo controlan los contratos */
  statusLocked = signal(false);

  get unitStatuses() {
    return this.statusLocked() ? this.allStatuses : this.editableStatuses;
  }

  form = this.fb.nonNullable.group({
    unitName: ['', [Validators.required]],
    floor: [0, [Validators.required, Validators.min(0)]],
    section: ['', [Validators.required, Validators.maxLength(50)]],
    type: [UnitType.Apartment, [Validators.required]],
    status: [UnitStatus.Available, [Validators.required]],
    areaSqm: [0, [Validators.required, Validators.min(1)]],
    baseRent: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    // El listado de unidades (GetUnitsFromBuildingResponse) no incluye areaSqm,
    // así que ese campo no llega prellenado: hay que volver a capturarlo al editar.
    const data = this.modalService.state()?.data as (UnitResponse & { areaSqm?: number }) | null;
    if (data) {
      this.unitId = data.id;
      this.form.patchValue({
        unitName: data.unitName,
        floor: data.floor,
        section: data.section,
        type: TYPE_FROM_LABEL[data.type] ?? UnitType.Apartment,
        status: STATUS_FROM_LABEL[data.status] ?? UnitStatus.Available,
        areaSqm: data.areaSqm ?? 0,
        baseRent: data.baseRent,
      });

      const current = STATUS_FROM_LABEL[data.status] ?? UnitStatus.Available;
      if (current !== UnitStatus.Available && current !== UnitStatus.Maintenance) {
        this.statusLocked.set(true);
        this.form.controls.status.disable();
      }
    }
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const v = this.form.getRawValue();
    const request: UpdateUnitRequest = {
      unitId: this.unitId,
      unitName: v.unitName,
      floor: Number(v.floor),
      section: String(v.section).trim(),
      type: Number(v.type),
      status: Number(v.status),
      areaSqm: Number(v.areaSqm),
      baseRent: Number(v.baseRent),
    };

    this.unitService.updateUnit(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Unidad actualizada correctamente');
        if (this.modalService.isOpen()) {
          this.modalService.close();
        }
      },
      error: (ex) => {
        this.isSubmitting.set(false);
        const msg = ex?.error?.message ?? 'Error al actualizar la unidad';
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
