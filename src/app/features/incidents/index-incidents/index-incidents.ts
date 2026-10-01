import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, timeout, TimeoutError } from 'rxjs';
import { IncidentService } from '../../../core/services/incidents/incident-service';
import {
  INCIDENT_CATEGORY_OPTIONS,
  IncidentCategory,
  IncidentResponse,
  TenantClientIncidentSummaryResponse,
} from '../../../core/services/incidents/incident-models';
import { AuthService } from '../../../core/services/auth/auth-service';
import { BuildingContextService } from '../../../core/services/building/building-context-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { Toolbar, ToolbarFilter, ToolbarFilterChange } from '../../../shared/toolbar/toolbar';
import { IncidentFormModalData } from '../incident-form/incident-form';
import { TenantClientIncidentsModalData } from '../tenant-client-incidents/tenant-client-incidents';

type IncidentsTab = 'summary' | 'list';

const REQUEST_TIMEOUT = 10_000;
const CATEGORY_FILTER: ToolbarFilter = {
  key: 'category',
  label: 'Categoría',
  options: INCIDENT_CATEGORY_OPTIONS.map((option) => ({ value: String(option.value), label: option.label })),
};

/**
 * Página: incidencias del edificio.
 *  - "Morosos": un renglón por cliente (abiertas, total, monto abierto, categorías).
 *  - "Incidencias": tabla con filtros; editar, resolver, reabrir y anular (Manager+).
 * Ruta: /incidents/:buildingId
 */
@Component({
  selector: 'app-index-incidents',
  imports: [DatePipe, DecimalPipe, Toolbar],
  templateUrl: './index-incidents.html',
  styleUrl: './index-incidents.css',
})
export class IndexIncidents implements OnInit {
  private incidentService = inject(IncidentService);
  private authService = inject(AuthService);
  private buildingContext = inject(BuildingContextService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);
  private route = inject(ActivatedRoute);

  readonly summaryFilters: ToolbarFilter[] = [
    CATEGORY_FILTER,
    {
      key: 'scope',
      label: 'Mostrar',
      options: [{ value: 'all', label: 'Incluir sin abiertas' }],
    },
  ];

