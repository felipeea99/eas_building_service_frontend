import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';
import { BuildingService } from '../../services/building/building-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { ChangePasswordRequest } from '../models/passwords-models';

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePassword {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private buildingService = inject(BuildingService);

  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);
  isLoading = signal(false);
  serverError = signal('');

  form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmNewPassword: ['', [Validators.required, Validators.minLength(6)]],
  }, { validators: this.passwordsMatch });

  /** Validador a nivel de grupo: newPassword === confirmNewPassword */
  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const newPass = group.get('newPassword')?.value;
    const confirm = group.get('confirmNewPassword')?.value;

    if (confirm && newPass !== confirm) {
      group.get('confirmNewPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.serverError.set('');

    const request: ChangePasswordRequest = {
      currentPassword: this.form.value.currentPassword!,
      newPassword: this.form.value.newPassword!,
      confirmNewPassword: this.form.value.confirmNewPassword!,
    };

    this.authService.changeTemporaryPassword(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Contraseña actualizada correctamente');
        // 1 edificio → directo a su dashboard; varios → tarjetas en /inicio
        this.buildingService
          .resolveLandingUrl(this.authService.getRole())
          .subscribe((url) => this.router.navigateByUrl(url));
      },
      error: (ex) => {
        this.isLoading.set(false);
        const msg = ex?.error?.message ?? 'Hubo un error al actualizar la contraseña';
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
