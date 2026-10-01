import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TenantClientService } from '../../../core/services/tenant-clients/tenant-client-service';
import { TenantClientResponse, TenantClientUpdate } from '../../../core/services/tenant-clients/tenant-client-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-edit-tenant-client',
  imports: [ReactiveFormsModule],
  templateUrl: './edit-tenant-client.html',
  styleUrl: './edit-tenant-client.css',
})
export class EditTenantClient implements OnInit {
  private fb = inject(FormBuilder);
  private tenantClientService = inject(TenantClientService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isSubmitting = signal(false);
  private clientId = '';

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

  ngOnInit(): void {
    const data = this.modalService.state()?.data as TenantClientResponse | null;
    if (data) {
      this.clientId = data.id;
      // Cargar el detalle completo para obtener los campos individuales del nombre
      this.loadClientDetail(data.id);
    }
  }

  private loadClientDetail(id: string): void {
    this.tenantClientService.getById(id).subscribe({
      next: (client) => {
        // Como la response general no trae los campos individuales del nombre,
        // usamos los datos que tengamos. Si el backend devuelve los campos
        // desglosados en getById, se hace patchValue con ellos.
        this.form.patchValue({
          firstName: (client as any).firstName ?? '',
          middleName: (client as any).middleName ?? '',
          lastName: (client as any).lastName ?? '',
          secondLastName: (client as any).secondLastName ?? '',
          email: client.email,
          phoneNumber: client.phoneNumber,
          companyName: client.companyName ?? '',
          rfc: client.rfc ?? '',
        });
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al cargar los datos del cliente');
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const request: TenantClientUpdate = {
      id: this.clientId,
      firstName: this.form.value.firstName!.trim(),
      middleName: this.form.value.middleName?.trim() || undefined,
      lastName: this.form.value.lastName!.trim(),
      secondLastName: this.form.value.secondLastName?.trim() || undefined,
      email: this.form.value.email!.trim(),
      phoneNumber: this.form.value.phoneNumber!.trim(),
      companyName: this.form.value.companyName?.trim() || undefined,
      rfc: this.form.value.rfc?.trim() || undefined,
    };

    this.tenantClientService.update(this.clientId, request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Cliente actualizado correctamente');
        this.modalService.close();
      },
      error: (ex) => {
        this.isSubmitting.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al actualizar el cliente');
      },
    });
  }
}
