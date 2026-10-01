import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ParkingSpotService } from '../../../core/services/parking-spot/parking-spot-service';
import { CreateParkingSpotRequest, ParkingSpotInfo } from '../../../core/services/parking-spot/parking-spot-models';
import { TenantClientService } from '../../../core/services/tenant-clients/tenant-client-service';
import { TenantClientResponse } from '../../../core/services/tenant-clients/tenant-client-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { CardMenu, CardMenuAction } from '../../../shared/card-menu/card-menu';
import { Toolbar, ToolbarFilter, ToolbarFilterChange } from '../../../shared/toolbar/toolbar';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { BuildingContextService } from '../../../core/services/building/building-context-service';

@Component({
  selector: 'app-index-parking-spots',
  imports: [DecimalPipe, CardMenu, Toolbar],
  templateUrl: './index-parking-spots.html',
  styleUrl: './index-parking-spots.css',
})
export class IndexParkingSpots {
  private parkingSpotService = inject(ParkingSpotService);
  private tenantClientService = inject(TenantClientService);
  private toast = inject(ToastService);
  protected modalService = inject(ModalService);
  private route = inject(ActivatedRoute);
  private breadcrumbService = inject(BreadcrumbService);
  private buildingContext = inject(BuildingContextService);
  router = inject(Router);

  spots = signal<ParkingSpotInfo[]>([]);
  filteredSpots = signal<ParkingSpotInfo[]>([]);
  isLoading = signal(true);

  // Add form
  showAddForm = signal(false);
  isCreating = signal(false);
  newSpotNumber = signal('');
  newMonthlyRate = signal(0);

  // Assign form
  assigningSpotId = signal<string | null>(null);
  tenants = signal<TenantClientResponse[]>([]);
  selectedTenantId = signal('');
  isAssigning = signal(false);
  isReleasing = signal(false);

  buildingId = '';
  private searchTerm = '';
  private activeFilters: Record<string, string> = {};

  readonly toolbarFilters: ToolbarFilter[] = [
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'assigned', label: 'Asignado' },
        { value: 'available', label: 'Disponible' },
      ],
    },
    {
      key: 'rate',
      label: 'Tarifa',
      options: [
        { value: 'with', label: 'Con tarifa' },
        { value: 'without', label: 'Sin tarifa' },
      ],
    },
  ];

  ngOnInit(): void {
    this.buildingId = this.route.snapshot.params['buildingId'] ?? '';
    const bc = this.buildingContext.current();
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
      ...(bc ? [{ label: bc.name, path: `/building-dashboard/${bc.id}` }] : []),
      { label: 'Estacionamientos', path: `/parking-spots/${this.buildingId}` },
    ]);
    this.loadSpots();
  }

  private loadSpots(): void {
    this.isLoading.set(true);
    this.parkingSpotService.getByBuilding(this.buildingId).subscribe({
      next: (data) => {
        this.spots.set(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (ex) => {
        this.isLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al cargar los estacionamientos');
      },
    });
  }

  getMenuActions(spot: ParkingSpotInfo): CardMenuAction[] {
    if (spot.isAssigned) {
      return [{ label: 'Liberar', icon: 'deactivate', destructive: true }];
    }
    return [{ label: 'Asignar', icon: 'assign' }];
  }

  onMenuAction(action: CardMenuAction, spot: ParkingSpotInfo): void {
    switch (action.icon) {
      case 'deactivate':
        this.releaseSpot(spot);
        break;
      case 'assign':
        this.openAssignForm(spot);
        break;
    }
  }

  // ── Release ──
  private releaseSpot(spot: ParkingSpotInfo): void {
    this.isReleasing.set(true);
    this.parkingSpotService.release(spot.parkingSpotId).subscribe({
      next: () => {
        this.toast.success(`Estacionamiento ${spot.spotNumber} liberado`);
        this.isReleasing.set(false);
        this.loadSpots();
      },
      error: (ex) => {
        this.isReleasing.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al liberar el estacionamiento');
      },
    });
  }

  // ── Assign ──
  openAssignForm(spot: ParkingSpotInfo): void {
    this.assigningSpotId.set(spot.parkingSpotId);
    this.selectedTenantId.set('');
    this.loadTenants();
  }

  closeAssignForm(): void {
    this.assigningSpotId.set(null);
    this.selectedTenantId.set('');
  }

  private loadTenants(): void {
    this.tenantClientService.getAvailableByBuilding(this.buildingId).subscribe({
      next: (data) => this.tenants.set(data.items),
      error: () => this.toast.error('Error al cargar inquilinos'),
    });
  }

  confirmAssign(spot: ParkingSpotInfo): void {
    const tenantId = this.selectedTenantId();
    if (!tenantId) {
      this.toast.warning('Selecciona un inquilino');
      return;
    }
    this.isAssigning.set(true);
    this.parkingSpotService.assign(spot.parkingSpotId, tenantId).subscribe({
      next: () => {
        this.toast.success(`Estacionamiento ${spot.spotNumber} asignado`);
        this.isAssigning.set(false);
        this.closeAssignForm();
        this.loadSpots();
      },
      error: (ex) => {
        this.isAssigning.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al asignar el estacionamiento');
      },
    });
  }

  // ── Create ──
  toggleAddForm(): void {
    this.showAddForm.update(v => !v);
    if (!this.showAddForm()) {
      this.newSpotNumber.set('');
      this.newMonthlyRate.set(0);
    }
  }

  createSpot(): void {
    const spotNumber = this.newSpotNumber().trim();
    if (!spotNumber) {
      this.toast.warning('Ingresa un número de espacio');
      return;
    }

    this.isCreating.set(true);
    const request: CreateParkingSpotRequest = {
      buildingId: this.buildingId,
      spotNumber,
      monthlyRate: this.newMonthlyRate(),
    };

    this.parkingSpotService.create(request).subscribe({
      next: () => {
        this.toast.success('Estacionamiento creado');
        this.isCreating.set(false);
        this.toggleAddForm();
        this.loadSpots();
      },
      error: (ex) => {
        this.isCreating.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al crear el estacionamiento');
      },
    });
  }

  // ── Search & Filters ──
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
    let result = this.spots();

    if (this.searchTerm) {
      result = result.filter(s =>
        s.spotNumber.toLowerCase().includes(this.searchTerm) ||
        (s.tenantClientFullName?.toLowerCase().includes(this.searchTerm)) ||
        (s.unitName?.toLowerCase().includes(this.searchTerm))
      );
    }

    if (this.activeFilters['status']) {
      const isAssigned = this.activeFilters['status'] === 'assigned';
      result = result.filter(s => s.isAssigned === isAssigned);
    }

    if (this.activeFilters['rate']) {
      const hasRate = this.activeFilters['rate'] === 'with';
      result = result.filter(s => s.hasMonthlyRate === hasRate);
    }

    this.filteredSpots.set(result);
  }

  asInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
