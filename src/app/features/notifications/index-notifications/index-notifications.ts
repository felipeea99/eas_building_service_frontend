import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationService } from '../../../core/services/notifications/notification-service';
import { NotificationItem } from '../../../core/services/notifications/notification-models';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { Toolbar, ToolbarFilter, ToolbarFilterChange } from '../../../shared/toolbar/toolbar';

/** Mapa de eventType → icono SVG path + color */
interface CategoryMeta {
  icon: string;   // SVG path(s) inside viewBox 0 0 24 24
  color: string;  // CSS color token
  label: string;
}

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  Reservation: {
    icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    color: '#6366f1',
    label: 'Reservación',
  },
  Parking: {
    icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
    color: '#0ea5e9',
    label: 'Estacionamiento',
  },
  Payment: {
    icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    color: '#10b981',
    label: 'Pago',
  },
  Contract: {
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    color: '#f59e0b',
    label: 'Contrato',
  },
  Maintenance: {
    icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    color: '#ef4444',
    label: 'Mantenimiento',
  },
  Visit: {
    icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    color: '#8b5cf6',
    label: 'Visita',
  },
  System: {
    icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    color: '#64748b',
    label: 'Sistema',
  },
};

const DEFAULT_CATEGORY: CategoryMeta = {
  icon: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  color: '#64748b',
  label: 'General',
};

@Component({
  selector: 'app-index-notifications',
  imports: [DatePipe, Toolbar],
  templateUrl: './index-notifications.html',
  styleUrl: './index-notifications.css',
})
export class IndexNotifications {
  protected readonly notificationService = inject(NotificationService);
  private readonly breadcrumbService = inject(BreadcrumbService);

  private searchTerm = signal('');
  private filterType = signal<string>('');
  private filterStatus = signal<string>('');

  /** Notificaciones filtradas */
  readonly filtered = computed(() => {
    let list = this.notificationService.notifications();

    const term = this.searchTerm().toLowerCase();
    if (term) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          n.message.toLowerCase().includes(term),
      );
    }

    const type = this.filterType();
    if (type) {
      list = list.filter((n) => n.eventType === type);
    }

    const status = this.filterStatus();
    if (status === 'unread') {
      list = list.filter((n) => !n.isRead);
    } else if (status === 'read') {
      list = list.filter((n) => n.isRead);
    }

    return list;
  });

  /** Filtros del toolbar */
  readonly toolbarFilters: ToolbarFilter[] = [
    {
      key: 'type',
      label: 'Tipo',
      options: [
        { value: 'Reservation', label: 'Reservación' },
        { value: 'Parking', label: 'Estacionamiento' },
        { value: 'Payment', label: 'Pago' },
        { value: 'Contract', label: 'Contrato' },
        { value: 'Maintenance', label: 'Mantenimiento' },
        { value: 'Visit', label: 'Visita' },
        { value: 'System', label: 'Sistema' },
      ],
    },
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'unread', label: 'No leídas' },
        { value: 'read', label: 'Leídas' },
      ],
    },
  ];

  ngOnInit(): void {
    this.breadcrumbService.set([
      { label: 'Inicio', path: '/inicio' },
      { label: 'Notificaciones', path: '/notifications' },
    ]);
    this.notificationService.loadNotifications();
    this.notificationService.loadUnreadCount();
  }

  /** Obtener meta de categoría */
  getCategoryMeta(eventType: string): CategoryMeta {
    return CATEGORY_MAP[eventType] ?? DEFAULT_CATEGORY;
  }

  getCategoryColor(eventType: string): string {
    return this.getCategoryMeta(eventType).color;
  }

  getCategoryLabel(eventType: string): string {
    return this.getCategoryMeta(eventType).label;
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  onFilterChange(change: ToolbarFilterChange): void {
    if (change.key === 'type') {
      this.filterType.set(change.value ?? '');
    } else if (change.key === 'status') {
      this.filterStatus.set(change.value ?? '');
    }
  }

  markAsRead(n: NotificationItem): void {
    if (!n.isRead) {
      this.notificationService.markAsRead(n.id).subscribe();
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) {
      this.notificationService.loadMore();
    }
  }

  /** Tiempo relativo */
  timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `Hace ${diffHr}h`;

    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  }
}
