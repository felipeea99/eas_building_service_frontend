import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, timeout, TimeoutError } from 'rxjs';
import { SurveyService } from '../../../core/services/surveys/survey-service';
import {
  SaveSurveyRequest,
  SURVEY_STATE_LABELS,
  SurveyDetailResponse,
  SurveyListItemResponse,
  SurveyState,
} from '../../../core/services/surveys/survey-models';
import { BuildingContextService } from '../../../core/services/building/building-context-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { Toolbar, ToolbarFilter, ToolbarFilterChange } from '../../../shared/toolbar/toolbar';
import { Wizard } from '../../../shared/wizard/wizard';
import { WizardStep } from '../../../shared/wizard/wizard-service';
import { SURVEY_EDITOR_DATA_KEY, SurveyEditor } from '../survey-editor/survey-editor';

const REQUEST_TIMEOUT = 10_000;

/**
 * Página: encuestas del edificio (staff).
 * Crear / editar borrador con el Wizard (Datos → Audiencia → Preguntas); publicar, cerrar,
 * eliminar borrador, ver destinatarios (modal) y resultados (página).
 * Ruta: /surveys/:buildingId
 */
@Component({
  selector: 'app-index-surveys',
  imports: [DatePipe, Toolbar, Wizard, SurveyEditor],
  templateUrl: './index-surveys.html',
  styleUrl: './index-surveys.css',
})
export class IndexSurveys implements OnInit {
  private surveyService = inject(SurveyService);
  private buildingContext = inject(BuildingContextService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);
  private breadcrumbService = inject(BreadcrumbService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly toolbarFilters: ToolbarFilter[] = [
    {
      key: 'state',
      label: 'Estado',
      options: [
        { value: String(SurveyState.Draft), label: 'Borrador' },
        { value: String(SurveyState.Published), label: 'Publicada' },
        { value: String(SurveyState.Closed), label: 'Cerrada' },
      ],
    },
  ];

  readonly wizardSteps: WizardStep[] = [
    { title: 'Datos', description: 'Título y vigencia' },
    { title: 'Audiencia', description: 'A quién se envía' },
    { title: 'Preguntas', description: 'Contenido' },
  ];

  buildingId = '';
  surveys = signal<SurveyListItemResponse[]>([]);
  filteredSurveys = signal<SurveyListItemResponse[]>([]);
  isLoading = signal(true);
  busyId = signal<string | null>(null);

  /** Wizard */
  editorOpen = signal(false);
  editorInitial = signal<SurveyDetailResponse | null>(null);
  isSaving = signal(false);

  private searchTerm = '';
  private stateFilter: SurveyState | undefined;
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
    this.buildingId = this.route.snapshot.paramMap.get('buildingId') ?? '';

    const bc = this.buildingContext.current();
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
      ...(bc ? [{ label: bc.name, path: `/building-dashboard/${bc.id}` }] : []),
      { label: 'Encuestas', path: `/surveys/${this.buildingId}` },
    ]);

    this.load();
  }

  load(): void {
    if (!this.buildingId) return;
    this.isLoading.set(true);

    this.surveyService
      .getSurveys({ buildingId: this.buildingId, state: this.stateFilter, page: 1, pageSize: 100 })
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: (res) => {
          this.surveys.set(res.items);
          this.applySearch();
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          this.toast.error(this.errorMessage(ex, 'Error al cargar las encuestas'));
        },
      });
  }

  onSearch(term: string): void {
    this.searchTerm = term.toLowerCase();
    this.applySearch();
  }

  onFilterChange(change: ToolbarFilterChange): void {
    if (change.key === 'state') {
      this.stateFilter = change.value === '' ? undefined : (Number(change.value) as SurveyState);
      this.load();
    }
  }

  private applySearch(): void {
    const term = this.searchTerm;
    this.filteredSurveys.set(term ? this.surveys().filter((s) => s.title.toLowerCase().includes(term)) : this.surveys());
  }

  // ===== Wizard (crear / editar borrador) =====

  onAdd(): void {
    this.editorInitial.set(null);
    this.editorOpen.set(true);
  }

  edit(survey: SurveyListItemResponse): void {
    if (this.busyId()) return;
    this.busyId.set(survey.id);

    this.surveyService
      .getById(survey.id)
      .pipe(timeout(REQUEST_TIMEOUT))
      .subscribe({
        next: (detail) => {
          this.busyId.set(null);
          this.editorInitial.set(detail);
          this.editorOpen.set(true);
        },
        error: (ex) => {
          this.busyId.set(null);
          this.toast.error(this.errorMessage(ex, 'Error al cargar la encuesta'));
        },
      });
  }

  onEditorFinished(data: Record<string, unknown>): void {
    const request = data[SURVEY_EDITOR_DATA_KEY] as SaveSurveyRequest | undefined;
    if (!request) return;

    const editing = this.editorInitial();
    const request$ = editing
      ? this.surveyService.updateDraft(editing.id, request)
      : this.surveyService.create(request);

    this.isSaving.set(true);
    request$.pipe(timeout(REQUEST_TIMEOUT)).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.editorOpen.set(false);
        this.toast.success(editing ? 'Borrador actualizado' : 'Encuesta guardada como borrador');
        this.load();
      },
      error: (ex) => {
        // el wizard sigue abierto para corregir
        this.isSaving.set(false);
        this.toast.error(this.errorMessage(ex, 'Error al guardar la encuesta'));
      },
    });
  }

  onEditorCancelled(): void {
    // deja terminar la animación de salida del wizard
    setTimeout(() => this.editorOpen.set(false), 300);
  }

  // ===== Acciones =====

  publish(survey: SurveyListItemResponse): void {
    this.modalService.confirm({
      title: 'Publicar encuesta',
      message: `Se enviará "${survey.title}" a los destinatarios y ya no podrás editarla. ¿Publicar?`,
      confirmLabel: 'Publicar',
      showTextarea: false,
      onConfirm: () =>
        this.runAction(survey.id, this.surveyService.publish(survey.id), 'Encuesta publicada y enviada', 'Error al publicar la encuesta'),
    });
  }

  close(survey: SurveyListItemResponse): void {
    this.modalService.confirm({
      title: 'Cerrar encuesta',
      message: `"${survey.title}" dejará de aceptar respuestas. ¿Cerrar?`,
      confirmLabel: 'Cerrar encuesta',
      showTextarea: false,
      onConfirm: () =>
        this.runAction(survey.id, this.surveyService.close(survey.id), 'Encuesta cerrada', 'Error al cerrar la encuesta'),
    });
  }

  deleteDraft(survey: SurveyListItemResponse): void {
    this.modalService.confirm({
      title: 'Eliminar borrador',
      message: `¿Eliminar el borrador "${survey.title}"?`,
      confirmLabel: 'Sí, eliminar',
      destructive: true,
      showTextarea: false,
      onConfirm: () =>
        this.runAction(survey.id, this.surveyService.deleteDraft(survey.id), 'Borrador eliminado', 'Error al eliminar el borrador'),
    });
  }

  openRecipients(survey: SurveyListItemResponse): void {
    this.modalService.open('survey-recipients', { surveyId: survey.id, title: survey.title });
  }

  openResults(survey: SurveyListItemResponse): void {
    this.router.navigate(['/surveys', this.buildingId, survey.id, 'results']);
  }

  private runAction(id: string, request$: Observable<unknown>, successMsg: string, errorMsg: string): void {
    this.busyId.set(id);
    request$.pipe(timeout(REQUEST_TIMEOUT)).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(successMsg);
        this.load();
      },
      error: (ex) => {
        this.busyId.set(null);
        this.toast.error(this.errorMessage(ex, errorMsg));
      },
    });
  }

  // ===== Vista =====

  getStateLabel(survey: SurveyListItemResponse): string {
    if (survey.state === 'Published' && !survey.isOpen) {
      // publicada pero fuera de fechas
      return survey.startsAt && new Date(survey.startsAt) > new Date() ? 'Programada' : 'Vencida';
    }
    return SURVEY_STATE_LABELS[survey.state] ?? survey.state;
  }

  getStateClass(survey: SurveyListItemResponse): string {
    if (survey.state === 'Published') return survey.isOpen ? 'state-open' : 'state-waiting';
    return survey.state === 'Draft' ? 'state-draft' : 'state-closed';
  }

  getResponseRate(survey: SurveyListItemResponse): number {
    return survey.recipientCount ? Math.round((survey.responseCount / survey.recipientCount) * 100) : 0;
  }

  private errorMessage(ex: unknown, fallback: string): string {
    if (ex instanceof TimeoutError) return 'La solicitud tardó demasiado, intenta de nuevo';
    return (ex as { error?: { message?: string } })?.error?.message ?? fallback;
  }
}
