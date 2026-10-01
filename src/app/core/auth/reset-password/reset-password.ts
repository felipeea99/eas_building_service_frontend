import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';
import { KeyValuePipe } from '@angular/common';
import { passwordPolicyValidator, PASSWORD_ERROR_MESSAGES } from '../../../shared/validators/password-validator';
import { ToastService } from '../../../shared/toast/toast-service';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';
import { ResetPasswordRequest } from '../models/passwords-models';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, ThemeToggle, KeyValuePipe],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  isLoading = signal(false);
  serverError = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordReset = signal(false);
  isTokenValid = signal(false);

  readonly passwordErrors = PASSWORD_ERROR_MESSAGES;

  private token = '';

  form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, passwordPolicyValidator()]],
    confirmNewPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.token = params['token'];
      this.validateToken();
    });
  }

  get passwordsMismatch(): boolean {
    const { newPassword, confirmNewPassword } = this.form.controls;
    return confirmNewPassword.touched && newPassword.value !== confirmNewPassword.value;
  }

  validateToken(): void {
    this.authService.validateToken(this.token).subscribe({
      next: (isValid) => {
        this.isTokenValid.set(isValid);
      },
      error: () => {
        this.toast.warning('El token no es válido o ha expirado');
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.passwordsMismatch) {
      return;
    }

    this.isLoading.set(true);
    this.serverError.set('');

    const request: ResetPasswordRequest = {
      token: this.token,
      newPassword: this.form.value.newPassword!,
      confirmNewPassword: this.form.value.confirmNewPassword!,
    };

    this.authService.resetPassword(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.passwordReset.set(true);
        this.toast.success('Tu contraseña ha sido restablecida');
      },
      error: (ex) => {
        this.isLoading.set(false);
        const msg = ex?.error?.message ?? 'Hubo un error al restablecer la contraseña';
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