  readonly listFilters: ToolbarFilter[] = [
    CATEGORY_FILTER,
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'open', label: 'Abiertas' },
        { value: 'resolved', label: 'Resueltas' },
      ],
    },
  ];

  buildingId = '';
  activeTab = signal<IncidentsTab>('summary');
  canVoid = false;

  summary = signal<TenantClientIncidentSummaryResponse[]>([]);
  filteredSummary = signal<TenantClientIncidentSummaryResponse[]>([]);
  incidents = signal<IncidentResponse[]>([]);
  filteredIncidents = signal<IncidentResponse[]>([]);
  totalCount = signal(0);

  isLoading = signal(true);
  busyId = signal<string | null>(null);

  private searchTerm = '';
  private activeFilters: Record<string, string> = {};
  private pendingReload = false;

  constructor() {
    // recarga al cerrar el formulario / historial
    effect(() => {
      const open = this.modalService.isOpen();
      if (!open && this.pendingReload) {
        this.pendingReload = false;
        this.load();
      }
    });
  }

  ngOnInit(): void {
    this.buildingId = this.route.snapshot.paramMap.get('buildingId') ?? '';
    this.canVoid = ['SuperAdmin', 'Admin', 'Manager'].includes(this.authService.getRole() ?? '');

    const bc = this.buildingContext.current();
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
      ...(bc ? [{ label: bc.name, path: `/building-dashboard/${bc.id}` }] : []),
      { label: 'Incidencias', path: `/incidents/${this.buildingId}` },
    ]);

    this.load();
  }

  setTab(tab: IncidentsTab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    // el toolbar se vuelve a crear en cada pestaña: se limpian búsqueda y filtros
    this.searchTerm = '';
    this.activeFilters = {};
    this.load();
  }

  // ===== Carga =====

  load(): void {
    if (!this.buildingId) return;
    this.isLoading.set(true);

    const category = this.activeFilters['category'] ? (Number(this.activeFilters['category']) as IncidentCategory) : undefined;

    if (this.activeTab() === 'summary') {
      this.incidentService
        .getClientsSummary({
          buildingId: this.buildingId,
          category,
          onlyOpen: this.activeFilters['scope'] !== 'all',
          page: 1,
          pageSize: 100,
        })
        .pipe(timeout(REQUEST_TIMEOUT))
        .subscribe({
          next: (res) => {
            this.summary.set(res.items);
            this.totalCount.set(res.totalCount);
            this.applySearch();
            this.isLoading.set(false);
          },
          error: (ex) => this.onLoadError(ex, 'Error al cargar la lista de morosos'),
        });
      return;
    }

    const status = this.activeFilters['status'];
    this.incidentService
      .getIncidents({
        buildingId: this.buildingId,
        category,
        isResolved: status ? status === 'resolved' : undefined,
        page: 1,
        pageSize: 100,
      })
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: (res) => {
          this.incidents.set(res.items);
          this.totalCount.set(res.totalCount);
          this.applySearch();
          this.isLoading.set(false);
        },
        error: (ex) => this.onLoadError(ex, 'Error al cargar las incidencias'),
      });
  }

  private onLoadError(ex: unknown, fallback: string): void {
    this.isLoading.set(false);
    this.toast.error(this.errorMessage(ex, fallback));
  }

  onSearch(term: string): void {
    this.searchTerm = term.toLowerCase();
    this.applySearch();
  }

  onFilterChange(change: ToolbarFilterChange): void {
    if (change.value) {
      this.activeFilters[change.key] = change.value;
    } else {
      delete this.activeFilters[change.key];
    }
    this.load();
  }

  /** La búsqueda por texto es local; categoría y estado van al backend */
  private applySearch(): void {
    const term = this.searchTerm;

    this.filteredSummary.set(
      term ? this.summary().filter((row) => row.tenantClientName.toLowerCase().includes(term)) : this.summary(),
    );

    this.filteredIncidents.set(
      term
        ? this.incidents().filter((incident) =>
            incident.tenantClientName.toLowerCase().includes(term) ||
            incident.title.toLowerCase().includes(term) ||
            incident.description.toLowerCase().includes(term))
        : this.incidents(),
    );
  }

  // ===== Modales =====

  onAdd(): void {
    this.pendingReload = true;
    const data: IncidentFormModalData = { buildingId: this.buildingId };
    this.modalService.open('incident-form', data);
  }

  openClient(row: { tenantClientId: string; tenantClientName: string }): void {
    this.pendingReload = true;
    const data: TenantClientIncidentsModalData = {
      tenantClientId: row.tenantClientId,
      tenantClientName: row.tenantClientName,
      buildingId: this.buildingId,
    };
    this.modalService.open('tenant-client-incidents', data);
  }

  edit(incident: IncidentResponse): void {
    this.pendingReload = true;
    const data: IncidentFormModalData = { buildingId: this.buildingId, incident };
    this.modalService.open('incident-form', data);
  }

  // ===== Acciones =====

  resolve(incident: IncidentResponse): void {
    this.modalService.confirm({
      title: 'Resolver incidencia',
      message: `Marca como resuelta "${incident.title}" de ${incident.tenantClientName}.`,
      placeholder: 'Notas de resolución (opcional)...',
      confirmLabel: 'Resolver',
      showTextarea: true,
      textRequired: false,
      onConfirm: (notes) => {
        this.runAction(
          incident.id,
          () => this.incidentService.resolve(incident.id, { resolutionNotes: notes?.trim() || null }),
          'Incidencia resuelta',
          'Error al resolver la incidencia',
        );
      },
    });
  }

  reopen(incident: IncidentResponse): void {
    this.modalService.confirm({
      title: 'Reabrir incidencia',
      message: `¿Reabrir "${incident.title}"? Se borran la fecha y las notas de resolución.`,
      confirmLabel: 'Reabrir',
      showTextarea: false,
      onConfirm: () => {
        this.runAction(
          incident.id,
          () => this.incidentService.reopen(incident.id),
          'Incidencia reabierta',
          'Error al reabrir la incidencia',
        );
      },
    });
  }

  voidIncident(incident: IncidentResponse): void {
    this.modalService.confirm({
      title: 'Anular incidencia',
      message: `¿Anular "${incident.title}" de ${incident.tenantClientName}? Úsalo solo si se capturó por error; dejará de contar en el historial.`,
      confirmLabel: 'Sí, anular',
      destructive: true,
      showTextarea: false,
      onConfirm: () => {
        this.runAction(
          incident.id,
          () => this.incidentService.void(incident.id),
          'Incidencia anulada',
          'Error al anular la incidencia',
        );
      },
    });
  }

  private runAction(id: string, request: () => Observable<unknown>, successMsg: string, errorMsg: string): void {
    this.busyId.set(id);
    request()
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.toast.success(successMsg);
          this.load();
        },
        error: (ex) => {
          this.busyId.set(null);
          this.toast.error(this.errorMessage(ex, errorMsg));
        },
      });
  }

  private errorMessage(ex: unknown, fallback: string): string {
    if (ex instanceof TimeoutError) return 'La solicitud tardó demasiado, intenta de nuevo';
    return (ex as { error?: { message?: string } })?.error?.message ?? fallback;
  }
}
