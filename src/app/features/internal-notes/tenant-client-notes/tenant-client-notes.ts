import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, timeout, TimeoutError } from 'rxjs';
import { InternalNoteService } from '../../../core/services/internal-notes/internal-note-service';
import {
  INTERNAL_NOTE_CATEGORY_LABELS,
  INTERNAL_NOTE_CATEGORY_OPTIONS,
  INTERNAL_NOTE_MAX_LENGTH,
  InternalNoteCategory,
  InternalNoteResponse,
} from '../../../core/services/internal-notes/internal-note-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

/** Datos que recibe desde el modal */
export interface TenantClientNotesModalData {
  tenantClientId: string;
  tenantClientName?: string;
}

const REQUEST_TIMEOUT = 10_000;
const PAGE_SIZE = 30;

/**
 * Modal: bitácora interna de un inquilino (solo staff).
 * Arriba el formulario (crear / editar), abajo la lista (fijadas primero).
 * Las acciones de cada nota se resuelven dentro del modal (no se abre otro modal encima).
 */
@Component({
  selector: 'app-tenant-client-notes',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './tenant-client-notes.html',
  styleUrl: './tenant-client-notes.css',
})
export class TenantClientNotes implements OnInit {
  private fb = inject(FormBuilder);
  private noteService = inject(InternalNoteService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  readonly categoryOptions = INTERNAL_NOTE_CATEGORY_OPTIONS;
  readonly maxLength = INTERNAL_NOTE_MAX_LENGTH;

  tenantClientId = '';
  tenantClientName = signal('');

  notes = signal<InternalNoteResponse[]>([]);
  totalCount = signal(0);
  hasNextPage = signal(false);
  private page = 1;

  isLoading = signal(true);
  isLoadingMore = signal(false);
  loadError = signal<string | null>(null);

  isSubmitting = signal(false);
  serverError = signal<string | null>(null);
  editingId = signal<string | null>(null);

  /** Nota con una acción en curso (fijar, completar, borrar) */
  busyId = signal<string | null>(null);
  /** Nota esperando confirmación de borrado */
  confirmDeleteId = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    category: [InternalNoteCategory.General as InternalNoteCategory, [Validators.required]],
    body: ['', [Validators.required, Validators.maxLength(INTERNAL_NOTE_MAX_LENGTH)]],
    followUpDate: [''],
  });

  ngOnInit(): void {
    const data = this.modalService.state()?.data as TenantClientNotesModalData | null;

    if (!data?.tenantClientId) {
      this.isLoading.set(false);
      this.loadError.set('No se recibió el inquilino');
      return;
    }

    this.tenantClientId = data.tenantClientId;
    this.tenantClientName.set(data.tenantClientName ?? '');
    this.loadNotes();
  }

  // ===== Carga =====

  loadNotes(): void {
    this.page = 1;
    this.isLoading.set(true);
    this.loadError.set(null);

    this.noteService
      .getByTenantClient(this.tenantClientId, null, this.page, PAGE_SIZE)
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: (res) => {
          this.notes.set(res.items);
          this.totalCount.set(res.totalCount);
          this.hasNextPage.set(res.hasNextPage);
          if (!this.tenantClientName() && res.items.length) {
            this.tenantClientName.set(res.items[0].tenantClientName);
          }
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          const msg = this.errorMessage(ex, 'Error al cargar la bitácora');
          this.loadError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  loadMore(): void {
    if (this.isLoadingMore()) return;
    this.isLoadingMore.set(true);

    this.noteService
      .getByTenantClient(this.tenantClientId, null, this.page + 1, PAGE_SIZE)
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: (res) => {
          this.page++;
          this.notes.update((current) => [...current, ...res.items]);
          this.hasNextPage.set(res.hasNextPage);
          this.isLoadingMore.set(false);
        },
        error: (ex) => {
          this.isLoadingMore.set(false);
          this.toast.error(this.errorMessage(ex, 'Error al cargar más notas'));
        },
      });
  }

  // ===== Crear / editar =====

  get bodyCharsLeft(): number {
    return this.maxLength - (this.form.controls.body.value?.length ?? 0);
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid || !this.form.controls.body.value.trim()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const followUpDate = v.followUpDate ? v.followUpDate : null;
    const editingId = this.editingId();

    const request$: Observable<InternalNoteResponse> = editingId
      ? this.noteService.update(editingId, { category: Number(v.category), body: v.body.trim(), followUpDate })
      : this.noteService.create({
          tenantClientId: this.tenantClientId,
          unitContractId: null,
          category: Number(v.category),
          body: v.body.trim(),
          followUpDate,
        });

    this.isSubmitting.set(true);

    request$.pipe(timeout(REQUEST_TIMEOUT)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success(editingId ? 'Nota actualizada' : 'Nota agregada');
        this.resetForm();
        this.loadNotes();
      },
      error: (ex) => {
        this.isSubmitting.set(false);
        const msg = this.errorMessage(ex, editingId ? 'Error al actualizar la nota' : 'Error al agregar la nota');
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }

  startEdit(note: InternalNoteResponse): void {
    this.confirmDeleteId.set(null);
    this.serverError.set(null);
    this.editingId.set(note.id);
    this.form.setValue({
      category: InternalNoteCategory[note.category],
      body: note.body,
      followUpDate: note.followUpDate ? note.followUpDate.substring(0, 10) : '',
    });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.serverError.set(null);
    this.form.reset({ category: InternalNoteCategory.General, body: '', followUpDate: '' });
  }

  // ===== Acciones por nota =====

  togglePin(note: InternalNoteResponse): void {
    this.runAction(
      note.id,
      this.noteService.setPinned(note.id, !note.isPinned),
      note.isPinned ? 'Nota desfijada' : 'Nota fijada',
      'Error al fijar la nota',
    );
  }

  completeFollowUp(note: InternalNoteResponse): void {
    this.runAction(
      note.id,
      this.noteService.completeFollowUp(note.id),
      'Seguimiento marcado como hecho',
      'Error al completar el seguimiento',
    );
  }

  askDelete(note: InternalNoteResponse): void {
    this.confirmDeleteId.set(note.id);
  }

  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  confirmDelete(note: InternalNoteResponse): void {
    if (this.editingId() === note.id) {
      this.resetForm();
    }
    this.runAction(note.id, this.noteService.delete(note.id), 'Nota eliminada', 'Error al eliminar la nota');
  }

  private runAction(noteId: string, request$: Observable<void>, successMsg: string, errorMsg: string): void {
    if (this.busyId()) return;
    this.busyId.set(noteId);

    request$.pipe(timeout(REQUEST_TIMEOUT)).subscribe({
      next: () => {
        this.busyId.set(null);
        this.confirmDeleteId.set(null);
        this.toast.success(successMsg);
        this.loadNotes();
      },
      error: (ex) => {
        this.busyId.set(null);
        this.toast.error(this.errorMessage(ex, errorMsg));
      },
    });
  }

  // ===== Helpers de vista =====

  getCategoryLabel(category: string): string {
    return INTERNAL_NOTE_CATEGORY_LABELS[category] ?? category;
  }

  private errorMessage(ex: unknown, fallback: string): string {
    if (ex instanceof TimeoutError) return 'La solicitud tardó demasiado, intenta de nuevo';
    return (ex as { error?: { message?: string } })?.error?.message ?? fallback;
  }
}
