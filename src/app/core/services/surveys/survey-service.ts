import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { PaginatedResponse } from '../../../shared/shared-models';
import {
  MySurveyResponse,
  SaveSurveyRequest,
  SubmitSurveyResponseRequest,
  SurveyClientItem,
  SurveyDetailResponse,
  SurveyFilter,
  SurveyFormResponse,
  SurveyListItemResponse,
  SurveyRecipientResponse,
  SurveyResultsResponse,
} from './survey-models';

/** Encuestas (api/surveys): staff arma/publica/ve resultados; el cliente contesta */
@Service()
export class SurveyService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/surveys`;

  // ===== Staff =====

  getSurveys(filter: SurveyFilter): Observable<PaginatedResponse<SurveyListItemResponse>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<PaginatedResponse<SurveyListItemResponse>>(this.baseUrl, { withCredentials: true, params });
  }

  getById(surveyId: string): Observable<SurveyDetailResponse> {
    return this.http.get<SurveyDetailResponse>(`${this.baseUrl}/${surveyId}`, { withCredentials: true });
  }

  /** Clientes que hoy recibirían una encuesta del edificio */
  getEligibleClients(buildingId: string): Observable<SurveyClientItem[]> {
    const params = new HttpParams().set('buildingId', buildingId);
    return this.http.get<SurveyClientItem[]>(`${this.baseUrl}/eligible-clients`, { withCredentials: true, params });
  }

  create(request: SaveSurveyRequest): Observable<SurveyDetailResponse> {
    return this.http.post<SurveyDetailResponse>(this.baseUrl, request, { withCredentials: true });
  }

  /** Reemplaza el borrador completo (solo Draft) */
  updateDraft(surveyId: string, request: SaveSurveyRequest): Observable<SurveyDetailResponse> {
    return this.http.put<SurveyDetailResponse>(`${this.baseUrl}/${surveyId}`, request, { withCredentials: true });
  }

  /** Elimina un borrador (las publicadas se cierran) */
  deleteDraft(surveyId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${surveyId}`, { withCredentials: true });
  }

  publish(surveyId: string): Observable<SurveyDetailResponse> {
    return this.http.post<SurveyDetailResponse>(`${this.baseUrl}/${surveyId}/publish`, {}, { withCredentials: true });
  }

  close(surveyId: string): Observable<SurveyDetailResponse> {
    return this.http.post<SurveyDetailResponse>(`${this.baseUrl}/${surveyId}/close`, {}, { withCredentials: true });
  }

  /** responded: true = contestaron, false = pendientes, null = todos */
  getRecipients(surveyId: string, responded: boolean | null = null): Observable<SurveyRecipientResponse[]> {
    let params = new HttpParams();
    if (responded !== null) {
      params = params.set('responded', responded);
    }
    return this.http.get<SurveyRecipientResponse[]>(`${this.baseUrl}/${surveyId}/recipients`, { withCredentials: true, params });
  }

  getResults(surveyId: string): Observable<SurveyResultsResponse> {
    return this.http.get<SurveyResultsResponse>(`${this.baseUrl}/${surveyId}/results`, { withCredentials: true });
  }

  // ===== Cliente =====

  getMySurveys(): Observable<MySurveyResponse[]> {
    return this.http.get<MySurveyResponse[]>(`${this.baseUrl}/mine`, { withCredentials: true });
  }

  getForm(surveyId: string): Observable<SurveyFormResponse> {
    return this.http.get<SurveyFormResponse>(`${this.baseUrl}/${surveyId}/form`, { withCredentials: true });
  }

  submitResponse(surveyId: string, request: SubmitSurveyResponseRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${surveyId}/responses`, request, { withCredentials: true });
  }
}
