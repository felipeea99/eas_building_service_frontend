// Encuestas — WebApi.DTOs.Surveys
import { PaginationParams } from '../../../shared/shared-models';

// ===== Enums (en requests viajan como número; en respuestas llegan como nombre) =====

export enum SurveyState {
  Draft = 0,
  Published = 1,
  Closed = 2,
}

export enum SurveyAudience {
  Building = 0,         // todos los clientes activos con acceso al edificio (al publicar)
  SelectedClients = 1,  // solo los elegidos
}

export enum SurveyQuestionType {
  SingleChoice = 0,
  MultipleChoice = 1,
  Rating = 2,     // 1 a 5
  YesNo = 3,      // 1 = sí, 0 = no
  Text = 4,
}

export type SurveyStateName = keyof typeof SurveyState;
export type SurveyAudienceName = keyof typeof SurveyAudience;
export type SurveyQuestionTypeName = keyof typeof SurveyQuestionType;

export const SURVEY_STATE_LABELS: Record<SurveyStateName, string> = {
  Draft: 'Borrador',
  Published: 'Publicada',
  Closed: 'Cerrada',
};

export const SURVEY_QUESTION_TYPE_OPTIONS: { value: SurveyQuestionType; label: string }[] = [
  { value: SurveyQuestionType.SingleChoice, label: 'Opción única' },
  { value: SurveyQuestionType.MultipleChoice, label: 'Opción múltiple' },
  { value: SurveyQuestionType.Rating, label: 'Calificación (1 a 5)' },
  { value: SurveyQuestionType.YesNo, label: 'Sí / No' },
  { value: SurveyQuestionType.Text, label: 'Respuesta abierta' },
];

export const SURVEY_LIMITS = {
  title: 200,
  description: 2000,
  questions: 50,
  questionText: 500,
  options: 20,
  optionText: 200,
  textAnswer: 2000,
} as const;

export function isChoiceType(type: SurveyQuestionType): boolean {
  return type === SurveyQuestionType.SingleChoice || type === SurveyQuestionType.MultipleChoice;
}

// ===== Staff =====

// GET api/surveys (renglón)
export interface SurveyListItemResponse {
  id: string;
  buildingId: string;
  buildingName: string;
  title: string;
  state: SurveyStateName;
  audience: SurveyAudienceName;
  startsAt: string | null;     // instante UTC
  endsAt: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  isOpen: boolean;
  questionCount: number;
  recipientCount: number;
  responseCount: number;
  dateCreated: string;
}

// GET api/surveys/{id}
export interface SurveyDetailResponse extends SurveyListItemResponse {
  description: string | null;
  questions: SurveyQuestionResponse[];
  targetClients: SurveyClientItem[];   // solo SelectedClients
}

export interface SurveyQuestionResponse {
  id: string;
  order: number;
  text: string;
  type: SurveyQuestionTypeName;
  typeValue: SurveyQuestionType;
  isRequired: boolean;
  options: SurveyOptionResponse[];
}

export interface SurveyOptionResponse {
  id: string;
  order: number;
  text: string;
}

// GET api/surveys/eligible-clients?buildingId=
export interface SurveyClientItem {
  tenantClientId: string;
  name: string;
  email: string;
}

// GET api/surveys/{id}/recipients
export interface SurveyRecipientResponse extends SurveyClientItem {
  respondedAt: string | null;
}

// GET api/surveys/{id}/results
export interface SurveyResultsResponse {
  surveyId: string;
  title: string;
  state: SurveyStateName;
  recipientCount: number;
  responseCount: number;
  responseRate: number;   // 0-100
  questions: SurveyQuestionResult[];
}

export interface SurveyQuestionResult {
  questionId: string;
  order: number;
  text: string;
  type: SurveyQuestionTypeName;
  answeredCount: number;
  options: SurveyOptionResult[];          // opción única / múltiple
  average: number | null;                 // rating
  distribution: Record<string, number>;   // rating: "1".."5" -> conteo
  yesCount: number | null;
  noCount: number | null;
  textAnswers: SurveyTextAnswer[];
}

export interface SurveyOptionResult {
  optionId: string;
  text: string;
  count: number;
  percentage: number;   // sobre answeredCount
}

export interface SurveyTextAnswer {
  tenantClientName: string;
  text: string;
  submittedAt: string;
}

export interface SurveyFilter extends PaginationParams {
  buildingId?: string;
  state?: SurveyState;
}

// POST api/surveys · PUT api/surveys/{id} (reemplaza el borrador completo)
export interface SaveSurveyRequest {
  buildingId: string;
  title: string;
  description: string | null;
  audience: SurveyAudience;
  startsAt: string | null;   // ISO con "Z"
  endsAt: string | null;
  tenantClientIds: string[]; // solo SelectedClients
  questions: SaveSurveyQuestionRequest[];   // el orden de la lista es el orden de las preguntas
}

export interface SaveSurveyQuestionRequest {
  text: string;
  type: SurveyQuestionType;
  isRequired: boolean;
  options: string[];         // solo opción única / múltiple (mín 2)
}

// ===== Cliente =====

// GET api/surveys/mine
export interface MySurveyResponse {
  id: string;
  buildingId: string;
  buildingName: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isOpen: boolean;
  respondedAt: string | null;
}

// GET api/surveys/{id}/form
export interface SurveyFormResponse {
  id: string;
  title: string;
  description: string | null;
  endsAt: string | null;
  isOpen: boolean;
  respondedAt: string | null;
  questions: SurveyQuestionResponse[];
}

// POST api/surveys/{id}/responses
export interface SubmitSurveyResponseRequest {
  answers: SubmitSurveyAnswerRequest[];
}

/** optionIds: opción única/múltiple · number: rating (1-5) y sí/no (1/0) · text: abierta */
export interface SubmitSurveyAnswerRequest {
  questionId: string;
  optionIds: string[] | null;
  number: number | null;
  text: string | null;
}
