import { inject, Service, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { PaginatedResponse } from '../../../shared/shared-models';
import {
  NotificationItem,
  UnreadCountResponse,
  CreateNotificationRequest,
  CreateNotificationResponse,
} from './notification-models';

@Service()
export class NotificationService {
  private http = inject(HttpClient);

  private readonly _unreadCount = signal(0);
  private readonly _notifications = signal<NotificationItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _currentPage = signal(1);
  private readonly _hasNextPage = signal(false);

  /** Signals de solo lectura */
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly notifications = this._notifications.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasNextPage = this._hasNextPage.asReadonly();

  private readonly pageSize = 40;

  // ---- Lectura ----

  /** Carga la primera página de notificaciones */
  loadNotifications(): void {
    this._loading.set(true);
    this._currentPage.set(1);

    this.http
      .get<PaginatedResponse<NotificationItem>>(
        `${environment.apiUrl}/api/notifications`,
        { params: { page: 1, pageSize: this.pageSize } },
      )
      .subscribe({
        next: (res) => {
          this._notifications.set(res.items);
          this._hasNextPage.set(res.hasNextPage);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      });
  }

  /** Carga la siguiente página y concatena */
  loadMore(): void {
    if (this._loading() || !this._hasNextPage()) return;

    this._loading.set(true);
    const nextPage = this._currentPage() + 1;

    this.http
      .get<PaginatedResponse<NotificationItem>>(
        `${environment.apiUrl}/api/notifications`,
        { params: { page: nextPage, pageSize: this.pageSize } },
      )
      .subscribe({
        next: (res) => {
          this._currentPage.set(nextPage);
          this._notifications.update((list) => [...list, ...res.items]);
          this._hasNextPage.set(res.hasNextPage);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      });
  }

  /** Obtiene el contador de no leídas */
  loadUnreadCount(): void {
    this.http
      .get<UnreadCountResponse>(
        `${environment.apiUrl}/api/notifications/unread-count`,
      )
      .subscribe({
        next: (res) => this._unreadCount.set(res.unreadCount),
      });
  }

  // ---- Escritura ----

  /** Marca una notificación como leída */
  markAsRead(id: string): Observable<void> {
    return this.http
      .put<void>(`${environment.apiUrl}/api/notifications/${id}/read`, {})
      .pipe(
        tap(() => {
          this._notifications.update((list) =>
            list.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
          );
          this._unreadCount.update((c) => Math.max(0, c - 1));
        }),
      );
  }

  /** Marca todas como leídas */
  markAllAsRead(): Observable<void> {
    return this.http
      .put<void>(`${environment.apiUrl}/api/notifications/read-all`, {})
      .pipe(
        tap(() => {
          this._notifications.update((list) =>
            list.map((n) => ({ ...n, isRead: true })),
          );
          this._unreadCount.set(0);
        }),
      );
  }

  /** Crea una notificación (solo Staff+) */
  create(req: CreateNotificationRequest): Observable<CreateNotificationResponse> {
    return this.http.post<CreateNotificationResponse>(
      `${environment.apiUrl}/api/notifications`,
      req,
    );
  }

  // ---- Helpers para SignalR ----

  /** Agrega una notificación al inicio de la lista (llegó en tiempo real) */
  prependNotification(item: NotificationItem): void {
    this._notifications.update((list) => [item, ...list]);
    this._unreadCount.update((c) => c + 1);
  }

  /** Resetea el estado (logout) */
  reset(): void {
    this._notifications.set([]);
    this._unreadCount.set(0);
    this._currentPage.set(1);
    this._hasNextPage.set(false);
  }
}
