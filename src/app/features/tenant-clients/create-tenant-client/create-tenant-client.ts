import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TenantClientService } from '../../../core/services/tenant-clients/tenant-client-service';
import { TenantClientRequest } from '../../../core/services/tenant-clients/tenant-client-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-create-tenant-client',
  imports: [ReactiveFormsModule],
  templateUrl: './create-tenant-client.html',
  styleUrl: './create-tenant-client.css',
})
export class CreateTenantClient {
  private fb = inject(FormBuilder);
  private tenantClientService = inject(TenantClientService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isSubmitting = signal(false);

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    middleName: [''],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    secondLastName: [''],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    companyName: [''],
    rfc: ['', [Validators.pattern(/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/i)]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const request: TenantClientRequest = {
      firstName: this.form.value.firstName!.trim(),
      middleName: this.form.value.middleName?.trim() || undefined,
      lastName: this.form.value.lastName!.trim(),
      secondLastName: this.form.value.secondLastName?.trim() || undefined,
      email: this.form.value.email!.trim(),
      phoneNumber: this.form.value.phoneNumber!.trim(),
      companyName: this.form.value.companyName?.trim() || undefined,
      rfc: this.form.value.rfc?.trim() || undefined,
    };

    this.tenantClientService.create(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Cliente creado correctamente');
        this.modalService.close();
      },
      error: (ex) => {
        this.isSubmitting.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al crear el cliente');
      },
    });
  }
}
