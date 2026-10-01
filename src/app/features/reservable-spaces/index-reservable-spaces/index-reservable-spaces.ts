import { Component, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReservableSpaceService } from '../../../core/services/reservable-spaces/reservable-spaces';
import {
  ReservableSpaceResponse,
  ChangeStatusRequest,
  ReservationSlotUnitLabels,
  SLOT_UNIT_FROM_NAME,
} from '../../../core/services/reservable-spaces/reservable-space-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { CardMenu, CardMenuAction } from '../../../shared/card-menu/card-menu';
import { Toolbar, ToolbarFilter, ToolbarFilterChange } from '../../../shared/toolbar/toolbar';
import { ModalService } from '../../../shared/modal/modal-service';
import { ImgLoader } from '../../../shared/img-loader/img-loader';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { AuthService } from '../../../core/services/auth/auth-service';import { BuildingContextService } from '../../../core/services/building/building-context-service';

@Component({
  selector: 'app-index-reservable-spaces',
  imports: [DecimalPipe, CardMenu, Toolbar, ImgLoader],
  templateUrl: './index-reservable-spaces.html',
  styleUrl: './index-reservable-spaces.css',
})

export class IndexReservableSpaces {
  private reservableSpaceService = inject(ReservableSpaceService);
  private toast = inject(ToastService);
  protected modalService = inject(ModalService);
  private route = inject(ActivatedRoute);
  private breadcrumbService = inject(BreadcrumbService);
  router = inject(Router);
  private authService = inject(AuthService);

  private canEdit = false;
  private pendingReload = false; /** Recarga la lista al cerrar el modal (editar / horario) */
  spaces = signal<ReservableSpaceResponse[]>([]);
  filteredSpaces = signal<ReservableSpaceResponse[]>([]);
  isLoading = signal(true);
  buildingId = signal("");
  buildingName = signal("");
  private searchTerm = '';
  private activeFilters: Record<string, string> = {};

  constructor() {
    this.buildingId.set(this.route.snapshot.paramMap.get('buildingId') ?? '');
    console.log('Building ID:', this.buildingId());
    effect(() => {
      const open = this.modalService.isOpen();
      if (!open && this.pendingReload) {
        this.pendingReload = false;
        this.loadSpaces();
      }
    });
  }



  readonly toolbarFilters: ToolbarFilter[] = [
    {
      key: 'type',
      label: 'Tipo',
      options: [
        { value: 'MeetingRoom', label: 'Sala de juntas' },
        { value: 'Rooftop', label: 'Rooftop' },
        { value: 'EventArea', label: 'Área de eventos' },
        { value: 'Terrace', label: 'Terraza' },
        { value: 'Other', label: 'Otro' },
      ],
    },
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
      ],
    },
    {
      key: 'cost',
      label: 'Costo',
      options: [
        { value: 'with', label: 'Con costo' },
        { value: 'without', label: 'Sin costo' },
      ],
    },
  ];

  ngOnInit(): void {
    const role = this.authService.getRole();
    this.canEdit = ['SuperAdmin', 'Admin', 'Manager', 'Staff'].includes(role ?? '');
    this.loadSpaces();
  }

  private loadSpaces(): void {
    this.isLoading.set(true);
    this.reservableSpaceService.getByBuilding(this.buildingId()).subscribe({
      next: (data) => {
        this.spaces.set(data.reservableSpaceResponses.items);
        this.buildingName.set(data.buildingName);
        this.applyFilters();
        this.isLoading.set(false);
        this.setBreadcrumb();
      },
      error: (ex) => {
        this.isLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al cargar los espacios reservables');
      },
    });
  }
  private setBreadcrumb(): void {
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
      { label: this.buildingName(), path: `/building-dashboard/${this.buildingId()}` },
      { label: 'Espacios Reservables', path: `/reservable-spaces/${this.buildingId()}` },
    ]);
  }
  getMenuActions(space: ReservableSpaceResponse): CardMenuAction[] {
    const actions: CardMenuAction[] = [];

    if (this.canEdit) {
      actions.push({ label: 'Editar', icon: 'edit' });
      actions.push({ label: 'Horario', icon: 'calendar' });
    }

    if (space.status) {
      actions.push({ label: 'Desactivar', icon: 'deactivate', destructive: true });
    } else {
      actions.push({ label: 'Activar', icon: 'activate' });
    }

    return actions;
  }

  onMenuAction(action: CardMenuAction, space: ReservableSpaceResponse): void {
    switch (action.icon) {
      case 'edit':
        this.pendingReload = true;
        this.modalService.open('edit-reservable-space', space);
        break;
      case 'calendar':
        this.pendingReload = true;
        this.modalService.open('reservable-space-schedule', space);
        break;
      case 'deactivate':
        this.changeStatus(space, false);
        break;
      case 'activate':
        this.changeStatus(space, true);
        break;
    }
  }

  private changeStatus(space: ReservableSpaceResponse, isActive: boolean): void {
    const request: ChangeStatusRequest = {
      reservableSpaceId: space.reservableSpaceId,
      isActive,
    };
    this.reservableSpaceService.changeStatus(space.reservableSpaceId, request).subscribe({
      next: () => {
        this.toast.success(
          `${space.name} ${isActive ? 'activado' : 'desactivado'}`,
        );
        this.loadSpaces();
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al cambiar el estado');
      },
    });
  }

  getSlotUnitLabel(slotUnit: string): string {
    const unit = SLOT_UNIT_FROM_NAME[slotUnit];
    return unit === undefined ? slotUnit : ReservationSlotUnitLabels[unit];
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
    let result = this.spaces();

    if (this.searchTerm) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(this.searchTerm) ||
        s.type.toLowerCase().includes(this.searchTerm)
      );
    }

    if (this.activeFilters['type']) {
      result = result.filter(s => s.type === this.activeFilters['type']);
    }

    if (this.activeFilters['status']) {
      const isActive = this.activeFilters['status'] === 'active';
      result = result.filter(s => s.status === isActive);
    }

    if (this.activeFilters['cost']) {
      const hasCost = this.activeFilters['cost'] === 'with';
      result = result.filter(s => s.hasCost === hasCost);
    }

    this.filteredSpaces.set(result);
  }
}
