import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ContractService } from '../../../core/services/contracts/contract-service';
import { GetContractsResponse } from '../../../core/services/contracts/contract-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { Toolbar, ToolbarFilter, ToolbarFilterChange } from '../../../shared/toolbar/toolbar';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { BuildingContextService } from '../../../core/services/building/building-context-service';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-index-contracts',
  imports: [DecimalPipe, DatePipe, Toolbar],
  templateUrl: './index-contracts.html',
  styleUrl: './index-contracts.css',
})
export class IndexContracts implements OnInit {
  private contractService = inject(ContractService);
  private toast = inject(ToastService);
  private breadcrumbService = inject(BreadcrumbService);
  private buildingContext = inject(BuildingContextService);
  private modalService = inject(ModalService);
  private route = inject(ActivatedRoute);

  contracts = signal<GetContractsResponse[]>([]);
  filteredContracts = signal<GetContractsResponse[]>([]);
  isLoading = signal(true);
  private searchTerm = '';
  private activeFilters: Record<string, string> = {};
  private buildingId = '';
  private pendingReload = false;

  constructor() {
    effect(() => {
      const open = this.modalService.isOpen();
      if (!open && this.pendingReload) {
        this.pendingReload = false;
        this.loadContracts();
      }
    });
  }

  readonly toolbarFilters: ToolbarFilter[] = [
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'PendingStart', label: 'Por iniciar' },
        { value: 'Active', label: 'Activo' },
        { value: 'ExpiringSoon', label: 'Por vencer' },
        { value: 'Expired', label: 'Vencido' },
        { value: 'Cancelled', label: 'Cancelado' },
      ],
    },
  ];

  ngOnInit(): void {
    this.buildingId = this.route.snapshot.paramMap.get('buildingId') ?? '';

    const bc = this.buildingContext.current();
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
      ...(bc ? [{ label: bc.name, path: `/building-dashboard/${bc.id}` }] : []),
      { label: 'Contratos', path: `/contracts/${this.buildingId}` },
    ]);

    this.loadContracts();
  }

  loadContracts(): void {
    if (!this.buildingId) return;

    this.isLoading.set(true);
    this.contractService.getContractsByBuilding(this.buildingId, 1, 100).subscribe({
      next: (res) => {
        this.contracts.set(res.items);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (ex) => {
        this.isLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al cargar los contratos');
      },
    });
  }

  onAddContract(): void {
    this.pendingReload = true;
    this.modalService.open('create-contract', { buildingId: this.buildingId });
  }

  onSearch(term: string): void {
    this.searchTerm = term.toLowerCase();
    this.applyFilters();
  }

  onFilterChange(change: ToolbarFilterChange): void {
    if (change.value) {
      this.activeFilters[change.key] = change.value;
    } else {
      delete this.activeFilters[change.key];
    }
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = this.contracts();

    if (this.searchTerm) {
      result = result.filter(c =>
        (c.unitNumber ?? '').toLowerCase().includes(this.searchTerm) ||
        (c.tenantClientName ?? '').toLowerCase().includes(this.searchTerm)
      );
    }

    if (this.activeFilters['status']) {
      result = result.filter(c => c.contractStatus === this.activeFilters['status']);
    }

    this.filteredContracts.set(result);
  }

  uploadDocument(contract: GetContractsResponse): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      this.contractService.uploadDocument(contract.id, file).subscribe({
        next: () => {
          this.toast.success('Documento subido correctamente');
          this.loadContracts();
        },
        error: (ex) => {
          this.toast.error(ex?.error?.message ?? 'Error al subir el documento');
        },
      });
    };
    input.click();
  }

  viewDocument(contract: GetContractsResponse): void {
    this.contractService.getContractById(contract.id).subscribe({
      next: (res) => {
        if (res.documentUrl) {
          window.open(res.documentUrl, '_blank', 'noopener');
        } else {
          this.toast.error('Este contrato no tiene documento');
        }
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al obtener el contrato');
      },
    });
  }

  cancelContract(contract: GetContractsResponse): void {
    this.modalService.confirm({
      title: 'Cancelar contrato',
      message: `¿Estás seguro de cancelar el contrato de la unidad ${contract.unitNumber}? Esta acción no se puede deshacer.`,
      placeholder: 'Motivo de cancelación...',
      confirmLabel: 'Sí, cancelar',
      destructive: true,
      onConfirm: (reason) => {
        this.contractService.cancel(contract.id, reason).subscribe({
          next: () => {
            this.toast.success('Contrato cancelado correctamente');
            this.loadContracts();
          },
          error: (ex) => {
            this.toast.error(ex?.error?.message ?? 'Error al cancelar el contrato');
          },
        });
      },
    });
  }

  /** Abre todos los contratos del inquilino (vigentes marcados) */
  openTenantClientContracts(contract: GetContractsResponse): void {
    this.modalService.open('tenant-client-contracts', {
      tenantClientId: contract.tenantClientId,
      tenantClientName: contract.tenantClientName,
    });
  }

  /** Historial inmutable del contrato (alta, documento, cancelación) */
  openHistory(contract: GetContractsResponse): void {
    this.modalService.open('contract-history', {
      contractId: contract.id,
      unitNumber: contract.unitNumber,
      tenantClientName: contract.tenantClientName,
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PendingStart: 'Por iniciar',
      Active: 'Activo',
      ExpiringSoon: 'Por vencer',
      Expired: 'Vencido',
      Cancelled: 'Cancelado',
    };
    return map[status] ?? status;
  }

  getContractTypeLabel(type: string): string {
    const map: Record<string, string> = {
      Fixed: 'Fijo',
      Monthly: 'Mensual',
      Annual: 'Anual',
      Temporary: 'Temporal',
    };
    return map[type] ?? type;
  }
}
