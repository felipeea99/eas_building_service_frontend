import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { LoginResponse } from '../models/login-response';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {

  // services
  private authService = inject(AuthService);
  private router = inject(Router);

  // form
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  // variables
  errorMessage = '';
  isLoading = false;
  showPassword = false;

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
    // variables login
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (data) => {
        const loginResponse: LoginResponse = data;
        this.authService.setAccessToken(loginResponse);
        this.router.navigateByUrl('/inicio');

      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Credenciales inválidas';
        console.error(err);
      }
    });
  }
}
