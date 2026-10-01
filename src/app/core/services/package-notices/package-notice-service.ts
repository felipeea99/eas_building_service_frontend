import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { PaginatedResponse } from '../../../shared/shared-models';
import {
  CreatePackageNoticeRequest,
  PackageNoticeFilter,
  PackageNoticeResponse,
  PackageNoticeUnitOption,
} from './package-notice-models';

/** Avisos de paquete (api/package-notices): el cliente avisa; guardia/staff marca como recibido */
@Service()
export class PackageNoticeService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/package-notices`;

  // ===== Cliente =====

  getMyUnits(): Observable<PackageNoticeUnitOption[]> {
    return this.http.get<PackageNoticeUnitOption[]>(`${this.baseUrl}/my-units`, { withCredentials: true });
  }

  getMine(): Observable<PackageNoticeResponse[]> {
    return this.http.get<PackageNoticeResponse[]>(`${this.baseUrl}/mine`, { withCredentials: true });
  }

  create(request: CreatePackageNoticeRequest): Observable<PackageNoticeResponse> {
    return this.http.post<PackageNoticeResponse>(this.baseUrl, request, { withCredentials: true });
  }

  cancel(packageNoticeId: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${packageNoticeId}/cancel`, {}, { withCredentials: true });
  }

  // ===== Staff / Guardia =====

  getByBuilding(filter: PackageNoticeFilter): Observable<PaginatedResponse<PackageNoticeResponse>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<PaginatedResponse<PackageNoticeResponse>>(this.baseUrl, { withCredentials: true, params });
  }

  markAsReceived(packageNoticeId: string): Observable<PackageNoticeResponse> {
    return this.http.patch<PackageNoticeResponse>(`${this.baseUrl}/${packageNoticeId}/receive`, {}, { withCredentials: true });
  }
}
