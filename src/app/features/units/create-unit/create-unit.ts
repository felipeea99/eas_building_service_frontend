import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UnitService } from '../../../core/services/units/unit-service';
import { BuildingService } from '../../../core/services/building/building-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { CreateUnitRequest, UnitType } from '../../../core/services/units/units-model';
import { GetBuildingsResponse } from '../../../core/services/building/building-models';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-create-unit',
  imports: [ReactiveFormsModule],
  templateUrl: './create-unit.html',
  styleUrl: './create-unit.css',
})
export class CreateUnit {
  private fb = inject(FormBuilder);
  private unitService = inject(UnitService);
  private buildingService = inject(BuildingService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private modalService = inject(ModalService);

  isLoading = signal(false);
  serverError = signal<string | null>(null);
  buildings = signal<GetBuildingsResponse[]>([]);
  loadingBuildings = signal(false);

  readonly unitTypes = [
    { value: UnitType.Apartment, label: 'Departamento' },
    { value: UnitType.Commercial, label: 'Comercial' },
    { value: UnitType.Office, label: 'Oficina' },
    { value: UnitType.Warehouse, label: 'Bodega' },
    { value: UnitType.Parking, label: 'Estacionamiento' },
    { value: UnitType.Storage, label: 'Almacén' },
    { value: UnitType.Other, label: 'Otro' },
  ];


  form = this.fb.nonNullable.group({
    buildingId: ['', [Validators.required]],
    unitName: ['', [Validators.required]],
    floor: [0, [Validators.required, Validators.min(0)]],
    section: ['', [Validators.required, Validators.maxLength(50)]],
    type: [UnitType.Apartment, [Validators.required]],
    areaSqm: [0, [Validators.required, Validators.min(1)]],
    baseRent: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.loadBuildings();
  }

  private loadBuildings(): void {
    this.loadingBuildings.set(true);
    this.buildingService.GetAllBuildings().subscribe({
      next: (data) => {
        this.buildings.set(data.items);
        this.loadingBuildings.set(false);
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al cargar los edificios');
        this.loadingBuildings.set(false);
      },
    });
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const v = this.form.getRawValue();
    const request: CreateUnitRequest = {
      buildingId: v.buildingId,
      unitName: v.unitName,
      floor: Number(v.floor),
      section: String(v.section).trim(),
      type: Number(v.type),
      areaSqm: Number(v.areaSqm),
      baseRent: Number(v.baseRent),
    };

    this.unitService.createUnit(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Unidad creada correctamente');
        if (this.modalService.isOpen()) {
          this.modalService.close();
        }
        this.form.reset();
      },
      error: (ex) => {
        this.isLoading.set(false);
        const msg = ex?.error?.message ?? 'Error al crear la unidad';
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
