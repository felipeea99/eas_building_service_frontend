import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, ThemeToggle],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  isLoading = signal(false);
  serverError = signal('');
  emailSent = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.serverError.set('');

    this.authService.forgotPassword({ email: this.form.value.email! }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.emailSent.set(true);
        this.toast.success('Se envió un correo con las instrucciones para recuperar tu contraseña');
      },
      error: (ex) => {
        this.isLoading.set(false);
        const msg = ex?.error?.message ?? 'Hubo un error al procesar la solicitud';
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
