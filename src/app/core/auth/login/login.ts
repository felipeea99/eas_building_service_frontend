import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  errorMessage = '';
  isLoading = false;
  showPassword = false;

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (data) => {
        const role = data.role;
        const routeByRole: Record<string, string> = {
          Admin: '/admin',
          User: '/user',
        };
        this.router.navigateByUrl(routeByRole[role] ?? '/');
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Credenciales inválidas';
        console.error(err);
      }
    });
  }
}
