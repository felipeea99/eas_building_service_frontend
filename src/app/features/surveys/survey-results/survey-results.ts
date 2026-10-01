import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { timeout, TimeoutError } from 'rxjs';
import { SurveyService } from '../../../core/services/surveys/survey-service';
import {
  SURVEY_STATE_LABELS,
  SurveyQuestionResult,
  SurveyResultsResponse,
} from '../../../core/services/surveys/survey-models';
import { BuildingContextService } from '../../../core/services/building/building-context-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';

/**
 * Página: resultados de una encuesta (staff).
 * Barras en CSS (sin librerías): opciones con %, rating con promedio y distribución, sí/no, y respuestas abiertas.
 * Ruta: /surveys/:buildingId/:surveyId/results
 */
@Component({
  selector: 'app-survey-results',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './survey-results.html',
  styleUrl: './survey-results.css',
})
export class SurveyResults implements OnInit {
  private surveyService = inject(SurveyService);
  private buildingContext = inject(BuildingContextService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly ratingValues = [5, 4, 3, 2, 1];

  buildingId = '';
  surveyId = '';
  results = signal<SurveyResultsResponse | null>(null);
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.buildingId = this.route.snapshot.paramMap.get('buildingId') ?? '';
    this.surveyId = this.route.snapshot.paramMap.get('surveyId') ?? '';

    if (!this.surveyId) {
      this.router.navigate(['/surveys', this.buildingId]);
      return;
    }

    this.setBreadcrumb('Resultados');
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.surveyService
      .getResults(this.surveyId)
      .pipe(timeout(10_000))
      .subscribe({
        next: (res) => {
          this.results.set(res);
          this.setBreadcrumb(res.title);
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          const msg = ex instanceof TimeoutError
            ? 'La solicitud tardó demasiado, intenta de nuevo'
            : ex?.error?.message ?? 'Error al cargar los resultados';
          this.loadError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  private setBreadcrumb(last: string): void {
    const bc = this.buildingContext.current();
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
      ...(bc ? [{ label: bc.name, path: `/building-dashboard/${bc.id}` }] : []),
      { label: 'Encuestas', path: `/surveys/${this.buildingId}` },
      { label: last, path: `/surveys/${this.buildingId}/${this.surveyId}/results` },
    ]);
  }

  openRecipients(): void {
    const r = this.results();
    this.modalService.open('survey-recipients', { surveyId: this.surveyId, title: r?.title ?? '' });
  }

  getStateLabel(state: string): string {
    return SURVEY_STATE_LABELS[state as keyof typeof SURVEY_STATE_LABELS] ?? state;
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      SingleChoice: 'Opción única',
      MultipleChoice: 'Opción múltiple',
      Rating: 'Calificación',
      YesNo: 'Sí / No',
      Text: 'Respuesta abierta',
    };
    return map[type] ?? type;
  }

  ratingCount(question: SurveyQuestionResult, value: number): number {
    return question.distribution?.[String(value)] ?? 0;
  }

  percent(part: number, total: number): number {
    return total ? Math.round((part / total) * 1000) / 10 : 0;
  }
}
