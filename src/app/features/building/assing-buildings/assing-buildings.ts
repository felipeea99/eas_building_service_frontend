import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BuildingService } from '../../../core/services/building/building-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { BuildingAvailableModel, AssignUserToBuildingRequest, GetBuildingsResponse } from '../../../core/services/building/building-models';
import { TenantUserResponse } from '../../../core/auth/models/register-users';
import { UserService } from '../../../core/services/user/user-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';

@Component({
  selector: 'app-assing-buildings',
  imports: [ReactiveFormsModule],
  templateUrl: './assing-buildings.html',
  styleUrl: './assing-buildings.css',
})
export class AssingBuildings {
  private fb = inject(FormBuilder);
  private buildingService = inject(BuildingService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);

  isLoading = signal(false);
  serverError = signal<string | null>(null);
  buildings = signal<BuildingAvailableModel[]>([]);
  users = signal<TenantUserResponse[]>([]);
  loadingBuildings = signal(false);
  loadingUsers = signal(false);
  private preselectedBuildingId: string | null = null;

  form = this.fb.nonNullable.group({
    buildingId: ['', [Validators.required]],
    tenantUserId: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.breadcrumbService.set([
      { label: 'Inicio', path: '/inicio' },
      { label: 'Asignar Edificios', path: '/assign-buildings' },
    ]);

    // Si viene desde el menú de 3 puntos de un edificio (inicio-admin),
    // llega con ese edificio para preseleccionarlo en el formulario.
    const data = this.modalService.state()?.data as GetBuildingsResponse | null;
    this.preselectedBuildingId = data?.id ?? null;

    this.loadBuildings();
  }

  private loadBuildings(): void {
    this.loadingBuildings.set(true);
    this.buildingService.getBuildingAvailableByUser().subscribe({
      next: (data) => {
        this.buildings.set(data);
        this.loadingBuildings.set(false);
        if (this.preselectedBuildingId) {
          this.form.patchValue({ buildingId: this.preselectedBuildingId });
          this.loadUsers(this.preselectedBuildingId);
        }
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al cargar los edificios');
        this.loadingBuildings.set(false);
      },
    });
  }

  onBuildingChange(event: Event): void {
    const buildingId = (event.target as HTMLSelectElement).value;
    // Limpiar usuario seleccionado al cambiar de edificio
    this.form.patchValue({ tenantUserId: '' });
    this.users.set([]);
    if (buildingId) {
      this.loadUsers(buildingId);
    }
  }

  private loadUsers(buildingId: string): void {
    this.loadingUsers.set(true);
    this.userService.GetAllUsersAvailableByTenantId(buildingId).subscribe({
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

    const request: AssignUserToBuildingRequest = {
      buildingId: this.form.value.buildingId!,
      tenantUserId: this.form.value.tenantUserId!,
    };

    this.buildingService.AssignBuilding(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Usuario asignado al edificio correctamente');
        this.form.reset();
        if (this.modalService.isOpen()) {
          this.modalService.close();
        }
      },
      error: (ex) => {
        this.isLoading.set(false);
        const msg = ex?.error?.message ?? 'Hubo un error al asignar el usuario';
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
