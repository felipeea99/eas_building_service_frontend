import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthorizedVisitService } from '../../../core/services/authorized-visits/authorized-visit-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { GetAuthorizedVisitResponse } from '../../../core/services/authorized-visits/authorized-visit-models';
import { Toolbar, ToolbarFilter, ToolbarFilterChange } from '../../../shared/toolbar/toolbar';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { BuildingContextService } from '../../../core/services/building/building-context-service';
import { AuthService } from '../../../core/services/auth/auth-service';
import QRCode from 'qrcode';

/** Propósitos predefinidos para visitas */
export const VISIT_PURPOSES = [
  'Visita familiar',
  'Visita social',
  'Entrega de paquete',
  'Servicio de mantenimiento',
  'Servicio de limpieza',
  'Mudanza',
  'Reparación',
  'Reunión de trabajo',
  'Servicio médico',
  'Otro',
] as const;

@Component({
  selector: 'app-index-authorized-visits',
  imports: [DatePipe, Toolbar],
  templateUrl: './index-authorized-visits.html',
  styleUrl: './index-authorized-visits.css',
})
export class IndexAuthorizedVisits {
  private route = inject(ActivatedRoute);
  private visitService = inject(AuthorizedVisitService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);
  private buildingContext = inject(BuildingContextService);
  private authService = inject(AuthService);
  router = inject(Router);

  buildingId = signal<string>('');
  visits = signal<GetAuthorizedVisitResponse[]>([]);
  filteredVisits = signal<GetAuthorizedVisitResponse[]>([]);
  isLoading = signal(false);
  qrImages = signal<Record<string, string>>({});

  /** QR lightbox */
  qrModalVisit = signal<GetAuthorizedVisitResponse | null>(null);
  qrModalLargeImage = signal<string>('');

  private searchTerm = '';
  private activeFilters: Record<string, string> = {};

  readonly visitPurposes = VISIT_PURPOSES;

  readonly toolbarFilters: ToolbarFilter[] = [
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'valid', label: 'Válida' },
        { value: 'cancelled', label: 'Cancelada' },
        { value: 'expired', label: 'Expirada' },
        { value: 'inside', label: 'Dentro' },
      ],
    },
  ];

  /** true para SuperAdmin, Admin, Manager, Staff, Guard */
  isStaff = false;

  ngOnInit(): void {
    const role = this.authService.getRole();
    const staffRoles = ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard'];
    this.isStaff = staffRoles.includes(role ?? '');

    const bc = this.buildingContext.current();
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
      ...(bc ? [{ label: bc.name, path: `/building-dashboard/${bc.id}` }] : []),
      { label: 'Visitas autorizadas', path: `/authorized-visits/${this.buildingId()}` },
    ]);
    this.route.params.subscribe(params => {
      if (params['buildingId']) {
        this.buildingId.set(params['buildingId']);
        this.loadVisits();
      }
    });
  }

  private loadVisits(): void {
    if (!this.buildingId()) return;
    this.isLoading.set(true);
    this.visitService.getAuthorizedVisits(this.buildingId()).subscribe({
      next: (data) => {
        this.visits.set(data.items);
        this.filteredVisits.set(data.items);
        this.isLoading.set(false);
        this.generateQRImages(data.items);
      },
      error: (ex) => {
        this.isLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al cargar las visitas');
      },
    });
  }

  private async generateQRImages(visits: GetAuthorizedVisitResponse[]): Promise<void> {
    const images: Record<string, string> = {};
    for (const visit of visits) {
      try {
        images[visit.id] = await QRCode.toDataURL(visit.qrCode, {
          width: 140,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } catch {
        // Si falla la generación, se omite silenciosamente
      }
    }
    this.qrImages.set(images);
  }

  /** Abre el QR en lightbox grande */
  async openQRModal(visit: GetAuthorizedVisitResponse): Promise<void> {
    this.qrModalVisit.set(visit);
    try {
      const largeImage = await QRCode.toDataURL(visit.qrCode, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      this.qrModalLargeImage.set(largeImage);
    } catch {
      // Fallback a la imagen pequeña
      this.qrModalLargeImage.set(this.qrImages()[visit.id] ?? '');
    }
  }

  closeQRModal(): void {
    this.qrModalVisit.set(null);
    this.qrModalLargeImage.set('');
  }

  downloadQR(visit: GetAuthorizedVisitResponse): void {
    // Genera imagen grande para descarga
    QRCode.toDataURL(visit.qrCode, {
      width: 600,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(dataUrl => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `qr-${visit.visitorName.replace(/\s+/g, '-')}.png`;
      link.click();
    }).catch(() => {
      this.toast.error('Error al generar el QR para descarga');
    });
  }

  onSearch(term: string): void {
    this.searchTerm = term.toLowerCase();
    this.applyFilters();
  }

  onFilterChange(change: ToolbarFilterChange): void {
    if (change.value) {
      this.activeFilters[change.key] = change.value;
    } else {
      delete this.activeFilters[change.key];
    }
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = this.visits();

    if (this.searchTerm) {
      result = result.filter(v =>
        v.visitorName.toLowerCase().includes(this.searchTerm) ||
        (v.purpose?.toLowerCase().includes(this.searchTerm) ?? false),
      );
    }

    if (this.activeFilters['status']) {
      result = result.filter(v => {
        switch (this.activeFilters['status']) {
          case 'valid': return v.isValid && !v.isInside;
          case 'cancelled': return v.isCancelled;
          case 'expired': return !v.isValid && !v.isCancelled;
          case 'inside': return v.isInside;
          default: return true;
        }
      });
    }

    this.filteredVisits.set(result);
  }

  onAddVisit(): void {
    this.modalService.open('create-authorized-visit');
  }

  registerEntry(visit: GetAuthorizedVisitResponse): void {
    if (!visit.isValid) {
      this.toast.error('La visita no es válida o está expirada');
      return;
    }
    if (visit.isInside) {
      this.toast.error('El visitante ya se encuentra dentro');
      return;
    }
    this.visitService.registerEntry(visit.id).subscribe({
      next: () => {
        this.toast.success('Entrada registrada correctamente');
        this.loadVisits();
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al registrar la entrada');
      },
    });
  }

  registerExit(visit: GetAuthorizedVisitResponse): void {
    if (!visit.isInside) {
      this.toast.error('El visitante no se encuentra dentro');
      return;
    }
    this.visitService.registerExit(visit.id).subscribe({
      next: () => {
        this.toast.success('Salida registrada correctamente');
        this.loadVisits();
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al registrar la salida');
      },
    });
  }

  cancelVisit(visit: GetAuthorizedVisitResponse): void {
    if (visit.isCancelled) {
      this.toast.error('La visita ya fue cancelada');
      return;
    }
    this.visitService.cancel(visit.id).subscribe({
      next: () => {
        this.toast.success('Visita cancelada correctamente');
        this.loadVisits();
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al cancelar la visita');
      },
    });
  }

  getStatusLabel(visit: GetAuthorizedVisitResponse): string {
    if (visit.isCancelled) return 'Cancelada';
    if (visit.isInside) return 'Dentro';
    if (!visit.isValid) return 'Expirada';
    return 'Válida';
  }

  getStatusClass(visit: GetAuthorizedVisitResponse): string {
    if (visit.isCancelled) return 'status-cancelled';
    if (visit.isInside) return 'status-inside';
    if (!visit.isValid) return 'status-expired';
    return 'status-valid';
  }
}
