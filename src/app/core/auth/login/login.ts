import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginResponse } from '../models/login-models';
import { AuthService } from '../../services/auth/auth-service';
import { BuildingService } from '../../services/building/building-service';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, ThemeToggle, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {

  // services
  private authService = inject(AuthService);
  private router = inject(Router);
  private buildingService = inject(BuildingService);

  // form
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  // variables
  errorMessage = signal('');
  isLoading = signal(false);
  showPassword = signal(false);

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (data) => {
        const loginResponse: LoginResponse = data;
        this.authService.setAccessToken(loginResponse);
          if(data.mustChangePassword == true){
            this.router.navigateByUrl('/change-password-user');
          }else{
            // 1 edificio → directo a su dashboard; varios → tarjetas en /inicio
            this.buildingService
              .resolveLandingUrl(this.authService.getRole())
              .subscribe((url) => this.router.navigateByUrl(url));
          }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Credenciales inválidas');
        console.error(err);
      }
    });
  }
}
