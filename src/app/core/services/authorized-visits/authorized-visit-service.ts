import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateAuthorizedVisitRequest,
  CreateAuthorizedVisitResponse,
  GetAuthorizedVisitResponse,
  ValidateQRResponse,
} from './authorized-visit-models';
import { PaginatedResponse } from '../../../shared/shared-models';
import { environment } from '../../../../environments/environment.development';

@Service()
export class AuthorizedVisitService {
  private http = inject(HttpClient);

  getAuthorizedVisits(
    buildingId: string,
    page = 1,
    pageSize = 50,
  ): Observable<PaginatedResponse<GetAuthorizedVisitResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<PaginatedResponse<GetAuthorizedVisitResponse>>(
      `${environment.apiUrl}/api/authorized-visits/${buildingId}`,
      { withCredentials: true, params },
    );
  }

  createAuthorizedVisit(
    request: CreateAuthorizedVisitRequest,
  ): Observable<CreateAuthorizedVisitResponse> {
    return this.http.post<CreateAuthorizedVisitResponse>(
      `${environment.apiUrl}/api/authorized-visits`,
      request,
      { withCredentials: true },
    );
  }

  validateQR(qrCode: string): Observable<ValidateQRResponse> {
    return this.http.get<ValidateQRResponse>(
      `${environment.apiUrl}/api/authorized-visits/validate/${qrCode}`,
      { withCredentials: true },
    );
  }

  registerEntry(id: string): Observable<boolean> {
    return this.http.put<boolean>(
      `${environment.apiUrl}/api/authorized-visits/${id}/entry`,
      {},
      { withCredentials: true },
    );
  }

  registerExit(id: string): Observable<boolean> {
    return this.http.put<boolean>(
      `${environment.apiUrl}/api/authorized-visits/${id}/exit`,
      {},
      { withCredentials: true },
    );
  }

  cancel(id: string): Observable<boolean> {
    return this.http.put<boolean>(
      `${environment.apiUrl}/api/authorized-visits/${id}/cancel`,
      {},
      { withCredentials: true },
    );
  }
}
