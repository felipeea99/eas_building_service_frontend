import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { PaginatedResponse } from '../../../shared/shared-models';
import {
  TenantClientRequest,
  TenantClientResponse,
  TenantClientUpdate,
  TenantClientChangeStatus,
  LinkUserAccountRequest,
} from './tenant-client-models';

@Service()
export class TenantClientService {
  private http = inject(HttpClient);

  create(request: TenantClientRequest): Observable<TenantClientResponse> {
    return this.http.post<TenantClientResponse>(
      `${environment.apiUrl}/api/tenant-clients`,
      request,
      { withCredentials: true },
    );
  }

  getAllByBuilding(
    buildingId: string,
    page = 1,
    pageSize = 40,
  ): Observable<PaginatedResponse<TenantClientResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<PaginatedResponse<TenantClientResponse>>(
      `${environment.apiUrl}/api/tenant-clients/building/${buildingId}`,
      { withCredentials: true, params },
    );
  }

  getAvailableByBuilding(
    buildingId: string,
    page = 1,
    pageSize = 40,
  ): Observable<PaginatedResponse<TenantClientResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<PaginatedResponse<TenantClientResponse>>(
      `${environment.apiUrl}/api/tenant-clients/building/${buildingId}/available`,
      { withCredentials: true, params },
    );
  }

  getById(id: string): Observable<TenantClientResponse> {
    return this.http.get<TenantClientResponse>(
      `${environment.apiUrl}/api/tenant-clients/${id}`,
      { withCredentials: true },
    );
  }

  update(id: string, request: TenantClientUpdate): Observable<TenantClientResponse> {
    return this.http.put<TenantClientResponse>(
      `${environment.apiUrl}/api/tenant-clients/${id}`,
      request,
      { withCredentials: true },
    );
  }

  changeStatus(request: TenantClientChangeStatus): Observable<boolean> {
    return this.http.put<boolean>(
      `${environment.apiUrl}/api/tenant-clients/${request.tenantClientId}/status`,
      request,
      { withCredentials: true },
    );
  }

  linkUser(request: LinkUserAccountRequest): Observable<TenantClientResponse> {
    return this.http.post<TenantClientResponse>(
      `${environment.apiUrl}/api/tenant-clients/link-user`,
      request,
      { withCredentials: true },
    );
  }

  unlinkUser(tenantClientId: string): Observable<TenantClientResponse> {
    return this.http.put<TenantClientResponse>(
      `${environment.apiUrl}/api/tenant-clients/${tenantClientId}/unlink-user`,
      {},
      { withCredentials: true },
    );
  }

  getWithoutUser(): Observable<TenantClientResponse[]> {
    return this.http.get<TenantClientResponse[]>(
      `${environment.apiUrl}/api/tenant-clients/without-user`,
      { withCredentials: true },
    );
  }
}
