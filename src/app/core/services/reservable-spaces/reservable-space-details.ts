import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import {
  CreateReservationRequest,
  CreateReservationResponse,
  GetReservableSpaceDetailsResponse,
} from './reservable-space-models';
import { PaginatedResponse } from '../../../shared/shared-models';

@Service()
export class ReservableSpaceDetailsService {
  private http = inject(HttpClient);

  create(request: CreateReservationRequest): Observable<CreateReservationResponse> {
    return this.http.post<CreateReservationResponse>(
      `${environment.apiUrl}/api/space-reservation-details`,
      request,
      { withCredentials: true },
    );
  }

  getAll(
    reservableSpaceId?: string,
    page: number = 1,
    pageSize: number = 40,
  ): Observable<PaginatedResponse<GetReservableSpaceDetailsResponse>> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (reservableSpaceId) {
      params = params.set('reservableSpaceId', reservableSpaceId);
    }

    return this.http.get<PaginatedResponse<GetReservableSpaceDetailsResponse>>(
      `${environment.apiUrl}/api/space-reservation-details`,
      { withCredentials: true, params },
    );
  }
}
