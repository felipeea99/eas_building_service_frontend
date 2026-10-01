import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateUnitRequest,
  CreateUnitResponse,
  UpdateUnitRequest,
} from './units-model';
import { UnitPaginatedResponse, UnitResponse } from '../building/building-models';
import { PaginatedResponse } from '../../../shared/shared-models';
import { environment } from '../../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class UnitService {
  private http = inject(HttpClient);

  createUnit(request: CreateUnitRequest): Observable<CreateUnitResponse> {
    return this.http.post<CreateUnitResponse>(
      `${environment.apiUrl}/api/units`,
      request,
      { withCredentials: true },
    );
  }

  getUnitsByBuilding(
    buildingId: string,
    page = 1,
    pageSize = 50,
  ): Observable<UnitPaginatedResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<UnitPaginatedResponse>(
      `${environment.apiUrl}/api/units/building/${buildingId}`,
      { withCredentials: true, params },
    );
  }

  getUnitsAvailableByBuilding(
    buildingId: string,
    page = 1,
    pageSize = 50,
  ): Observable<PaginatedResponse<UnitResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<PaginatedResponse<UnitResponse>>(
      `${environment.apiUrl}/api/units/building/${buildingId}/units-available`,
      { withCredentials: true, params },
    );
  }

  updateUnit(request: UpdateUnitRequest): Observable<boolean> {
    return this.http.put<boolean>(
      `${environment.apiUrl}/api/units/${request.unitId}`,
      request,
      { withCredentials: true },
    );
  }

  /** Available -> Maintenance. En mantenimiento el local no se puede rentar. */
  setMaintenance(unitId: string): Observable<void> {
    return this.http.patch<void>(
      `${environment.apiUrl}/api/units/${unitId}/maintenance`,
      {},
      { withCredentials: true },
    );
  }

  /** Maintenance -> Available. */
  endMaintenance(unitId: string): Observable<void> {
    return this.http.patch<void>(
      `${environment.apiUrl}/api/units/${unitId}/available`,
      {},
      { withCredentials: true },
    );
  }
}
