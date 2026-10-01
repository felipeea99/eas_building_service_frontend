import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { timeout, TimeoutError } from 'rxjs';
import { SurveyService } from '../../../core/services/surveys/survey-service';
import { SurveyRecipientResponse } from '../../../core/services/surveys/survey-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

/** Datos que recibe desde el modal */
export interface SurveyRecipientsModalData {
  surveyId: string;
  title?: string;
}

type RecipientsFilter = 'all' | 'responded' | 'pending';

/** Modal: destinatarios congelados al publicar, con quién ya contestó */
@Component({
  selector: 'app-survey-recipients',
  imports: [DatePipe],
  templateUrl: './survey-recipients.html',
  styleUrl: './survey-recipients.css',
})
export class SurveyRecipients implements OnInit {
  private surveyService = inject(SurveyService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  title = signal('');
  recipients = signal<SurveyRecipientResponse[]>([]);
  isLoading = signal(true);
  loadError = signal<string | null>(null);
  filter = signal<RecipientsFilter>('all');

  respondedCount = computed(() => this.recipients().filter((r) => r.respondedAt).length);
  visible = computed(() => {
    const filter = this.filter();
    if (filter === 'responded') return this.recipients().filter((r) => r.respondedAt);
    if (filter === 'pending') return this.recipients().filter((r) => !r.respondedAt);
    return this.recipients();
  });

  ngOnInit(): void {
    const data = this.modalService.state()?.data as SurveyRecipientsModalData | null;

    if (!data?.surveyId) {
      this.isLoading.set(false);
      this.loadError.set('No se recibió la encuesta');
      return;
    }

    this.title.set(data.title ?? '');

    this.surveyService
      .getRecipients(data.surveyId)
      .pipe(timeout(10_000))
      .subscribe({
        next: (res) => {
          this.recipients.set(res);
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          const msg = ex instanceof TimeoutError
            ? 'La solicitud tardó demasiado, intenta de nuevo'
            : ex?.error?.message ?? 'Error al cargar los destinatarios';
          this.loadError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  setFilter(filter: RecipientsFilter): void {
    this.filter.set(filter);
  }
}
