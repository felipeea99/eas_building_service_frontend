import { Component, inject, signal, ElementRef, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../core/services/notifications/notification-service';
import { AuthService } from '../../core/services/auth/auth-service';

@Component({
  selector: 'app-notification-dropdown',
  imports: [DatePipe, RouterLink],
  templateUrl: './notification-dropdown.html',
  styleUrl: './notification-dropdown.css',
})
export class NotificationDropdown {
  protected readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly elRef = inject(ElementRef);

  readonly isOpen = signal(false);

  /** Roles que pueden crear notificaciones */
  readonly canCreate = () => {
    const role = this.authService.getRole();
    return ['SuperAdmin', 'Admin', 'Manager', 'Staff'].includes(role ?? '');
  };

  toggle(): void {
    const willOpen = !this.isOpen();
    this.isOpen.set(willOpen);

    if (willOpen) {
      this.notificationService.loadNotifications();
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  onMarkAsRead(id: string): void {
    this.notificationService.markAsRead(id).subscribe();
  }

  onMarkAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;

    if (nearBottom) {
      this.notificationService.loadMore();
    }
  }

  /** Cerrar el dropdown al hacer click fuera */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (this.isOpen() && !this.elRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }
}
