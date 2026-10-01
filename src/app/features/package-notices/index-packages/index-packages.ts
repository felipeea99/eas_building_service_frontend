import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { timeout, TimeoutError } from 'rxjs';
import { PackageNoticeService } from '../../../core/services/package-notices/package-notice-service';
import {
  PACKAGE_NOTICE_STATE_LABELS,
  PackageNoticeResponse,
  PackageNoticeStateValue,
} from '../../../core/services/package-notices/package-notice-models';
import { BuildingContextService } from '../../../core/services/building/building-context-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { Toolbar } from '../../../shared/toolbar/toolbar';

type PackagesTab = 'pending' | 'received' | 'cancelled';

const REQUEST_TIMEOUT = 10_000;
const TAB_STATE: Record<PackagesTab, PackageNoticeStateValue> = {
  pending: PackageNoticeStateValue.Pending,
  received: PackageNoticeStateValue.Received,
  cancelled: PackageNoticeStateValue.Cancelled,
};

/**
 * Página (staff / guardia): avisos de paquete del edificio.
 * En espera → botón "Recibido" (la fecha de recepción la pone el backend y se avisa al cliente).
 * Ruta: /packages/:buildingId
 */
@Component({
  selector: 'app-index-packages',
  imports: [DatePipe, Toolbar],
  templateUrl: './index-packages.html',
  styleUrl: './index-packages.css',
})
export class IndexPackages implements OnInit {
  private packageNoticeService = inject(PackageNoticeService);
  private buildingContext = inject(BuildingContextService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);
  private route = inject(ActivatedRoute);

  readonly stateLabels = PACKAGE_NOTICE_STATE_LABELS;

  buildingId = '';
  activeTab = signal<PackagesTab>('pending');

  notices = signal<PackageNoticeResponse[]>([]);
  filteredNotices = signal<PackageNoticeResponse[]>([]);
  totalCount = signal(0);
  isLoading = signal(true);
  busyId = signal<string | null>(null);

  private searchTerm = '';

  ngOnInit(): void {
    this.buildingId = this.route.snapshot.paramMap.get('buildingId') ?? '';

    const bc = this.buildingContext.current();
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
      ...(bc ? [{ label: bc.name, path: `/building-dashboard/${bc.id}` }] : []),
      { label: 'Paquetes', path: `/packages/${this.buildingId}` },
    ]);

    this.load();
  }

  setTab(tab: PackagesTab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);

    this.packageNoticeService
      .getByBuilding({
        buildingId: this.buildingId,
        state: TAB_STATE[this.activeTab()],
        page: 1,
        pageSize: 100,
      })
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: (res) => {
          this.notices.set(res.items);
          this.totalCount.set(res.totalCount);
          this.applySearch();
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          this.toast.error(this.errorMessage(ex, 'Error al cargar los paquetes'));
        },
      });
  }

  onSearch(term: string): void {
    this.searchTerm = term.trim().toLowerCase();
    this.applySearch();
  }

  private applySearch(): void {
    const term = this.searchTerm;
    if (!term) {
      this.filteredNotices.set(this.notices());
      return;
    }

    this.filteredNotices.set(
      this.notices().filter((n) =>
        [n.carrierCompany, n.itemDescription ?? '', n.tenantClientName, n.unitName]
          .some((value) => value.toLowerCase().includes(term)),
      ),
    );
  }

  /** true si ya pasó la fecha esperada y sigue en espera */
  isLate(notice: PackageNoticeResponse): boolean {
    if (notice.state !== 'Pending') return false;
    const expected = notice.expectedDate.substring(0, 10);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return expected < today;
  }

  onReceive(notice: PackageNoticeResponse): void {
    if (this.busyId()) return;

    this.modalService.confirm({
      title: 'Marcar como recibido',
      message: `${notice.itemDescription || 'Paquete'} de ${notice.carrierCompany} para ${notice.tenantClientName} (${notice.unitName}). Se registrará la fecha y hora de recepción y se avisará al cliente.`,
      confirmLabel: 'Recibido',
      showTextarea: false,
      onConfirm: () => this.receive(notice),
    });
  }

  private receive(notice: PackageNoticeResponse): void {
    this.busyId.set(notice.id);

    this.packageNoticeService
      .markAsReceived(notice.id)
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.toast.success(`Paquete de ${notice.carrierCompany} recibido`);
          this.load();
        },
        error: (ex) => {
          this.busyId.set(null);
          this.toast.error(this.errorMessage(ex, 'No se pudo marcar como recibido'));
        },
      });
  }

  private errorMessage(ex: unknown, fallback: string): string {
    if (ex instanceof TimeoutError) return 'La solicitud tardó demasiado, intenta de nuevo';
    return (ex as { error?: { message?: string } })?.error?.message ?? fallback;
  }
}
