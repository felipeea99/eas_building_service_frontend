import { Component, inject, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { passwordPolicyValidator, PASSWORD_ERROR_MESSAGES } from '../../../shared/validators/password-validator';
import { Router } from '@angular/router';
import { RegisterUserRequest, UserRole } from '../models/register-users';
import { AuthService } from '../../services/auth/auth-service';
import { BuildingService } from '../../services/building/building-service';
import { BuildingAvailableModel } from '../../services/building/building-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-register-user',
  imports: [ReactiveFormsModule, KeyValuePipe],
  templateUrl: './register-user.html',
  styleUrl: './register-user.css',
})
export class RegisterUser {
  private buildingService = inject(BuildingService);
  private authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  showPassword = signal(false);
  serverError = signal<string | null>(null);
  isLoading = signal(false);
  buildings = signal<BuildingAvailableModel[]>([]);
  loadingBuildings = signal(false);

  readonly passwordErrors = PASSWORD_ERROR_MESSAGES;

  readonly selectableRoles: { value: UserRole; label: string }[] = [
    { value: UserRole.Manager, label: 'Manager' },
    { value: UserRole.Staff, label: 'Staff' },
    { value: UserRole.Guard, label: 'Guardia' },
    { value: UserRole.Tenant, label: 'Inquilino' },
  ];

  registerForm = this.formBuilder.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    middleName: [''],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    secondLastName: [''],
    email: ['', [Validators.required, Validators.email]],
    temporaryPassword: ['', [Validators.required, passwordPolicyValidator()]],
    buildingId: ['', [Validators.required]],
    role: [UserRole.Tenant, [Validators.required]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    companyName: [''],
    rfc: ['', [Validators.pattern(/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/i)]],
  });

  ngOnInit(): void {
    this.loadBuildings();
  }

  private loadBuildings(): void {
    this.loadingBuildings.set(true);
    this.buildingService.getBuildingAvailableByUser().subscribe({
      next: (data) => {
        this.buildings.set(data);
        this.loadingBuildings.set(false);
      },
      error: (ex) => {
        this.serverError.set(ex?.error?.message ?? 'Ocurrió un error al cargar los edificios.');
        this.loadingBuildings.set(false);
      },
    });
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const formValue = this.registerForm.getRawValue();

    const payload: RegisterUserRequest = {
      firstName: formValue.firstName ?? '',
      middleName: formValue.middleName || undefined,
      lastName: formValue.lastName ?? '',
      secondLastName: formValue.secondLastName || undefined,
      email: formValue.email ?? '',
      temporaryPassword: formValue.temporaryPassword ?? '',
      buildingId: formValue.buildingId ?? '',
      role: formValue.role ?? UserRole.Tenant,
      companyName: formValue.companyName || undefined,
      phoneNumber: formValue.phoneNumber ?? '',
      rfc: formValue.rfc || undefined,
    };

    this.isLoading.set(true);

    this.authService.registerUser(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.warning) {
          this.toast.warning(res.warning);
        } else {
          this.toast.success('Usuario creado con éxito');
        }
        if (this.modalService.isOpen()) {
          this.modalService.close();
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (ex) => {
        this.isLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Hubo un error al crear la cuenta de usuario');
      },
    });
  }
}
