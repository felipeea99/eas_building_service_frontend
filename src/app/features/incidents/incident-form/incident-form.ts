import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Observable, timeout, TimeoutError } from 'rxjs';
import { IncidentService } from '../../../core/services/incidents/incident-service';
import {
  INCIDENT_CATEGORY_OPTIONS,
  INCIDENT_LIMITS,
  IncidentCategory,
  IncidentResponse,
} from '../../../core/services/incidents/incident-models';
import { TenantClientService } from '../../../core/services/tenant-clients/tenant-client-service';
import { TenantClientResponse } from '../../../core/services/tenant-clients/tenant-client-models';
import { ContractService } from '../../../core/services/contracts/contract-service';
import { TenantClientContractItem } from '../../../core/services/contracts/contract-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

/** Datos que recibe desde el modal */
export interface IncidentFormModalData {
  /** Edificio actual (para listar clientes y contratos). Opcional si se abre desde un cliente. */
  buildingId?: string | null;
  /** Cliente fijo (cuando se abre desde la ficha del inquilino) */
  tenantClientId?: string;
  tenantClientName?: string;
  /** Si viene, el formulario edita esa incidencia */
  incident?: IncidentResponse;
}

const REQUEST_TIMEOUT = 10_000;

/** Hoy (hora local) como "yyyy-MM-dd" */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Modal: registrar o editar una incidencia.
 * Al editar, el cliente y el contrato no cambian (el backend no lo permite).
 */
