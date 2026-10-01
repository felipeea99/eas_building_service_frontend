import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContractService } from '../../../core/services/contracts/contract-service';
import { CreateContractRequest, ContractType } from '../../../core/services/contracts/contract-models';
import { UnitService } from '../../../core/services/units/unit-service';
import { UnitResponse } from '../../../core/services/building/building-models';
import { TenantClientService } from '../../../core/services/tenant-clients/tenant-client-service';
import { TenantClientResponse } from '../../../core/services/tenant-clients/tenant-client-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-create-contract',
  imports: [ReactiveFormsModule],
  templateUrl: './create-contract.html',
  styleUrl: './create-contract.css',
})
export class CreateContract implements OnInit {
  private fb = inject(FormBuilder);
  private contractService = inject(ContractService);
  private unitService = inject(UnitService);
  private tenantClientService = inject(TenantClientService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isSubmitting = signal(false);
  serverError = signal<string | null>(null);

  units = signal<UnitResponse[]>([]);
  clients = signal<TenantClientResponse[]>([]);

  loadingUnits = signal(false);
  loadingClients = signal(false);

  selectedFile = signal<File | null>(null);

  private buildingId = '';

  readonly contractTypes = [
    { value: ContractType.Fixed, label: 'Fijo' },
    { value: ContractType.Monthly, label: 'Mensual' },
    { value: ContractType.Annual, label: 'Anual' },
    { value: ContractType.Temporary, label: 'Temporal' },
  ];

  form = this.fb.nonNullable.group({
    unitId: ['', [Validators.required]],
    tenantClientId: ['', [Validators.required]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    monthlyRent: [0, [Validators.required, Validators.min(0)]],
    contractType: [ContractType.Monthly, [Validators.required]],
  });

  ngOnInit(): void {
    const data = this.modalService.state()?.data as { buildingId?: string } | null;
    this.buildingId = data?.buildingId ?? '';

    if (this.buildingId) {
      this.loadUnits(this.buildingId);
      this.loadClients(this.buildingId);
    }
  }

  private loadUnits(buildingId: string): void {
    this.loadingUnits.set(true);
    this.unitService.getUnitsAvailableByBuilding(buildingId, 1, 200).subscribe({
      next: (res) => {
        this.units.set(res.items);
        this.loadingUnits.set(false);
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al cargar las unidades');
        this.loadingUnits.set(false);
      },
    });
  }

  private loadClients(buildingId: string): void {
    this.loadingClients.set(true);
    this.tenantClientService.getAllByBuilding(buildingId, 1, 200).subscribe({
      next: (res) => {
        this.clients.set(res.items);
        this.loadingClients.set(false);
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al cargar los clientes');
        this.loadingClients.set(false);
      },
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const v = this.form.getRawValue();
    const request: CreateContractRequest = {
      unitId: v.unitId,
      tenantClientId: v.tenantClientId,
      startDate: v.startDate,
      endDate: v.endDate,
      monthlyRent: Number(v.monthlyRent),
      contractType: Number(v.contractType),
    };

    const file = this.selectedFile();
    const call$ = file
      ? this.contractService.createWithDocument(request, file)
      : this.contractService.create(request);

    call$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Contrato creado correctamente');
        if (this.modalService.isOpen()) {
          this.modalService.close();
        }
      },
      error: (ex) => {
        this.isSubmitting.set(false);
        const msg = ex?.error?.message ?? 'Error al crear el contrato';
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
