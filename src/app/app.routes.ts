import { Routes } from '@angular/router';
import { LoginComponent } from './core/auth/login/login';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./core/auth/login/login').then(m => m.LoginComponent),
  },

  {
    path: 'login',
    loadComponent: () => import('./core/auth/login/login').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'inicio',
    loadComponent: () => import('./features/inicio/inicio-handler/inicio-handler').then(m => m.InicioHandler),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  },
];
