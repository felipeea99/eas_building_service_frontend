/* ============================================================
   Navbar — Definición centralizada del menú
   ------------------------------------------------------------
   Cada MenuItem puede tener hijos (children) y se filtra por
   rol del usuario.

   Se Usa '*' en roles para dar acceso a todos.

   Para agregar una nueva sección al navbar:
     1. Se Agrega el MenuItem aquí con su route, icon y roles.
     2. Si se necesita icono nuevo, agrega el case en el
        ng-template #iconTpl del navbar.html.
     3. Si es una página nueva, regístrala en app.routes.ts.
   ============================================================ */

export interface MenuItem {
  label: string;
  icon: string;
  roles: string[];
  route?: string;
  action?: string;
  children?: MenuItem[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Mi cuenta',
    icon:  'user',
    roles: ['*'],
    children: [
      {
        label:  'Cerrar sesión',
        icon:   'logout',
        roles:  ['*'],
        action: 'logout',
      },
    ],
  },
  {
    label: 'Edificios',
    icon:  'building',
    roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard'],
    children: [
      {
        label: 'Edificios',
        route: '/buildings',
        icon:  'building',
        roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard'],
      },
      {
        label: 'Unidades',
        route: '/index-units',
        icon:  'unit',
        roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard'],
      },
      {
        label: 'Contratos',
        route: '/contracts',
        icon:  'contract',
        roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'],
      },
    ],
  },
  {
    label: 'Usuarios',
    icon:  'users',
    roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'],
    children: [
      {
        label: 'Usuarios',
        route: '/index-users',
        icon:  'users',
        roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'],
      },
      {
        label: 'Seguimientos',
        route: '/follow-ups',
        icon:  'clock',
        roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'],
      },
    ],
  },
  {
    label: 'Mis Reservaciones',
    icon:  'calendar',
    roles: ['Client'],
    route: '/my-reservations',
  },
  {
    label: 'Mis Encuestas',
    icon:  'survey',
    roles: ['Client'],
    route: '/my-surveys',
  },
  {
    label: 'Mis Paquetes',
    icon:  'package',
    roles: ['Client'],
    route: '/my-packages',
  },
  {
    label: 'Tema',
    icon:  'theme',
    roles: ['*'],
  },
];
