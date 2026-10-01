import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ReservableSpaceDetailsService } from '../../../core/services/reservable-spaces/reservable-space-details';
import { ReservableSpaceService } from '../../../core/services/reservable-spaces/reservable-spaces';
import {
  GetReservableSpaceDetailsResponse,
  ReservableSpaceResponse,
} from '../../../core/services/reservable-spaces/reservable-space-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  reservations: GetReservableSpaceDetailsResponse[];
}

@Component({
  selector: 'app-tenant-reservations',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './tenant-reservations.html',
  styleUrl: './tenant-reservations.css',
})
export class TenantReservations {
  private detailsService = inject(ReservableSpaceDetailsService);
  private spaceService = inject(ReservableSpaceService);
  private toast = inject(ToastService);
  protected modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);

  reservations = signal<GetReservableSpaceDetailsResponse[]>([]);
  spaces = signal<ReservableSpaceResponse[]>([]);
  isLoading = signal(true);

  currentDate = signal(new Date());
  calendarDays = signal<CalendarDay[]>([]);
  selectedDay = signal<CalendarDay | null>(null);
  activeTab = signal<'calendar' | 'list'>('calendar');

  readonly weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  currentMonthLabel = computed(() => {
    const d = this.currentDate();
    return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  });

  ngOnInit(): void {
    this.breadcrumbService.set([
      { label: 'Mis Reservaciones', path: '/my-reservations' },
    ]);
    this.loadSpaces();
    this.loadReservations();
  }

  private loadSpaces(): void {
    // Tenant gets all available spaces (no buildingId filter needed, backend filters by tenant)
    this.spaceService.getByBuilding('').subscribe({
      next: (data) => this.spaces.set(data.reservableSpaceResponses.items),
      error: () => {},
    });
  }

  private loadReservations(): void {
    this.isLoading.set(true);
    this.detailsService.getAll(undefined, 1, 200).subscribe({
      next: (data) => {
        this.reservations.set(data.items);
        this.buildCalendar();
        this.isLoading.set(false);
      },
      error: (ex) => {
        this.isLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al cargar tus reservaciones');
      },
    });
  }

  setTab(tab: 'calendar' | 'list'): void {
    this.activeTab.set(tab);
  }

  prevMonth(): void {
    const d = new Date(this.currentDate());
    d.setMonth(d.getMonth() - 1);
    this.currentDate.set(d);
    this.buildCalendar();
  }

  nextMonth(): void {
    const d = new Date(this.currentDate());
    d.setMonth(d.getMonth() + 1);
    this.currentDate.set(d);
    this.buildCalendar();
  }

  goToToday(): void {
    this.currentDate.set(new Date());
    this.buildCalendar();
  }

  selectDay(day: CalendarDay): void {
    if (day.isCurrentMonth) {
      this.selectedDay.set(day);
    }
  }

  closeDetail(): void {
    this.selectedDay.set(null);
  }

  private buildCalendar(): void {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    const today = new Date();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const days: CalendarDay[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false, isToday: false, reservations: [] });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      const isToday = d.toDateString() === today.toDateString();
      const dayReservations = this.getReservationsForDate(d);
      days.push({ date: d, isCurrentMonth: true, isToday, reservations: dayReservations });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, isToday: false, reservations: [] });
    }

    this.calendarDays.set(days);
  }

  private getReservationsForDate(date: Date): GetReservableSpaceDetailsResponse[] {
    return this.reservations().filter((r) => {
      const start = new Date(r.startTime);
      const end = new Date(r.endTime);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      return start <= dayEnd && end >= dayStart;
    });
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'aprobada':
        return 'status-approved';
      case 'pending':
      case 'pendiente':
        return 'status-pending';
      case 'rejected':
      case 'rechazada':
        return 'status-rejected';
      case 'cancelled':
      case 'cancelada':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }

  getStatusLabel(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved': return 'Aprobada';
      case 'pending': return 'Pendiente';
      case 'rejected': return 'Rechazada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  }

  openCreateModal(): void {
    this.modalService.open('create-reservation', {
      spaces: this.spaces(),
    });
  }
}
