import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateContractRequest,
  CreateContractResponse,
  GetContractDetailResponse,
  GetContractHistoryResponse,
  GetContractsResponse,
  GetTenantClientContractsResponse,
} from './contract-models';
import { PaginatedResponse } from '../../../shared/shared-models';
import { environment } from '../../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class ContractService {
  private http = inject(HttpClient);

  create(request: CreateContractRequest): Observable<CreateContractResponse> {
    return this.http.post<CreateContractResponse>(
      `${environment.apiUrl}/api/contracts`,
      request,
      { withCredentials: true },
    );
  }

  createWithDocument(request: CreateContractRequest, document: File): Observable<CreateContractResponse> {
    const formData = new FormData();
    formData.append('unitId', request.unitId);
    formData.append('tenantClientId', request.tenantClientId);
    formData.append('startDate', request.startDate);
    formData.append('endDate', request.endDate);
    formData.append('monthlyRent', String(request.monthlyRent));
    formData.append('contractType', String(request.contractType));
    formData.append('document', document, document.name);

    return this.http.post<CreateContractResponse>(
      `${environment.apiUrl}/api/contracts/with-document`,
      formData,
      { withCredentials: true },
    );
  }

  getContractsByBuilding(buildingId: string, page = 1, pageSize = 40): Observable<PaginatedResponse<GetContractsResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<PaginatedResponse<GetContractsResponse>>(
      `${environment.apiUrl}/api/contracts/building/${buildingId}`,
      { withCredentials: true, params },
    );
  }

  cancel(unitContractId: string, reason?: string): Observable<boolean> {
    return this.http.patch<boolean>(
      `${environment.apiUrl}/api/contracts/${unitContractId}/cancel`,
      reason ? { reason } : {},
      { withCredentials: true },
    );
  }

  uploadDocument(contractId: string, file: File): Observable<boolean> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<boolean>(
      `${environment.apiUrl}/api/contracts/${contractId}/document`,
      formData,
      { withCredentials: true },
    );
  }

  /** Todos los contratos de un inquilino, marcando los vigentes (isCurrent) */
  getContractsByTenantClient(tenantClientId: string): Observable<GetTenantClientContractsResponse> {
    return this.http.get<GetTenantClientContractsResponse>(
      `${environment.apiUrl}/api/contracts/tenant-client/${tenantClientId}`,
      { withCredentials: true },
    );
  }

  /** Historial inmutable del contrato (alta, documento, cancelación) — solo staff */
  getHistory(contractId: string): Observable<GetContractHistoryResponse> {
    return this.http.get<GetContractHistoryResponse>(
      `${environment.apiUrl}/api/contracts/${contractId}/history`,
      { withCredentials: true },
    );
  }

  getContractById(contractId: string): Observable<GetContractDetailResponse> {
    return this.http.get<GetContractDetailResponse>(
      `${environment.apiUrl}/api/contracts/contract/${contractId}`,
      { withCredentials: true },
    );
  }
}
