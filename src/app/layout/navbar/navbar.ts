import { Component, computed, effect, inject, signal, OnDestroy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/services/auth/auth-service';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';
import { ThemeService } from '../../core/services/theme/theme-service';
import { MenuItem, MENU_ITEMS } from './menu-items';
import { ModalService } from '../../shared/modal/modal-service';
import { NotificationDropdown } from '../../shared/notification-dropdown/notification-dropdown';
import { SignalRService } from '../../core/services/notifications/signalr-service';
import { NotificationService } from '../../core/services/notifications/notification-service';

@Component({
  selector: 'app-navbar',
  imports: [ThemeToggle, RouterLink, NgTemplateOutlet, NotificationDropdown],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnDestroy {
  public router = inject(Router);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private modalService = inject(ModalService);
  private signalRService = inject(SignalRService);
  private notificationService = inject(NotificationService);

  isMobileMenuOpen = false;

  /** Dropdown abierto en desktop (hover) */
  openDropdown = signal<string | null>(null);

  /** Submenú abierto en mobile (slide) */
  mobileSubmenu = signal<MenuItem | null>(null);

  readonly menuItems = MENU_ITEMS;

  /** Items filtrados por el rol actual */
  readonly visibleItems = computed(() => {
    const role = this.authService.getRole() ?? '';
    return this.menuItems.filter(item =>
      item.roles.includes('*') || item.roles.includes(role)
    );
  });

  /** Mostrar la campana solo si el usuario está autenticado */
  readonly isAuthenticated = computed(() => !!this.authService.getAccessToken());

  getVisibleChildren(item: MenuItem): MenuItem[] {
    const role = this.authService.getRole() ?? '';
    return (item.children ?? []).filter(child =>
      child.roles.includes('*') || child.roles.includes(role)
    );
  }

  /** Señal que se actualiza en cada navegación */
  currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  /** Rutas donde nunca se muestra la navbar (públicas / flujo de auth) */
  private readonly hiddenRoutes = ['/', '/landing', '/login', '/forgot-password', '/change-password-user', '/create-account'];

  /** La navbar solo se muestra con sesión activa y fuera de las rutas ocultas */
  readonly showNavbar = computed(() => {
    const url = (this.currentUrl() ?? '').split('?')[0].split('#')[0];
    const isHiddenRoute = this.hiddenRoutes.includes(url) || url.startsWith('/reset-password');
    return this.isAuthenticated() && !isHiddenRoute;
  });

  isDark = computed(() => this.themeService.theme() === 'dark');

  readonly userName = computed(() => this.authService.getAccessToken()?.fullName ?? 'Mi cuenta');
  readonly userRole = computed(() => this.authService.getRole() ?? '');

  /** Reacciona a cambios de autenticación para conectar/desconectar SignalR */
  private authEffect = effect(() => {
    const authenticated = this.isAuthenticated();
    if (authenticated) {
      this.signalRService.connect();
      this.notificationService.loadUnreadCount();
    }
  });

  ngOnDestroy(): void {
    this.signalRService.disconnect();
  }

  // ---- Acciones ----

  onAction(item: MenuItem): void {
    if (item.action?.startsWith('modal:')) {
      const modalType = item.action.replace('modal:', '');
      this.modalService.open(modalType);
      this.closeMobileMenu();
    } else if (item.action === 'logout') {
      this.onLogOut();
    } else if (item.action === 'toggleTheme') {
      this.themeService.toggleTheme();
    } else if (item.route) {
      this.router.navigate([item.route]);
      this.closeMobileMenu();
    }
  }

  onLogOut(): void {
    // Desconectar SignalR y resetear estado antes de salir
    this.signalRService.disconnect();
    this.notificationService.reset();

    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

  // ---- Desktop dropdown ----

  openDesktopDropdown(label: string): void {
    this.openDropdown.set(label);
  }

  closeDesktopDropdown(): void {
    this.openDropdown.set(null);
  }

  // ---- Mobile ----

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (!this.isMobileMenuOpen) {
      this.mobileSubmenu.set(null);
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.mobileSubmenu.set(null);
  }

  openMobileSubmenu(item: MenuItem): void {
    this.mobileSubmenu.set(item);
  }

  closeMobileSubmenu(): void {
    this.mobileSubmenu.set(null);
  }
}
