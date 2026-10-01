import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { timeout, TimeoutError } from 'rxjs';
import { SurveyService } from '../../../core/services/surveys/survey-service';
import {
  SubmitSurveyAnswerRequest,
  SURVEY_LIMITS,
  SurveyFormResponse,
  SurveyQuestionResponse,
  SurveyQuestionType,
} from '../../../core/services/surveys/survey-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';

/** Valor por tipo: opción única → optionId · múltiple → optionId[] · rating/sí-no → número · abierta → texto */
type AnswerValue = string | string[] | number | null;

/** Requerido para selección múltiple (arreglo no vacío) */
function requiredArray(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string[] | null;
  return value && value.length ? null : { required: true };
}

/**
 * Página (cliente): contestar una encuesta. Un control por pregunta (id de la pregunta = nombre del control).
 * Ruta: /my-surveys/:surveyId
 */
@Component({
  selector: 'app-answer-survey',
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './answer-survey.html',
  styleUrl: './answer-survey.css',
})
export class AnswerSurvey implements OnInit {
  private surveyService = inject(SurveyService);
  private toast = inject(ToastService);
  private breadcrumbService = inject(BreadcrumbService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly Type = SurveyQuestionType;
  readonly ratingValues = [1, 2, 3, 4, 5];
  readonly textLimit = SURVEY_LIMITS.textAnswer;

  survey = signal<SurveyFormResponse | null>(null);
  isLoading = signal(true);
  loadError = signal<string | null>(null);
  isSubmitting = signal(false);
  serverError = signal<string | null>(null);
  submitted = signal(false);

  form = new FormGroup<Record<string, FormControl<AnswerValue>>>({});

  ngOnInit(): void {
    const surveyId = this.route.snapshot.paramMap.get('surveyId');
    if (!surveyId) {
      this.router.navigate(['/my-surveys']);
      return;
    }

    this.setBreadcrumb('Encuesta', surveyId);

    this.surveyService
      .getForm(surveyId)
      .pipe(timeout(10_000))
      .subscribe({
        next: (res) => {
          this.survey.set(res);
          this.buildForm(res.questions);
          this.setBreadcrumb(res.title, surveyId);
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          const msg = this.errorMessage(ex, 'No se pudo cargar la encuesta');
          this.loadError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  private setBreadcrumb(label: string, surveyId: string): void {
    this.breadcrumbService.set([
      { label: 'Inicio', path: '/inicio' },
      { label: 'Mis encuestas', path: '/my-surveys' },
      { label, path: `/my-surveys/${surveyId}` },
    ]);
  }

  private buildForm(questions: SurveyQuestionResponse[]): void {
    for (const question of questions) {
      let control: FormControl<AnswerValue>;

      switch (question.typeValue) {
        case SurveyQuestionType.MultipleChoice:
          control = new FormControl<AnswerValue>([], question.isRequired ? [requiredArray] : []);
          break;
        case SurveyQuestionType.Text:
          control = new FormControl<AnswerValue>('', [
            ...(question.isRequired ? [Validators.required] : []),
            Validators.maxLength(SURVEY_LIMITS.textAnswer),
          ]);
          break;
        default:
          control = new FormControl<AnswerValue>(null, question.isRequired ? [Validators.required] : []);
      }

      this.form.addControl(question.id, control);
    }
  }

  // ===== Interacción =====

  control(question: SurveyQuestionResponse): FormControl<AnswerValue> {
    return this.form.controls[question.id];
  }

  isInvalid(question: SurveyQuestionResponse): boolean {
    const control = this.control(question);
    return control.touched && control.invalid;
  }

  setValue(question: SurveyQuestionResponse, value: AnswerValue): void {
    const control = this.control(question);
    control.setValue(value);
    control.markAsTouched();
  }

  isChecked(question: SurveyQuestionResponse, optionId: string): boolean {
    return ((this.control(question).value as string[]) ?? []).includes(optionId);
  }

  toggleOption(question: SurveyQuestionResponse, optionId: string): void {
    const current = (this.control(question).value as string[]) ?? [];
    this.setValue(
      question,
      current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId],
    );
  }

  textLength(question: SurveyQuestionResponse): number {
    return ((this.control(question).value as string) ?? '').length;
  }

  // ===== Envío =====

  onSubmit(): void {
    const survey = this.survey();
    if (!survey) return;
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Contesta las preguntas obligatorias');
      return;
    }

    const answers: SubmitSurveyAnswerRequest[] = [];

    for (const question of survey.questions) {
      const value = this.control(question).value;

      switch (question.typeValue) {
        case SurveyQuestionType.SingleChoice:
          if (value) answers.push({ questionId: question.id, optionIds: [value as string], number: null, text: null });
          break;
        case SurveyQuestionType.MultipleChoice:
          if ((value as string[])?.length) answers.push({ questionId: question.id, optionIds: value as string[], number: null, text: null });
          break;
        case SurveyQuestionType.Rating:
        case SurveyQuestionType.YesNo:
          if (value !== null) answers.push({ questionId: question.id, optionIds: null, number: value as number, text: null });
          break;
        case SurveyQuestionType.Text: {
          const text = ((value as string) ?? '').trim();
          if (text) answers.push({ questionId: question.id, optionIds: null, number: null, text });
          break;
        }
      }
    }

    this.isSubmitting.set(true);

    this.surveyService
      .submitResponse(survey.id, { answers })
      .pipe(timeout(10_000))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitted.set(true);
          this.toast.success('¡Gracias! Tu respuesta se envió');
        },
        error: (ex) => {
          this.isSubmitting.set(false);
          const msg = this.errorMessage(ex, 'No se pudo enviar tu respuesta');
          this.serverError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  private errorMessage(ex: unknown, fallback: string): string {
    if (ex instanceof TimeoutError) return 'La solicitud tardó demasiado, intenta de nuevo';
    return (ex as { error?: { message?: string } })?.error?.message ?? fallback;
  }
}
