/* ============================================================
   Notification Models
   ============================================================ */

/** Notificación individual (GET /api/notifications) */
export interface NotificationItem {
  id: string;
  eventType: string;
  title: string;
  message: string;
  isRead: boolean;
  dateCreated: string; // ISO 8601
}

/** Respuesta del contador de no leídas */
export interface UnreadCountResponse {
  unreadCount: number;
}

/** Payload que llega por SignalR en tiempo real */
export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  eventType: string;
}

/** Request para crear una notificación (POST /api/notifications) */
export interface CreateNotificationRequest {
  eventType: string;
  title: string;
  message: string;
  userId: string | null;
  buildingId: string | null;
}

/** Response al crear una notificación (201) */
export interface CreateNotificationResponse {
  id: string;
  eventType: string;
  title: string;
  message: string;
  dateCreated: string;
}
