import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
  // Public Landing
  {
    path: '',
    loadComponent: () => import('./core/landing/landing').then((c) => c.Landing),
    canActivate: [guestGuard],
  },
  // Auth Routes
  {
    path: 'login',
    loadComponent: () => import('./core/auth/login/login').then((c) => c.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./core/auth/forgot-password/forgot-password').then((c) => c.ForgotPassword),
    canActivate: [guestGuard],
  },
  {
    path: 'reset-password/:token',
    loadComponent: () =>
      import('./core/auth/reset-password/reset-password').then((c) => c.ResetPassword),
    canActivate: [guestGuard],
  },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./features/inicio/inicio-handler/inicio-handler').then((c) => c.InicioHandler),
    canActivate: [authGuard],
  },
  {
    path: 'create-account',
    loadComponent: () =>
      import('./core/auth/register-admin/register-admin').then((c) => c.RegisterAdmin),
    canActivate: [guestGuard],
  },
  {
    path: 'index-users',
    loadComponent: () =>
      import('./features/users/index-users/index-users').then((c) => c.IndexUsers),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'] },
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./shared/forbidden/forbidden').then((c) => c.Forbidden),
  },
  {
    path: 'change-password-user',
    loadComponent: () =>
      import('./core/auth/change-password/change-password').then((c) => c.ChangePassword),
  },
  // Building routes
  {
    path: 'assign-buildings',
    loadComponent: () =>
      import('./features/building/assing-buildings/assing-buildings').then((c) => c.AssingBuildings),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin','Admin', 'Manager'] },
  },
  // Parking Spot routes
  {
    path: 'parking-spots/:buildingId',
    loadComponent: () =>
      import('./features/parking-spots/index-parking-spots/index-parking-spots').then((c) => c.IndexParkingSpots),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'] },
  },
  // Reservable Spaces routes
  {
    path: 'reservable-spaces/:buildingId',
    loadComponent: () =>
      import('./features/reservable-spaces/index-reservable-spaces/index-reservable-spaces').then((c) => c.IndexReservableSpaces),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'] },
  },
  // Reservations routes (admin/staff)
  {
    path: 'reservations/:buildingId',
    loadComponent: () =>
      import('./features/reservable-spaces/index-reservations/index-reservations').then((c) => c.IndexReservations),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'] },
  },
  // Tenant reservations
  {
    path: 'my-reservations',
    loadComponent: () =>
      import('./features/reservable-spaces/tenant-reservations/tenant-reservations').then((c) => c.TenantReservations),
    canActivate: [authGuard],
    data: { roles: ['Client'] },
  },
  // Tenant Clients routes
  {
    path: 'tenant-clients',
    loadComponent: () =>
      import('./features/tenant-clients/index-tenant-clients/index-tenant-clients').then((c) => c.IndexTenantClients),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'] },
  },
  {
    path: 'tenant-clients/:buildingId',
    loadComponent: () =>
      import('./features/tenant-clients/index-tenant-clients/index-tenant-clients').then((c) => c.IndexTenantClients),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'] },
  },
  // Incidencias y morosos por edificio
  {
    path: 'incidents/:buildingId',
    loadComponent: () =>
      import('./features/incidents/index-incidents/index-incidents').then((c) => c.IndexIncidents),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'] },
  },
  // Encuestas (staff)
  {
    path: 'surveys/:buildingId',
    loadComponent: () =>
      import('./features/surveys/index-surveys/index-surveys').then((c) => c.IndexSurveys),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'] },
  },
  {
    path: 'surveys/:buildingId/:surveyId/results',
    loadComponent: () =>
      import('./features/surveys/survey-results/survey-results').then((c) => c.SurveyResults),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'] },
  },
  // Encuestas (cliente)
  {
    path: 'my-surveys',
    loadComponent: () =>
      import('./features/surveys/my-surveys/my-surveys').then((c) => c.MySurveys),
    canActivate: [authGuard],
    data: { roles: ['Client'] },
  },
  {
    path: 'my-surveys/:surveyId',
    loadComponent: () =>
      import('./features/surveys/answer-survey/answer-survey').then((c) => c.AnswerSurvey),
    canActivate: [authGuard],
    data: { roles: ['Client'] },
  },
  // Avisos de paquete (staff / guardia)
  {
    path: 'packages/:buildingId',
    loadComponent: () =>
      import('./features/package-notices/index-packages/index-packages').then((c) => c.IndexPackages),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard'] },
  },
  // Avisos de paquete (cliente)
  {
    path: 'my-packages',
    loadComponent: () =>
      import('./features/package-notices/my-packages/my-packages').then((c) => c.MyPackages),
    canActivate: [authGuard],
    data: { roles: ['Client'] },
  },
  // Bitácora: seguimientos pendientes
  {
    path: 'follow-ups',
    loadComponent: () =>
      import('./features/internal-notes/index-follow-ups/index-follow-ups').then((c) => c.IndexFollowUps),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'] },
  },
  // Unit routes
  {
    path: 'index-units',
    loadComponent: () =>
      import('./features/units/index-units/index-units').then((c) => c.IndexUnits),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard'] },
  },
  {
    path: 'index-units/:buildingId',
    loadComponent: () =>
      import('./features/units/index-units/index-units').then((c) => c.IndexUnits),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard'] },
  },
  // Contract routes
  {
    path: 'contracts/:buildingId',
    loadComponent: () =>
      import('./features/contracts/index-contracts/index-contracts').then((c) => c.IndexContracts),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Client'] },
  },
  // Authorized Visits routes
  {
    path: 'authorized-visits',
    loadComponent: () =>
      import('./features/authorized-visits/index-authorized-visits/index-authorized-visits').then((c) => c.IndexAuthorizedVisits),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard', 'Client'] },
  },
  {
    path: 'authorized-visits/:buildingId',
    loadComponent: () =>
      import('./features/authorized-visits/index-authorized-visits/index-authorized-visits').then((c) => c.IndexAuthorizedVisits),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard', 'Client'] },
  },
    // Notifications
  {
    path: 'notifications',
    loadComponent: () =>
      import('./features/notifications/index-notifications/index-notifications').then((c) => c.IndexNotifications),
    canActivate: [authGuard],
  },
  // Building Dashboard
  {
    path: 'building-dashboard/:buildingId',
    loadComponent: () =>
      import('./features/building-dashboard/building-dashboard/building-dashboard').then((c) => c.BuildingDashboard),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard', 'Client'] },
  },
  {
    path: 'qr-scanner',
    loadComponent: () =>
      import('./features/authorized-visits/qr-scanner/qr-scanner').then((c) => c.QrScanner),
    canActivate: [authGuard],
    data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard'] },
  },
  // Default Route
  {
    path: '**',
    redirectTo: '/login',
  },
];
