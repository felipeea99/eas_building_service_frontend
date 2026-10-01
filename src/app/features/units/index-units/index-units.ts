import { Component, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { timeout } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { UnitService } from '../../../core/services/units/unit-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { UnitResponse } from '../../../core/services/building/building-models';
import { CardMenuAction } from '../../../shared/card-menu/card-menu';
import { Toolbar, ToolbarFilter, ToolbarFilterChange } from '../../../shared/toolbar/toolbar';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';

@Component({
  selector: 'app-index-units',
  imports: [DecimalPipe, Toolbar],
  templateUrl: './index-units.html',
  styleUrl: './index-units.css',
})
export class IndexUnits {
  // Services
  private route = inject(ActivatedRoute);
  private unitService = inject(UnitService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);
  router = inject(Router);
  // Context Building
  buildingId = signal<string>('');
  buildingName = signal<string>('');

  units = signal<UnitResponse[]>([]);
  filteredUnits = signal<UnitResponse[]>([]);
  isLoading = signal(false);
  /** Id del local cuyo cambio de estado está en curso */
  statusBusyId = signal<string | null>(null);
  private searchTerm = '';
  private activeFilters: Record<string, string> = {};

  readonly toolbarFilters: ToolbarFilter[] = [
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'Available', label: 'Disponible' },
        { value: 'Occupied', label: 'Ocupada' },
        { value: 'Maintenance', label: 'Mantenimiento' },
        { value: 'Reserved', label: 'Reservada' },
      ],
    },
  ];

  readonly menuActions: CardMenuAction[] = [
    { label: 'Editar', icon: 'edit' },
  ];

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['buildingId']) {
        this.buildingId.set(params['buildingId']);
        this.loadUnits();
      }
    });
  }

  private setupBreadcrumb(): void {
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
      { label: this.buildingName(), path: `/building-dashboard/${this.buildingId()}` },
      { label: 'Unidades', path: `/index-units/${this.buildingId()}` },
    ]);
  }

  private loadUnits(): void {
    if (!this.buildingId()) return;
    this.isLoading.set(true);
    this.unitService.getUnitsByBuilding(this.buildingId()).subscribe({
      next: (data) => {
        this.units.set(data.units.items);
        this.filteredUnits.set(data.units.items);
        this.buildingName.set(data.buildingName.toString().toUpperCase());
        this.isLoading.set(false);
        this.setupBreadcrumb();
      },
      error: (ex) => {
        this.isLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al cargar las unidades');
      },
    });
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
    let result = this.units();

    if (this.searchTerm) {
      result = result.filter(u => u.unitName.toLowerCase().includes(this.searchTerm));
    }

    if (this.activeFilters['status']) {
      result = result.filter(u => u.status === this.activeFilters['status']);
    }

    this.filteredUnits.set(result);
  }

  onAddUnit(): void {
    this.modalService.open('create-unit');
  }

  onMenuAction(action: CardMenuAction, unit: UnitResponse): void {
    switch (action.icon) {
      case 'edit':
        this.modalService.open('edit-unit', unit);
        break;
    }
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      Available: 'Disponible',
      Occupied: 'Ocupada',
      Maintenance: 'Mantenimiento',
      Reserved: 'Reservada',
    };
    return map[status] ?? status;
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      Apartment: 'Departamento',
      Commercial: 'Comercial',
      Office: 'Oficina',
      Warehouse: 'Bodega',
      Parking: 'Estacionamiento',
      Storage: 'Almacén',
      Other: 'Otro',
    };
    return map[type] ?? type;
  }
}
