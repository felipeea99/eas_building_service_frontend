import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../../core/services/user/user-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { GetUserResponse } from '../../../core/auth/models/register-users';
import { CardMenu, CardMenuAction } from '../../../shared/card-menu/card-menu';
import { Toolbar, ToolbarFilter, ToolbarFilterChange } from '../../../shared/toolbar/toolbar';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';

@Component({
  selector: 'app-index-users',
  imports: [CardMenu, Toolbar],
  templateUrl: './index-users.html',
  styleUrl: './index-users.css',
})
export class IndexUsers {
  private userService = inject(UserService);
  private toast = inject(ToastService);
  protected modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);
  router = inject(Router);

  users = signal<GetUserResponse[]>([]);
  isLoading = signal(true);
  filteredUsers = signal<GetUserResponse[]>([]);
  private searchTerm = '';
  private activeFilters: Record<string, string> = {};

  readonly toolbarFilters: ToolbarFilter[] = [
    {
      key: 'role',
      label: 'Rol',
      options: [
        { value: '0', label: 'SuperAdmin' },
        { value: '1', label: 'Admin' },
        { value: '2', label: 'Manager' },
        { value: '3', label: 'Staff' },
        { value: '4', label: 'Guardia' },
        { value: '5', label: 'Inquilino' },
      ],
    },
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'true', label: 'Activo' },
        { value: 'false', label: 'Inactivo' },
      ],
    },
  ];


  getMenuActions(user: GetUserResponse): CardMenuAction[] {
    return [
      { label: 'Ver detalle', icon: 'view' },
      { label: 'Editar', icon: 'edit' },
      user.status
        ? { label: 'Desactivar', icon: 'deactivate', destructive: true }
        : { label: 'Activar', icon: 'activate' },
    ];
  }

  ngOnInit(): void {
    this.breadcrumbService.set([
      { label: 'Usuarios', path: '/index-users' },
    ]);
    this.getUsersFromTenant();
  }

  private getUsersFromTenant(): void {
    this.isLoading.set(true);
    this.userService.GetAllUsersByTenantId().subscribe({
      next: (data) => {
        this.users.set(data);
        this.filteredUsers.set(data);
        this.isLoading.set(false);
      },
      error: (ex) => {
        this.isLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al cargar los usuarios');
      },
    });
  }

  onMenuAction(action: CardMenuAction, user: GetUserResponse): void {
    switch (action.icon) {
      case 'view':
        this.toast.info(`Ver detalle de ${user.userFullName}`);
        break;
      case 'edit':
        this.toast.info(`Editar ${user.userFullName}`);
        break;
      case 'deactivate':
        this.toast.warning(`Desactivar ${user.userFullName} — pendiente de endpoint`);
        break;
      case 'activate':
        this.toast.info(`Activar ${user.userFullName} — pendiente de endpoint`);
        break;
    }
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
    let result = this.users();

    if (this.searchTerm) {
      result = result.filter(u =>
        u.userFullName.toLowerCase().includes(this.searchTerm)
      );
    }

    if (this.activeFilters['role']) {
      const role = Number(this.activeFilters['role']);
      result = result.filter(u => u.role === role);
    }

    if (this.activeFilters['status']) {
      const status = this.activeFilters['status'] === 'true';
      result = result.filter(u => u.status === status);
    }

    this.filteredUsers.set(result);
  }

  getRoleLabel(role: number): string {
    const map: Record<number, string> = {
      0: 'SuperAdmin',
      1: 'Soporte',
      2: 'Admin',
      3: 'Manager',
      4: 'Staff',
      5: 'Guardia',
      10: 'Inquilino',
    };
    return map[role] ?? 'Desconocido';
  }
}
