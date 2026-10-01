import { inject, Service, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../auth/auth-service';
import { NotificationService } from './notification-service';
import { NotificationPayload, NotificationItem } from './notification-models';
import { ToastService } from '../../../shared/toast/toast-service';

@Service()
export class SignalRService {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private toastService = inject(ToastService);
  private zone = inject(NgZone);

  private connection: signalR.HubConnection | null = null;

  /** Inicia la conexión al hub de notificaciones */
  async connect(): Promise<void> {
    // Si ya existe una conexión activa, no duplicar
    if (
      this.connection &&
      this.connection.state === signalR.HubConnectionState.Connected
    ) {
      return;
    }

    const hubUrl = `${environment.apiUrl}/hubs/notifications`;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.authService.getAccessToken()?.token ?? '',
      })
      .withAutomaticReconnect()
      .build();

    // Suscribir al evento genérico
    this.connection.on('NewNotification', (payload: NotificationPayload) => {
      this.zone.run(() => this.handleNotification(payload));
    });

    // Al reconectar, resincronizar el contador de no leídas
    this.connection.onreconnected(() => {
      this.zone.run(() => this.notificationService.loadUnreadCount());
    });

    try {
      await this.connection.start();
    } catch (err) {
      console.error('SignalR: error al conectar', err);
    }
  }

  /** Desconecta del hub */
  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {
        // Ignorar errores al desconectar
      }
      this.connection = null;
    }
  }

  /** Procesa una notificación recibida en tiempo real */
  private handleNotification(payload: NotificationPayload): void {
    // Mostrar toast informativo
    this.toastService.info(`${payload.title}: ${payload.message}`);

    // Agregar a la lista reactiva
    const item: NotificationItem = {
      id: payload.id,
      eventType: payload.eventType,
      title: payload.title,
      message: payload.message,
      isRead: false,
      dateCreated: new Date().toISOString(),
    };

    this.notificationService.prependNotification(item);
  }
}
