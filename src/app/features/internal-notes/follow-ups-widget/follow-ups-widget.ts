import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { timeout } from 'rxjs';
import { InternalNoteService } from '../../../core/services/internal-notes/internal-note-service';
import {
  INTERNAL_NOTE_CATEGORY_LABELS,
  InternalNoteResponse,
} from '../../../core/services/internal-notes/internal-note-models';
import { ModalService } from '../../../shared/modal/modal-service';

const WIDGET_SIZE = 5;

/**
 * Widget para Inicio: seguimientos de la bitácora con fecha de hoy o anterior.
 * No se muestra si no hay pendientes (ni si falla la carga: no bloquea el Inicio).
 */
@Component({
  selector: 'app-follow-ups-widget',
  imports: [DatePipe, RouterLink],
  templateUrl: './follow-ups-widget.html',
  styleUrl: './follow-ups-widget.css',
})
export class FollowUpsWidget implements OnInit {
  private noteService = inject(InternalNoteService);
  private modalService = inject(ModalService);

  items = signal<InternalNoteResponse[]>([]);
  totalCount = signal(0);
  isLoaded = signal(false);
  private pendingReload = false;

  constructor() {
    // al cerrar la bitácora se recarga (pudo marcar hecho o cambiar la fecha)
    effect(() => {
      const open = this.modalService.isOpen();
      if (!open && this.pendingReload) {
        this.pendingReload = false;
        this.load();
      }
    });
  }

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.noteService
      .getPendingFollowUps(1, WIDGET_SIZE)
      .pipe(timeout(10_000))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.totalCount.set(res.totalCount);
          this.isLoaded.set(true);
        },
        error: () => {
          // silencioso: el widget es secundario
          this.items.set([]);
          this.totalCount.set(0);
          this.isLoaded.set(true);
        },
      });
  }

  openNotes(note: InternalNoteResponse): void {
    this.pendingReload = true;
    this.modalService.open('tenant-client-notes', {
      tenantClientId: note.tenantClientId,
      tenantClientName: note.tenantClientName,
    });
  }

  getCategoryLabel(category: string): string {
    return INTERNAL_NOTE_CATEGORY_LABELS[category] ?? category;
  }
}
