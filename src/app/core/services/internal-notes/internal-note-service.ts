import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { PaginatedResponse } from '../../../shared/shared-models';
import {
  CreateInternalNoteRequest,
  InternalNoteResponse,
  UpdateInternalNoteRequest,
} from './internal-note-models';

/** Bitácora interna por inquilino (api/internal-notes, solo staff) */
@Service()
export class InternalNoteService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/internal-notes`;

  /** Notas de un inquilino: fijadas primero, luego las más recientes */
  getByTenantClient(
    tenantClientId: string,
    unitContractId: string | null = null,
    page = 1,
    pageSize = 50,
  ): Observable<PaginatedResponse<InternalNoteResponse>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (unitContractId) {
      params = params.set('unitContractId', unitContractId);
    }

    return this.http.get<PaginatedResponse<InternalNoteResponse>>(
      `${this.baseUrl}/tenant-client/${tenantClientId}`,
      { withCredentials: true, params },
    );
  }

  /** Seguimientos pendientes con fecha de hoy o anterior (más atrasados primero) */
  getPendingFollowUps(page = 1, pageSize = 50): Observable<PaginatedResponse<InternalNoteResponse>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);

    return this.http.get<PaginatedResponse<InternalNoteResponse>>(
      `${this.baseUrl}/follow-ups`,
      { withCredentials: true, params },
    );
  }

  create(request: CreateInternalNoteRequest): Observable<InternalNoteResponse> {
    return this.http.post<InternalNoteResponse>(this.baseUrl, request, { withCredentials: true });
  }

  update(noteId: string, request: UpdateInternalNoteRequest): Observable<InternalNoteResponse> {
    return this.http.put<InternalNoteResponse>(`${this.baseUrl}/${noteId}`, request, { withCredentials: true });
  }

  setPinned(noteId: string, isPinned: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${noteId}/pin`, { isPinned }, { withCredentials: true });
  }

  completeFollowUp(noteId: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${noteId}/follow-up/complete`, {}, { withCredentials: true });
  }

  /** Borrado lógico (solo el autor) */
  delete(noteId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${noteId}`, { withCredentials: true });
  }
}
