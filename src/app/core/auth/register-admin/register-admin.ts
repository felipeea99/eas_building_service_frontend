import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RegisterAdmRequest } from '../models/register-admin';
import { ReactiveFormsModule } from '@angular/forms';
import { KeyValuePipe } from '@angular/common';
import { passwordPolicyValidator, PASSWORD_ERROR_MESSAGES } from '../../../shared/validators/password-validator';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-register-admin',
  imports: [ReactiveFormsModule, RouterLink, ThemeToggle, KeyValuePipe],
  templateUrl: './register-admin.html',
  styleUrl: './register-admin.css',
})
export class RegisterAdmin {
  private authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);

  showPassword = signal(false);
  serverError: string | null = null;
  readonly passwordErrors = PASSWORD_ERROR_MESSAGES;
  isLoading = false;

  registerForm = this.formBuilder.group({
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    middleName: [''],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    secondLastName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordPolicyValidator()]],
  });

  onSubmit(): void {
    this.serverError = null;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const formValue = this.registerForm.getRawValue();

    const payload: RegisterAdmRequest = {
      companyName: formValue.companyName ?? '',
      firstName: formValue.firstName ?? '',
      middleName: formValue.middleName ?? '',
      lastName: formValue.lastName ?? '',
      secondLastName: formValue.secondLastName ?? '',
      email: formValue.email ?? '',
      password: formValue.password ?? '',
    };

    this.isLoading = true;

    this.authService.registerAdmin(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/login']);
      },
      error: (ex) => {
        this.isLoading = false;
        this.serverError = ex?.error?.message ?? 'Ocurrió un error al crear la cuenta.';
      },
    });
  }
}
