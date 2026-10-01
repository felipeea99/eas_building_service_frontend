import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { PaginatedResponse } from '../../../shared/shared-models';
import {
  CreateIncidentRequest,
  IncidentCategoryResponse,
  IncidentFilter,
  IncidentResponse,
  IncidentSummaryFilter,
  ResolveIncidentRequest,
  TenantClientIncidentSummaryResponse,
  UpdateIncidentRequest,
} from './incident-models';

/** Incidencias de inquilinos y lista de morosos (api/incidents, solo staff) */
@Service()
export class IncidentService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/incidents`;

  getCategories(): Observable<IncidentCategoryResponse[]> {
    return this.http.get<IncidentCategoryResponse[]>(`${this.baseUrl}/categories`, { withCredentials: true });
  }

  /** Incidencias con filtros; abiertas primero, luego las más recientes */
  getIncidents(filter: IncidentFilter): Observable<PaginatedResponse<IncidentResponse>> {
    return this.http.get<PaginatedResponse<IncidentResponse>>(this.baseUrl, {
      withCredentials: true,
      params: this.toParams(filter),
    });
  }

  /** Lista de morosos / clientes con incidencias */
  getClientsSummary(filter: IncidentSummaryFilter): Observable<PaginatedResponse<TenantClientIncidentSummaryResponse>> {
    return this.http.get<PaginatedResponse<TenantClientIncidentSummaryResponse>>(`${this.baseUrl}/clients-summary`, {
      withCredentials: true,
      params: this.toParams(filter),
    });
  }

  getById(incidentId: string): Observable<IncidentResponse> {
    return this.http.get<IncidentResponse>(`${this.baseUrl}/${incidentId}`, { withCredentials: true });
  }

  create(request: CreateIncidentRequest): Observable<IncidentResponse> {
    return this.http.post<IncidentResponse>(this.baseUrl, request, { withCredentials: true });
  }

  update(incidentId: string, request: UpdateIncidentRequest): Observable<IncidentResponse> {
    return this.http.put<IncidentResponse>(`${this.baseUrl}/${incidentId}`, request, { withCredentials: true });
  }

  resolve(incidentId: string, request: ResolveIncidentRequest): Observable<IncidentResponse> {
    return this.http.patch<IncidentResponse>(`${this.baseUrl}/${incidentId}/resolve`, request, { withCredentials: true });
  }

  reopen(incidentId: string): Observable<IncidentResponse> {
    return this.http.patch<IncidentResponse>(`${this.baseUrl}/${incidentId}/reopen`, {}, { withCredentials: true });
  }

  /** Anula un registro capturado por error (Manager o superior) */
  void(incidentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${incidentId}`, { withCredentials: true });
  }

  /** Convierte un objeto de filtros en HttpParams (omite vacíos) */
  private toParams(filter: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
