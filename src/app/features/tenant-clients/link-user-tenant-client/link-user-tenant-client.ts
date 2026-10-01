import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TenantClientService } from '../../../core/services/tenant-clients/tenant-client-service';
import { TenantClientResponse, LinkUserAccountRequest } from '../../../core/services/tenant-clients/tenant-client-models';
import { UserService } from '../../../core/services/user/user-service';
import { TenantUserResponse } from '../../../core/auth/models/register-users';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-link-user-tenant-client',
  imports: [ReactiveFormsModule],
  templateUrl: './link-user-tenant-client.html',
  styleUrl: './link-user-tenant-client.css',
})
export class LinkUserTenantClient {
  private fb = inject(FormBuilder);
  private tenantClientService = inject(TenantClientService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isLoading = signal(false);
  serverError = signal<string | null>(null);
  clients = signal<TenantClientResponse[]>([]);
  users = signal<TenantUserResponse[]>([]);
  loadingClients = signal(false);
  loadingUsers = signal(false);

  /** Indica si el cliente fue preseleccionado desde el card menu */
  clientPreselected = signal(false);

  form = this.fb.nonNullable.group({
    tenantClientId: ['', [Validators.required]],
    userId: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const modalData = this.modalService.state()?.data as {
      client?: TenantClientResponse;
      buildingId?: string;
    } | null;

    this.loadClients(modalData?.client);
    this.loadUsers(modalData?.buildingId);
  }

  private loadClients(preselectedClient?: TenantClientResponse): void {
    this.loadingClients.set(true);
    this.tenantClientService.getWithoutUser().subscribe({
      next: (data) => {
        this.clients.set(data);
        this.loadingClients.set(false);

        // Auto-seleccionar el cliente si viene del card menu
        if (preselectedClient) {
          this.form.patchValue({ tenantClientId: preselectedClient.id });
          this.clientPreselected.set(true);
        }
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al cargar los clientes');
        this.loadingClients.set(false);
      },
    });
  }

  private loadUsers(buildingId?: string): void {
    this.loadingUsers.set(true);

    // cuentas con rol Cliente (los empleados no se vinculan a un cliente)
    this.userService.getClientUsersAvailable(buildingId).subscribe({
      next: (data) => {
        this.users.set(data);
        this.loadingUsers.set(false);
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al cargar los usuarios');
        this.loadingUsers.set(false);
      },
    });
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const request: LinkUserAccountRequest = {
      tenantClientId: this.form.value.tenantClientId!,
      userId: this.form.value.userId!,
    };

    this.tenantClientService.linkUser(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Usuario vinculado al cliente correctamente');
        this.form.reset();
        if (this.modalService.isOpen()) {
          this.modalService.close();
        }
      },
      error: (ex) => {
        this.isLoading.set(false);
        const msg = ex?.error?.message ?? 'Hubo un error al vincular el usuario';
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
