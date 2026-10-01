import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import {
  CreateReservableSpaceRequest,
  CreateReservableSpaceResponse,
  ReservableSpaceResponse,
  ChangeStatusRequest,
  UpdateReservableSpaceRequest,
  GetReservableSpaceScheduleResponse,
  SetReservableSpaceScheduleRequest,
  GetAvailableSlotsResponse,
  PaginatedReservableResponse,
} from './reservable-space-models';
import { PaginatedResponse } from '../../../shared/shared-models';

@Service()
export class ReservableSpaceService {
  private http = inject(HttpClient);

  create(request: CreateReservableSpaceRequest): Observable<CreateReservableSpaceResponse> {
    return this.http.post<CreateReservableSpaceResponse>(
      `${environment.apiUrl}/api/reservable-space`,
      this.buildFormData(request),
      { withCredentials: true },
    );
  }

  changeStatus(id: string, request: ChangeStatusRequest): Observable<void> {
    return this.http.put<void>(
      `${environment.apiUrl}/api/reservable-space/${id}/status`,
      request,
      { withCredentials: true },
    );
  }

  getByBuilding(
    buildingId: string,
    page: number = 1,
    pageSize: number = 50,): Observable<PaginatedReservableResponse> {
    const params = new HttpParams()
      .set('buildingId', buildingId)
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<PaginatedReservableResponse>(
      `${environment.apiUrl}/api/reservable-space`,
      { withCredentials: true, params },
    );
  }

  update(id: string, request: UpdateReservableSpaceRequest): Observable<void> {
    return this.http.put<void>(
      `${environment.apiUrl}/api/reservable-space/${id}`,
      this.buildFormData(request),
      { withCredentials: true },
    );
  }

  // ── Horario ──

  getSchedule(id: string): Observable<GetReservableSpaceScheduleResponse> {
    return this.http.get<GetReservableSpaceScheduleResponse>(
      `${environment.apiUrl}/api/reservable-space/${id}/schedule`,
      { withCredentials: true },
    );
  }

  /** Reemplaza el horario semanal completo; los días que no se manden quedan cerrados */
  setSchedule(id: string, request: SetReservableSpaceScheduleRequest): Observable<GetReservableSpaceScheduleResponse> {
    return this.http.put<GetReservableSpaceScheduleResponse>(
      `${environment.apiUrl}/api/reservable-space/${id}/schedule`,
      request,
      { withCredentials: true },
    );
  }

  /** @param date día local del edificio en formato 'yyyy-MM-dd' */
  getAvailableSlots(id: string, date: string): Observable<GetAvailableSlotsResponse> {
    const params = new HttpParams().set('date', date);

    return this.http.get<GetAvailableSlotsResponse>(
      `${environment.apiUrl}/api/reservable-space/${id}/available-slots`,
      { withCredentials: true, params },
    );
  }

  /** Convierte el request a multipart/form-data (necesario para enviar la imagen) */
  private buildFormData(request: object): FormData {
    const formData = new FormData();
    for (const [key, value] of Object.entries(request)) {
      if (value === null || value === undefined) continue;
      if (value instanceof File) {
        formData.append(key, value, value.name);
      } else {
        formData.append(key, String(value));
      }
    }
    return formData;
  }
}
