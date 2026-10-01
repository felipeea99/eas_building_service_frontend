import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantClientService } from '../../../core/services/tenant-clients/tenant-client-service';
import { TenantClientResponse, TenantClientChangeStatus } from '../../../core/services/tenant-clients/tenant-client-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { CardMenu, CardMenuAction } from '../../../shared/card-menu/card-menu';
import { Toolbar, ToolbarFilter, ToolbarFilterChange } from '../../../shared/toolbar/toolbar';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { BuildingContextService } from '../../../core/services/building/building-context-service';

@Component({
  selector: 'app-index-tenant-clients',
  imports: [CardMenu, Toolbar],
  templateUrl: './index-tenant-clients.html',
  styleUrl: './index-tenant-clients.css',
})
export class IndexTenantClients implements OnInit {
  private tenantClientService = inject(TenantClientService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);
  private buildingContext = inject(BuildingContextService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  buildingId = signal<string>('');
  tenantClients = signal<TenantClientResponse[]>([]);
  filteredClients = signal<TenantClientResponse[]>([]);
  isLoading = signal(false);
  private searchTerm = '';
  private activeFilters: Record<string, string> = {};

  readonly toolbarFilters: ToolbarFilter[] = [
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
      ],
    },
  ];

  ngOnInit(): void {
    const bc = this.buildingContext.current();
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
      ...(bc ? [{ label: bc.name, path: `/building-dashboard/${bc.id}` }] : []),
      { label: 'Clientes', path: `/tenant-clients/${this.buildingId()}` },
    ]);
    this.route.params.subscribe(params => {
      if (params['buildingId']) {
        this.buildingId.set(params['buildingId']);
        this.loadClients();
      }
    });
  }

  loadClients(): void {
    if (!this.buildingId()) return;
    this.isLoading.set(true);
    this.tenantClientService.getAllByBuilding(this.buildingId()).subscribe({
      next: (res) => {
        this.tenantClients.set(res.items);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (ex) => {
        this.isLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al cargar los clientes');
      },
    });
  }

  getMenuActions(client: TenantClientResponse): CardMenuAction[] {
    const actions: CardMenuAction[] = [
      { label: 'Editar', icon: 'edit' },
      { label: 'Ver contratos', icon: 'view' },
      { label: 'Bitácora', icon: 'notes' },
      { label: 'Incidencias', icon: 'incidents' },
    ];

    if (client.hasAccount) {
      actions.push({ label: 'Desvincular usuario', icon: 'unlink-user', destructive: true });
    } else {
      actions.push({ label: 'Vincular usuario', icon: 'link-user' });
    }

    actions.push(
      client.status
        ? { label: 'Desactivar', icon: 'deactivate', destructive: true }
        : { label: 'Activar', icon: 'activate' },
    );

    return actions;
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
    let result = this.tenantClients();

    if (this.searchTerm) {
      result = result.filter(c =>
        c.displayName.toLowerCase().includes(this.searchTerm) ||
        c.fullName.toLowerCase().includes(this.searchTerm) ||
        c.email.toLowerCase().includes(this.searchTerm) ||
        (c.companyName?.toLowerCase().includes(this.searchTerm) ?? false)
      );
    }

    if (this.activeFilters['status']) {
      const isActive = this.activeFilters['status'] === 'active';
      result = result.filter(c => c.status === isActive);
    }

    this.filteredClients.set(result);
  }

  onAdd(): void {
    this.modalService.open('create-tenant-client');
  }

  onMenuAction(action: CardMenuAction, client: TenantClientResponse): void {
    switch (action.icon) {
      case 'edit':
        this.openEdit(client);
        break;
      case 'view':
        this.modalService.open('tenant-client-contracts', {
          tenantClientId: client.id,
          tenantClientName: client.displayName,
        });
        break;
      case 'notes':
        this.modalService.open('tenant-client-notes', {
          tenantClientId: client.id,
          tenantClientName: client.displayName,
        });
        break;
      case 'incidents':
        this.modalService.open('tenant-client-incidents', {
          tenantClientId: client.id,
          tenantClientName: client.displayName,
          buildingId: this.buildingId() || null,
        });
        break;
      case 'link-user':
        this.modalService.open('link-user-tenant-client', { client, buildingId: this.buildingId() });
        break;
      case 'unlink-user':
        this.unlinkUser(client);
        break;
      case 'deactivate':
        this.toggleStatus(client, false);
        break;
      case 'activate':
        this.toggleStatus(client, true);
        break;
    }
  }

  private openEdit(client: TenantClientResponse): void {
    this.modalService.open('edit-tenant-client', client);
  }

  private unlinkUser(client: TenantClientResponse): void {
    this.modalService.confirm({
      title: 'Desvincular usuario',
      message: `¿Estás seguro de desvincular el usuario de ${client.displayName}? El usuario perderá acceso a este cliente.`,
      confirmLabel: 'Sí, desvincular',
      destructive: true,
      showTextarea: false,
      onConfirm: () => {
        this.tenantClientService.unlinkUser(client.id).subscribe({
          next: () => {
            this.toast.success('Usuario desvinculado correctamente');
            this.loadClients();
          },
          error: (ex) => {
            this.toast.error(ex?.error?.message ?? 'Error al desvincular el usuario');
          },
        });
      },
    });
  }

  getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.charAt(0).toUpperCase();
  }

  private toggleStatus(client: TenantClientResponse, newStatus: boolean): void {
    const action = newStatus ? 'activar' : 'desactivar';

    this.modalService.confirm({
      title: `${newStatus ? 'Activar' : 'Desactivar'} cliente`,
      message: `¿Estás seguro de ${action} a ${client.displayName}?`,
      confirmLabel: `Sí, ${action}`,
      destructive: !newStatus,
      showTextarea: false,
      onConfirm: () => {
        const request: TenantClientChangeStatus = {
          tenantClientId: client.id,
          newStatus,
        };

        this.tenantClientService.changeStatus(request).subscribe({
          next: () => {
            this.toast.success(newStatus ? 'Cliente activado' : 'Cliente desactivado');
            this.loadClients();
          },
          error: (ex) => {
            this.toast.error(ex?.error?.message ?? 'Error al cambiar el estado');
          },
        });
      },
    });
  }
}
