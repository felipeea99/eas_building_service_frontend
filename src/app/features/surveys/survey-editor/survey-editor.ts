import { Component, computed, effect, inject, input, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { timeout } from 'rxjs';
import { WizardService } from '../../../shared/wizard/wizard-service';
import { SurveyService } from '../../../core/services/surveys/survey-service';
import {
  isChoiceType,
  SaveSurveyRequest,
  SURVEY_LIMITS,
  SURVEY_QUESTION_TYPE_OPTIONS,
  SurveyAudience,
  SurveyClientItem,
  SurveyDetailResponse,
  SurveyQuestionType,
} from '../../../core/services/surveys/survey-models';

/** Clave con la que el editor deja el request en la data del wizard */
export const SURVEY_EDITOR_DATA_KEY = 'request';

type QuestionGroup = FormGroup<{
  text: FormControl<string>;
  type: FormControl<SurveyQuestionType>;
  isRequired: FormControl<boolean>;
  options: FormArray<FormControl<string>>;
}>;

/** "yyyy-MM-ddTHH:mm" (hora local) → ISO UTC, o null */
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO UTC → "yyyy-MM-ddTHH:mm" en hora local (para datetime-local) */
function isoToLocalInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Contenido del wizard de encuestas (se proyecta dentro de <app-wizard>).
 * Un solo formulario para los 3 pasos (Datos → Audiencia → Preguntas); en cada cambio
 * valida el paso actual (setStepValid) y deja el SaveSurveyRequest en la data del wizard.
 */
@Component({
  selector: 'app-survey-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './survey-editor.html',
  styleUrl: './survey-editor.css',
})
export class SurveyEditor implements OnInit {
  private fb = inject(FormBuilder);
  private wizard = inject(WizardService);
  private surveyService = inject(SurveyService);
  private destroyRef = inject(DestroyRef);

  buildingId = input.required<string>();
  /** Borrador a editar (null = nueva encuesta) */
  initial = input<SurveyDetailResponse | null>(null);

  readonly limits = SURVEY_LIMITS;
  readonly typeOptions = SURVEY_QUESTION_TYPE_OPTIONS;
  readonly Audience = SurveyAudience;
  readonly step = this.wizard.currentIndex;

  // ===== Paso 1: datos =====
  details = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(SURVEY_LIMITS.title)]],
    description: ['', [Validators.maxLength(SURVEY_LIMITS.description)]],
    startsAt: [''],
    endsAt: [''],
  });

  // ===== Paso 2: audiencia =====
  audience = signal<SurveyAudience>(SurveyAudience.Building);
  eligibleClients = signal<SurveyClientItem[]>([]);
  loadingClients = signal(false);
  clientsError = signal<string | null>(null);
  selectedIds = signal<Set<string>>(new Set());
  clientSearch = signal('');

  filteredClients = computed(() => {
    const term = this.clientSearch().toLowerCase();
    return term
      ? this.eligibleClients().filter((c) => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term))
      : this.eligibleClients();
  });

  // ===== Paso 3: preguntas =====
  questions = this.fb.array<QuestionGroup>([]);

  /** Se incrementa en cada cambio del formulario para re-evaluar la validez del paso */
  private formVersion = signal(0);

  constructor() {
    effect(() => {
      // dependencias: paso actual, cambios del form y de la audiencia
      const step = this.step();
      this.formVersion();
      this.audience();
      this.selectedIds();

      this.wizard.setStepValid(this.isStepValid(step));
      this.wizard.patchData({ [SURVEY_EDITOR_DATA_KEY]: this.buildRequest() });
    });
  }

  ngOnInit(): void {
    const survey = this.initial();

    if (survey) {
      this.details.setValue({
        title: survey.title,
        description: survey.description ?? '',
        startsAt: isoToLocalInput(survey.startsAt),
        endsAt: isoToLocalInput(survey.endsAt),
      });
      this.audience.set(survey.audience === 'SelectedClients' ? SurveyAudience.SelectedClients : SurveyAudience.Building);
      this.selectedIds.set(new Set(survey.targetClients.map((c) => c.tenantClientId)));
      for (const question of survey.questions) {
        this.questions.push(
          this.createQuestion(question.text, question.typeValue, question.isRequired, question.options.map((o) => o.text)),
        );
      }
    } else {
      this.addQuestion();
    }

    this.details.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.bump());
    this.questions.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.bump());

    this.loadEligibleClients();
  }

  private bump(): void {
    this.formVersion.update((v) => v + 1);
  }

  // ===== Validación por paso =====

  private isStepValid(step: number): boolean {
    switch (step) {
      case 0:
        return this.details.valid && !this.datesError();
      case 1:
        return this.audience() === SurveyAudience.Building || this.selectedIds().size > 0;
      case 2:
        return this.questions.length > 0 && this.questions.controls.every((q) => this.isQuestionValid(q));
      default:
        return false;
    }
  }

  datesError(): string | null {
    const { startsAt, endsAt } = this.details.getRawValue();
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      return 'El cierre debe ser posterior al inicio';
    }
    if (endsAt && new Date(endsAt) <= new Date()) {
      return 'La fecha de cierre ya pasó';
    }
    return null;
  }

  isQuestionValid(question: QuestionGroup): boolean {
    if (question.controls.text.invalid || !question.controls.text.value.trim()) return false;
    if (!isChoiceType(Number(question.controls.type.value))) return true;

    const options = question.controls.options.value.map((o) => o.trim()).filter((o) => o);
    const unique = new Set(options.map((o) => o.toLowerCase()));
    return options.length >= 2 && unique.size === options.length && options.length <= SURVEY_LIMITS.options;
  }

  optionsError(question: QuestionGroup): string | null {
    if (!isChoiceType(Number(question.controls.type.value))) return null;
    const options = question.controls.options.value.map((o) => o.trim()).filter((o) => o);
    if (options.length < 2) return 'Agrega al menos 2 opciones';
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return 'Hay opciones repetidas';
    return null;
  }

  // ===== Audiencia =====

  private loadEligibleClients(): void {
    this.loadingClients.set(true);
    this.surveyService
      .getEligibleClients(this.buildingId())
      .pipe(timeout(10_000))
      .subscribe({
        next: (clients) => {
          this.eligibleClients.set(clients);
          this.loadingClients.set(false);
        },
        error: (ex) => {
          this.loadingClients.set(false);
          this.clientsError.set(ex?.error?.message ?? 'No se pudieron cargar los clientes');
        },
      });
  }

  setAudience(audience: SurveyAudience): void {
    this.audience.set(audience);
  }

  onClientSearch(event: Event): void {
    this.clientSearch.set((event.target as HTMLInputElement).value);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleClient(id: string): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  selectAllFiltered(): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      this.filteredClients().forEach((c) => next.add(c.tenantClientId));
      return next;
    });
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  /** Elegidos que ya no son elegibles (inactivos o sin acceso): al publicar el backend los rechaza */
  staleSelected = computed(() => {
    if (this.loadingClients()) return 0;
    const eligible = new Set(this.eligibleClients().map((c) => c.tenantClientId));
    return [...this.selectedIds()].filter((id) => !eligible.has(id)).length;
  });

  // ===== Preguntas =====

  private createQuestion(text: string, type: SurveyQuestionType, isRequired: boolean, options: string[]): QuestionGroup {
    return this.fb.nonNullable.group({
      text: [text, [Validators.required, Validators.maxLength(SURVEY_LIMITS.questionText)]],
      type: [type, [Validators.required]],
      isRequired: [isRequired],
      options: this.fb.nonNullable.array(
        options.map((o) => this.fb.nonNullable.control(o, [Validators.maxLength(SURVEY_LIMITS.optionText)])),
      ),
    });
  }

  addQuestion(): void {
    if (this.questions.length >= SURVEY_LIMITS.questions) return;
    this.questions.push(this.createQuestion('', SurveyQuestionType.SingleChoice, true, ['', '']));
  }

  removeQuestion(index: number): void {
    this.questions.removeAt(index);
  }

  moveQuestion(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.questions.length) return;
    const control = this.questions.at(index);
    this.questions.removeAt(index);
    this.questions.insert(target, control);
  }

  onTypeChange(question: QuestionGroup): void {
    const options = question.controls.options;
    if (isChoiceType(Number(question.controls.type.value)) && options.length < 2) {
      while (options.length < 2) options.push(this.fb.nonNullable.control(''));
    }
  }

  isChoice(question: QuestionGroup): boolean {
    return isChoiceType(Number(question.controls.type.value));
  }

  addOption(question: QuestionGroup): void {
    if (question.controls.options.length >= SURVEY_LIMITS.options) return;
    question.controls.options.push(this.fb.nonNullable.control('', [Validators.maxLength(SURVEY_LIMITS.optionText)]));
  }

  removeOption(question: QuestionGroup, index: number): void {
    question.controls.options.removeAt(index);
  }

  // ===== Request =====

  private buildRequest(): SaveSurveyRequest {
    const d = this.details.getRawValue();
    const audience = this.audience();

    return {
      buildingId: this.buildingId(),
      title: d.title.trim(),
      description: d.description.trim() || null,
      audience,
      startsAt: localInputToIso(d.startsAt),
      endsAt: localInputToIso(d.endsAt),
      tenantClientIds: audience === SurveyAudience.SelectedClients ? [...this.selectedIds()] : [],
      questions: this.questions.controls.map((q) => {
        const type = Number(q.controls.type.value) as SurveyQuestionType;
        return {
          text: q.controls.text.value.trim(),
          type,
          isRequired: q.controls.isRequired.value,
          options: isChoiceType(type) ? q.controls.options.value.map((o) => o.trim()).filter((o) => o) : [],
        };
      }),
    };
  }
}
