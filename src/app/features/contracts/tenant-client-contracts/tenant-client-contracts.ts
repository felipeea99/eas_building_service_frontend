import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { timeout, TimeoutError } from 'rxjs';
import { ContractService } from '../../../core/services/contracts/contract-service';
import { GetTenantClientContractsResponse } from '../../../core/services/contracts/contract-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

/** Datos que recibe desde el modal */
export interface TenantClientContractsModalData {
  tenantClientId: string;
  tenantClientName?: string;
}

/**
 * Modal: todos los contratos de un inquilino.
 * Los vigentes (isCurrent) salen primero y marcados; el estado lo calcula el backend a hoy.
 */
@Component({
  selector: 'app-tenant-client-contracts',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './tenant-client-contracts.html',
  styleUrl: './tenant-client-contracts.css',
})
export class TenantClientContracts implements OnInit {
  private contractService = inject(ContractService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isLoading = signal(true);
  loadError = signal<string | null>(null);
  result = signal<GetTenantClientContractsResponse | null>(null);
  tenantClientName = signal('');

  ngOnInit(): void {
    const data = this.modalService.state()?.data as TenantClientContractsModalData | null;

    if (!data?.tenantClientId) {
      this.isLoading.set(false);
      this.loadError.set('No se recibió el inquilino');
      return;
    }

    this.tenantClientName.set(data.tenantClientName ?? '');

    this.contractService
      .getContractsByTenantClient(data.tenantClientId)
      .pipe(timeout(10_000))
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.tenantClientName.set(res.tenantClientName);
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          const msg = ex instanceof TimeoutError
            ? 'La solicitud tardó demasiado, intenta de nuevo'
            : ex?.error?.message ?? 'Error al cargar los contratos';
          this.loadError.set(msg);
          this.toast.error(msg);
        },
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
