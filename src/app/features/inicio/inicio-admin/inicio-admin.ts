import { Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { BuildingService } from '../../../core/services/building/building-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { GetBuildingsResponse } from '../../../core/services/building/building-models';
import { ImgLoader } from '../../../shared/img-loader/img-loader';
import { Toolbar, ToolbarFilter, ToolbarFilterChange } from '../../../shared/toolbar/toolbar';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { FollowUpsWidget } from '../../internal-notes/follow-ups-widget/follow-ups-widget';

@Component({
  selector: 'app-inicio-admin',
  imports: [Toolbar, ImgLoader, NgClass, FollowUpsWidget],
  templateUrl: './inicio-admin.html',
  styleUrl: './inicio-admin.css',
})
export class InicioAdmin {
  private buildingService = inject(BuildingService);
  private toast = inject(ToastService);
  protected modalService = inject(ModalService);
  router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);

  buildings = signal<GetBuildingsResponse[]>([]);
  filteredBuildings = signal<GetBuildingsResponse[]>([]);
  isLoading = signal(true);
  private searchTerm = '';
  private activeFilters: Record<string, string> = {};

  readonly toolbarFilters: ToolbarFilter[] = [
    {
      key: 'parking',
      label: 'Estacionamiento',
      options: [
        { value: 'true', label: 'Con estacionamiento' },
        { value: 'false', label: 'Sin estacionamiento' },
      ],
    },
    {
      key: 'occupancy',
      label: 'Ocupación',
      options: [
        { value: 'available', label: 'Con disponibles' },
        { value: 'full', label: 'Lleno' },
        { value: 'empty', label: 'Sin unidades' },
      ],
    },
  ];

  ngOnInit(): void {
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
    ]);
    this.loadBuildings();
  }

  private loadBuildings(): void {
    this.isLoading.set(true);
    this.buildingService.GetAllBuildings().subscribe({
      next: (data) => {
        this.buildings.set(data.items);
        this.filteredBuildings.set(data.items);
        this.isLoading.set(false);
      },
      error: (ex) => {
        this.isLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al cargar los edificios');
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
    let result = this.buildings();

    if (this.searchTerm) {
      result = result.filter(b =>
        b.name.toLowerCase().includes(this.searchTerm) ||
        b.address.toLowerCase().includes(this.searchTerm)
      );
    }

    if (this.activeFilters['parking']) {
      const hasParking = this.activeFilters['parking'] === 'true';
      result = result.filter(b => b.hasParking === hasParking);
    }

    if (this.activeFilters['occupancy']) {
      const occ = this.activeFilters['occupancy'];
      if (occ === 'available') {
        result = result.filter(b => b.totalUnits > 0 && b.occupiedUnits < b.totalUnits);
      } else if (occ === 'full') {
        result = result.filter(b => b.totalUnits > 0 && b.occupiedUnits === b.totalUnits);
      } else if (occ === 'empty') {
        result = result.filter(b => b.totalUnits === 0);
      }
    }

    this.filteredBuildings.set(result);
  }

  goToDashboard(building: GetBuildingsResponse): void {
    this.router.navigate(['/building-dashboard', building.id]);
  }

  getOccupancyPercent(building: GetBuildingsResponse): number {
    if (building.totalUnits === 0) return 0;
    return Math.round((building.occupiedUnits / building.totalUnits) * 100);
  }

  getOccupancyClass(building: GetBuildingsResponse): string {
    const pct = this.getOccupancyPercent(building);
    if (pct >= 100) return 'occ-full';
    if (pct >= 76) return 'occ-high';
    if (pct >= 50) return 'occ-mid';
    return 'occ-low';
  }

}
