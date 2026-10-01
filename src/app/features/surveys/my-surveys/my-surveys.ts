import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { timeout, TimeoutError } from 'rxjs';
import { SurveyService } from '../../../core/services/surveys/survey-service';
import { MySurveyResponse } from '../../../core/services/surveys/survey-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';

/**
 * Página (cliente): encuestas que le llegaron. Pendientes arriba, luego contestadas / cerradas.
 * Ruta: /my-surveys
 */
@Component({
  selector: 'app-my-surveys',
  imports: [DatePipe, RouterLink],
  templateUrl: './my-surveys.html',
  styleUrl: './my-surveys.css',
})
export class MySurveys implements OnInit {
  private surveyService = inject(SurveyService);
  private toast = inject(ToastService);
  private breadcrumbService = inject(BreadcrumbService);

  surveys = signal<MySurveyResponse[]>([]);
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  pending = computed(() => this.surveys().filter((s) => s.isOpen && !s.respondedAt));
  others = computed(() => this.surveys().filter((s) => !(s.isOpen && !s.respondedAt)));

  ngOnInit(): void {
    this.breadcrumbService.set([
      { label: 'Inicio', path: '/inicio' },
      { label: 'Mis encuestas', path: '/my-surveys' },
    ]);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.surveyService
      .getMySurveys()
      .pipe(timeout(10_000))
      .subscribe({
        next: (res) => {
          this.surveys.set(res);
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          const msg = ex instanceof TimeoutError
            ? 'La solicitud tardó demasiado, intenta de nuevo'
            : ex?.error?.message ?? 'Error al cargar tus encuestas';
          this.loadError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  getStatus(survey: MySurveyResponse): string {
    if (survey.respondedAt) return 'Contestada';
    if (survey.isOpen) return 'Pendiente';
    if (survey.startsAt && new Date(survey.startsAt) > new Date()) return 'Próximamente';
    return 'Cerrada';
  }
}
