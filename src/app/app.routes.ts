import { Routes } from '@angular/router';
import { LoginComponent } from './core/auth/login/login';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./core/auth/login/login').then(m => m.LoginComponent)
  }
];
