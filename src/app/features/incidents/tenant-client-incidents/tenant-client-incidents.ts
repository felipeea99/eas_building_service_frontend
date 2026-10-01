import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { timeout, TimeoutError } from 'rxjs';
import { IncidentService } from '../../../core/services/incidents/incident-service';
import { IncidentResponse } from '../../../core/services/incidents/incident-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { IncidentFormModalData } from '../incident-form/incident-form';

/** Datos que recibe desde el modal */
export interface TenantClientIncidentsModalData {
  tenantClientId: string;
  tenantClientName?: string;
  buildingId?: string | null;
}

/**
 * Modal: historial de incidencias de un inquilino (solo lectura).
 * "Registrar incidencia" abre el formulario con el cliente ya fijado.
 * Resolver / reabrir / anular se hacen desde la página de Incidencias del edificio.
 */
@Component({
  selector: 'app-tenant-client-incidents',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './tenant-client-incidents.html',
  styleUrl: './tenant-client-incidents.css',
})
export class TenantClientIncidents implements OnInit {
  private incidentService = inject(IncidentService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  private data: TenantClientIncidentsModalData | null = null;

  tenantClientName = signal('');
  incidents = signal<IncidentResponse[]>([]);
  totalCount = signal(0);
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  openCount = computed(() => this.incidents().filter((incident) => !incident.isResolved).length);

  ngOnInit(): void {
    this.data = this.modalService.state()?.data as TenantClientIncidentsModalData | null;

    if (!this.data?.tenantClientId) {
      this.isLoading.set(false);
      this.loadError.set('No se recibió el inquilino');
      return;
    }

    this.tenantClientName.set(this.data.tenantClientName ?? '');

    this.incidentService
      .getIncidents({ tenantClientId: this.data.tenantClientId, page: 1, pageSize: 100 })
      .pipe(timeout(10_000))
      .subscribe({
        next: (res) => {
          this.incidents.set(res.items);
          this.totalCount.set(res.totalCount);
          if (!this.tenantClientName() && res.items.length) {
            this.tenantClientName.set(res.items[0].tenantClientName);
          }
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          const msg = ex instanceof TimeoutError
            ? 'La solicitud tardó demasiado, intenta de nuevo'
            : ex?.error?.message ?? 'Error al cargar las incidencias';
          this.loadError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  /** Reemplaza este modal por el formulario (el modal es único) */
  registerIncident(): void {
    if (!this.data) return;
    const formData: IncidentFormModalData = {
      buildingId: this.data.buildingId ?? null,
      tenantClientId: this.data.tenantClientId,
      tenantClientName: this.tenantClientName(),
    };
    this.modalService.open('incident-form', formData);
  }
}
