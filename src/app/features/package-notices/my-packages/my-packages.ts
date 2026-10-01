import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { timeout, TimeoutError } from 'rxjs';
import { PackageNoticeService } from '../../../core/services/package-notices/package-notice-service';
import {
  PACKAGE_NOTICE_STATE_LABELS,
  PackageNoticeFormData,
  PackageNoticeResponse,
} from '../../../core/services/package-notices/package-notice-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';

const REQUEST_TIMEOUT = 10_000;

/**
 * Página (cliente): avisos de paquete. En espera arriba, luego recibidos / cancelados.
 * Ruta: /my-packages
 */
@Component({
  selector: 'app-my-packages',
  imports: [DatePipe],
  templateUrl: './my-packages.html',
  styleUrl: './my-packages.css',
})
export class MyPackages implements OnInit {
  private packageNoticeService = inject(PackageNoticeService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);

  readonly stateLabels = PACKAGE_NOTICE_STATE_LABELS;

  notices = signal<PackageNoticeResponse[]>([]);
  isLoading = signal(true);
  loadError = signal<string | null>(null);
  busyId = signal<string | null>(null);

  pending = computed(() => this.notices().filter((n) => n.state === 'Pending'));
  others = computed(() => this.notices().filter((n) => n.state !== 'Pending'));

  ngOnInit(): void {
    this.breadcrumbService.set([
      { label: 'Inicio', path: '/inicio' },
      { label: 'Mis paquetes', path: '/my-packages' },
    ]);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.packageNoticeService
      .getMine()
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: (res) => {
          this.notices.set(res);
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          const msg = this.errorMessage(ex, 'Error al cargar tus paquetes');
          this.loadError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  onAdd(): void {
    const data: PackageNoticeFormData = { onSaved: () => this.load() };
    this.modalService.open('package-notice-form', data);
  }

  onCancel(notice: PackageNoticeResponse): void {
    if (this.busyId()) return;

    this.modalService.confirm({
      title: 'Cancelar aviso',
      message: `¿Cancelar el aviso de ${notice.carrierCompany}? Caseta ya no lo esperará.`,
      confirmLabel: 'Sí, cancelar',
      cancelLabel: 'No',
      destructive: true,
      showTextarea: false,
      onConfirm: () => this.cancelNotice(notice),
    });
  }

  private cancelNotice(notice: PackageNoticeResponse): void {
    this.busyId.set(notice.id);

    this.packageNoticeService
      .cancel(notice.id)
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.toast.success('Aviso cancelado');
          this.load();
        },
        error: (ex) => {
          this.busyId.set(null);
          this.toast.error(this.errorMessage(ex, 'No se pudo cancelar el aviso'));
        },
      });
  }

  private errorMessage(ex: unknown, fallback: string): string {
    if (ex instanceof TimeoutError) return 'La solicitud tardó demasiado, intenta de nuevo';
    return (ex as { error?: { message?: string } })?.error?.message ?? fallback;
  }
}