@Component({
  selector: 'app-incident-form',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './incident-form.html',
  styleUrl: './incident-form.css',
})
export class IncidentForm implements OnInit {
  private fb = inject(FormBuilder);
  private incidentService = inject(IncidentService);
  private tenantClientService = inject(TenantClientService);
  private contractService = inject(ContractService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  readonly categoryOptions = INCIDENT_CATEGORY_OPTIONS;
  readonly limits = INCIDENT_LIMITS;
  readonly maxDate = todayIso();

  isSubmitting = signal(false);
  serverError = signal<string | null>(null);

  editing = signal<IncidentResponse | null>(null);
  buildingId: string | null = null;
  fixedClientName = signal<string | null>(null);

  clients = signal<TenantClientResponse[]>([]);
  contracts = signal<TenantClientContractItem[]>([]);
  loadingClients = signal(false);
  loadingContracts = signal(false);

  form = this.fb.nonNullable.group({
    tenantClientId: ['', [Validators.required]],
    unitContractId: [''],
    category: [IncidentCategory.PagoTardio as IncidentCategory, [Validators.required]],
    otherTitle: ['', [Validators.maxLength(INCIDENT_LIMITS.otherTitle)]],
    occurredAt: [todayIso(), [Validators.required]],
    amount: [null as number | null, [Validators.min(0)]],
    description: ['', [Validators.required, Validators.maxLength(INCIDENT_LIMITS.description)]],
  });

  ngOnInit(): void {
    const data = (this.modalService.state()?.data ?? {}) as IncidentFormModalData;
    this.buildingId = data.buildingId ?? null;

    // título obligatorio solo con "Otro"
    this.form.controls.category.valueChanges.subscribe(() => this.updateTitleValidators());

    if (data.incident) {
      this.startEdit(data.incident);
      return;
    }

    if (data.tenantClientId) {
      this.fixedClientName.set(data.tenantClientName ?? '');
      this.form.controls.tenantClientId.setValue(data.tenantClientId);
      this.loadContracts(data.tenantClientId);
    } else if (this.buildingId) {
      this.loadClients(this.buildingId);
    }

    this.form.controls.tenantClientId.valueChanges.subscribe((clientId) => {
      this.form.controls.unitContractId.setValue('');
      this.contracts.set([]);
      if (clientId) this.loadContracts(clientId);
    });
  }

  get isOther(): boolean {
    return Number(this.form.controls.category.value) === IncidentCategory.Otro;
  }

  get descriptionCharsLeft(): number {
    return this.limits.description - (this.form.controls.description.value?.length ?? 0);
  }

  private startEdit(incident: IncidentResponse): void {
    this.editing.set(incident);
    this.fixedClientName.set(incident.tenantClientName);
    this.form.patchValue({
      tenantClientId: incident.tenantClientId,
      unitContractId: incident.unitContractId ?? '',
      category: incident.categoryValue,
      otherTitle: incident.otherTitle ?? '',
      occurredAt: incident.occurredAt.substring(0, 10),
      amount: incident.amount,
      description: incident.description,
    });
    this.updateTitleValidators();
  }

  private updateTitleValidators(): void {
    const control = this.form.controls.otherTitle;
    control.setValidators(
      this.isOther
        ? [Validators.required, Validators.maxLength(INCIDENT_LIMITS.otherTitle)]
        : [Validators.maxLength(INCIDENT_LIMITS.otherTitle)],
    );
    control.updateValueAndValidity({ emitEvent: false });
  }

  private loadClients(buildingId: string): void {
    this.loadingClients.set(true);
    this.tenantClientService
      .getAllByBuilding(buildingId, 1, 200)
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: (res) => {
          this.clients.set(res.items.filter((client) => client.status));
          this.loadingClients.set(false);
        },
        error: (ex) => {
          this.loadingClients.set(false);
          this.toast.error(this.errorMessage(ex, 'Error al cargar los clientes'));
        },
      });
  }

  private loadContracts(tenantClientId: string): void {
    this.loadingContracts.set(true);
    this.contractService
      .getContractsByTenantClient(tenantClientId)
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: (res) => {
          // solo contratos del edificio actual (si hay edificio)
          this.contracts.set(
            this.buildingId ? res.contracts.filter((c) => c.buildingId === this.buildingId) : res.contracts,
          );
          this.loadingContracts.set(false);
        },
        error: () => {
          // el contrato es opcional: si falla solo se queda sin opciones
          this.loadingContracts.set(false);
        },
      });
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid || !this.form.controls.description.value.trim()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const category = Number(v.category) as IncidentCategory;
    const otherTitle = category === IncidentCategory.Otro ? v.otherTitle.trim() || null : null;
    const amount = v.amount === null || (v.amount as unknown) === '' ? null : Number(v.amount);
    const editing = this.editing();

    const request$: Observable<IncidentResponse> = editing
      ? this.incidentService.update(editing.id, {
          category,
          otherTitle,
          description: v.description.trim(),
          occurredAt: v.occurredAt,
          amount,
        })
      : this.incidentService.create({
          tenantClientId: v.tenantClientId,
          unitContractId: v.unitContractId || null,
          buildingId: v.unitContractId ? null : this.buildingId,
          category,
          otherTitle,
          description: v.description.trim(),
          occurredAt: v.occurredAt,
          amount,
        });

    this.isSubmitting.set(true);

    request$.pipe(timeout(REQUEST_TIMEOUT)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success(editing ? 'Incidencia actualizada' : 'Incidencia registrada');
        this.modalService.close();
      },
      error: (ex) => {
        this.isSubmitting.set(false);
        const msg = this.errorMessage(ex, editing ? 'Error al actualizar la incidencia' : 'Error al registrar la incidencia');
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }

  cancel(): void {
    this.modalService.close();
  }

  getContractLabel(contract: TenantClientContractItem): string {
    return `${contract.unitNumber} · ${contract.isCurrent ? 'vigente' : contract.contractStatus === 'Cancelled' ? 'cancelado' : 'histórico'}`;
  }

  private errorMessage(ex: unknown, fallback: string): string {
    if (ex instanceof TimeoutError) return 'La solicitud tardó demasiado, intenta de nuevo';
    return (ex as { error?: { message?: string } })?.error?.message ?? fallback;
  }
}
