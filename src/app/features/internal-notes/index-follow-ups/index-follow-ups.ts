import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { timeout, TimeoutError } from 'rxjs';
import { InternalNoteService } from '../../../core/services/internal-notes/internal-note-service';
import {
  INTERNAL_NOTE_CATEGORY_LABELS,
  InternalNoteResponse,
} from '../../../core/services/internal-notes/internal-note-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { Toolbar } from '../../../shared/toolbar/toolbar';

/**
 * Página: seguimientos pendientes de la bitácora (fecha de hoy o anterior, sin marcar como hechos).
 * Ruta: /follow-ups
 */
@Component({
  selector: 'app-index-follow-ups',
  imports: [DatePipe, Toolbar],
  templateUrl: './index-follow-ups.html',
  styleUrl: './index-follow-ups.css',
})
export class IndexFollowUps implements OnInit {
  private noteService = inject(InternalNoteService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);

  items = signal<InternalNoteResponse[]>([]);
  filteredItems = signal<InternalNoteResponse[]>([]);
  totalCount = signal(0);
  isLoading = signal(true);
  busyId = signal<string | null>(null);
  private searchTerm = '';
  private pendingReload = false;

  constructor() {
    effect(() => {
      const open = this.modalService.isOpen();
      if (!open && this.pendingReload) {
        this.pendingReload = false;
        this.load();
      }
    });
  }

  ngOnInit(): void {
    this.breadcrumbService.set([
      { label: 'Inicio', path: '/inicio' },
      { label: 'Seguimientos', path: '/follow-ups' },
    ]);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.noteService
      .getPendingFollowUps(1, 100)
      .pipe(timeout(10_000))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.totalCount.set(res.totalCount);
          this.applyFilters();
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          this.toast.error(this.errorMessage(ex, 'Error al cargar los seguimientos'));
        },
      });
  }

  onSearch(term: string): void {
    this.searchTerm = term.toLowerCase();
    this.applyFilters();
  }

  private applyFilters(): void {
    const term = this.searchTerm;
    this.filteredItems.set(
      term
        ? this.items().filter((item) =>
            item.tenantClientName.toLowerCase().includes(term) || item.body.toLowerCase().includes(term))
        : this.items(),
    );
  }

  complete(item: InternalNoteResponse): void {
    if (this.busyId()) return;
    this.busyId.set(item.id);

    this.noteService
      .completeFollowUp(item.id)
      .pipe(timeout(10_000))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.toast.success('Seguimiento marcado como hecho');
          this.load();
        },
        error: (ex) => {
          this.busyId.set(null);
          this.toast.error(this.errorMessage(ex, 'Error al completar el seguimiento'));
        },
      });
  }

  openNotes(item: InternalNoteResponse): void {
    this.pendingReload = true;
    this.modalService.open('tenant-client-notes', {
      tenantClientId: item.tenantClientId,
      tenantClientName: item.tenantClientName,
    });
  }

  getCategoryLabel(category: string): string {
    return INTERNAL_NOTE_CATEGORY_LABELS[category] ?? category;
  }

  private errorMessage(ex: unknown, fallback: string): string {
    if (ex instanceof TimeoutError) return 'La solicitud tardó demasiado, intenta de nuevo';
    return (ex as { error?: { message?: string } })?.error?.message ?? fallback;
  }
}
