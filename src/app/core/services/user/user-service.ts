import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { GetUserResponse, TenantUserResponse } from '../../auth/models/register-users';
import { environment } from '../../../../environments/environment.development';

@Service()
export class UserService {
  private http = inject(HttpClient);

  GetAllUsersAvailableByTenantId(buildingId: string): Observable<TenantUserResponse[]> {
    return this.http.get<TenantUserResponse[]>(`${environment.apiUrl}/api/users/available/${buildingId}`, {
      withCredentials: true,
   });
  }

  /** Cuentas Cliente con acceso al edificio y sin perfil de cliente en la empresa (para vincular) */
  getClientUsersAvailable(buildingId?: string): Observable<TenantUserResponse[]> {
    const url = buildingId
      ? `${environment.apiUrl}/api/users/available-clients/${buildingId}`
      : `${environment.apiUrl}/api/users/available-clients`;
    return this.http.get<TenantUserResponse[]>(url, { withCredentials: true });
  }

  GetAllUsersByTenantId(): Observable<GetUserResponse[]> {
    return this.http.get<GetUserResponse[]>(`${environment.apiUrl}/api/users`, {
      withCredentials: true,
   });
  }
}
