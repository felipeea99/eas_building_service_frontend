import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { timeout, TimeoutError } from 'rxjs';
import { ContractService } from '../../../core/services/contracts/contract-service';
import {
  ContractChangeAction,
  ContractHistoryChange,
  ContractHistoryItem,
} from '../../../core/services/contracts/contract-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

/** Datos que recibe desde el modal */
export interface ContractHistoryModalData {
  contractId: string;
  unitNumber?: string;
  tenantClientName?: string;
}

/** Cambio ya listo para mostrarse */
interface DisplayChange {
  label: string;
  oldValue: string | null;
  newValue: string | null;
}

/** Campos que no se muestran (Ids internos) */
const HIDDEN_FIELDS = new Set(['UnitId', 'TenantClientId']);

const FIELD_LABELS: Record<string, string> = {
  StartDate: 'Inicio',
  EndDate: 'Fin',
  MonthlyRent: 'Renta mensual',
  ContractType: 'Tipo',
  IsSigned: 'Firmado',
  SignedAt: 'Fecha de firma',
  S3Key: 'Documento',
  IsCancelled: 'Cancelado',
};

const ACTION_LABELS: Record<ContractChangeAction, string> = {
  Created: 'Contrato creado',
  DocumentAttached: 'Documento firmado adjuntado',
  DocumentReplaced: 'Documento reemplazado',
  Cancelled: 'Contrato cancelado',
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  Fixed: 'Fijo',
  Monthly: 'Mensual',
  Annual: 'Anual',
  Temporary: 'Temporal',
};

/**
 * Modal: historial inmutable de un contrato (quién, cuándo y qué cambió).
 * Solo lectura; el backend lo genera al crear, adjuntar documento y cancelar.
 */
@Component({
  selector: 'app-contract-history',
  imports: [DatePipe],
  templateUrl: './contract-history.html',
  styleUrl: './contract-history.css',
})
export class ContractHistory implements OnInit {
  private contractService = inject(ContractService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isLoading = signal(true);
  loadError = signal<string | null>(null);
  items = signal<ContractHistoryItem[]>([]);
  subtitle = signal('');

  ngOnInit(): void {
    const data = this.modalService.state()?.data as ContractHistoryModalData | null;

    if (!data?.contractId) {
      this.isLoading.set(false);
      this.loadError.set('No se recibió el contrato');
      return;
    }

    this.subtitle.set([data.unitNumber, data.tenantClientName].filter(Boolean).join(' · '));

    this.contractService
      .getHistory(data.contractId)
      .pipe(timeout(10_000))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          const msg = ex instanceof TimeoutError
            ? 'La solicitud tardó demasiado, intenta de nuevo'
            : ex?.error?.message ?? 'Error al cargar el historial';
          this.loadError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  getActionLabel(action: ContractChangeAction): string {
    return ACTION_LABELS[action] ?? action;
  }

  /** Cambios visibles y formateados (se ocultan Ids internos) */
  getChanges(item: ContractHistoryItem): DisplayChange[] {
    return item.changes
      .filter((change) => !HIDDEN_FIELDS.has(change.field))
      .map((change) => ({
        label: FIELD_LABELS[change.field] ?? change.field,
        oldValue: this.formatValue(change, change.oldValue),
        newValue: this.formatValue(change, change.newValue),
      }));
  }

  private formatValue(change: ContractHistoryChange, value: string | null): string | null {
    if (value === null || value === '') return null;

    switch (change.field) {
      case 'StartDate':
      case 'EndDate': {
        // fecha de calendario "yyyy-MM-dd" → dd/MM/yy (sin conversión de zona)
        const [y, m, d] = value.split('-');
        return y && m && d ? `${d}/${m}/${y.slice(2)}` : value;
      }
      case 'SignedAt': {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
      }
      case 'MonthlyRent': {
        const amount = Number(value);
        return isNaN(amount) ? value : amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
      }
      case 'ContractType':
        return CONTRACT_TYPE_LABELS[value] ?? value;
      case 'IsSigned':
      case 'IsCancelled':
        return value === 'True' ? 'Sí' : 'No';
      case 'S3Key':
        // solo el nombre del archivo
        return value.split('/').pop() ?? value;
      default:
        return value;
    }
  }
}
