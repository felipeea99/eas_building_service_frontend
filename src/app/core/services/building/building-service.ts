import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment.development';
import { Observable } from 'rxjs/internal/Observable';
import { catchError, map, of, timeout } from 'rxjs';
import { AssignUserToBuildingRequest, BuildingAvailableModel, GetBuildingsResponse, UnitResponse } from './building-models';
import {
  CreateBuildingRequest,
  CreateBuildingResponse,
  UpdateBuildingRequest,
} from '../../../features/building/models/building-models';
import { PaginatedResponse } from '../../../shared/shared-models';

@Service()
export class BuildingService {
  private http = inject(HttpClient);
  private router = inject(Router);

  getBuildingAvailableByUser(): Observable<BuildingAvailableModel[]> {
    return this.http.get<BuildingAvailableModel[]>(
      `${environment.apiUrl}/api/buildings/builidingByContext`,
      { withCredentials: true },
    );
  }

  createBuilding(request: CreateBuildingRequest): Observable<CreateBuildingResponse> {
    const formData = this.buildFormData(request);
    return this.http.post<CreateBuildingResponse>(`${environment.apiUrl}/api/buildings`, formData, {
      withCredentials: true,
    });
  }

  GetAllBuildings(): Observable<PaginatedResponse<GetBuildingsResponse>>{
    return this.http.get<PaginatedResponse<GetBuildingsResponse>>(
      `${environment.apiUrl}/api/buildings`,
      { withCredentials: true },
    );
  }

  /** Edificios del cliente autenticado (solo rol Client) */
  getMyBuildings(): Observable<GetBuildingsResponse[]> {
    return this.http.get<GetBuildingsResponse[]>(
      `${environment.apiUrl}/api/buildings/my-buildings`,
      { withCredentials: true },
    );
  }

  /**
   * Edificios del usuario según su rol: Client usa my-buildings,
   * los demás (staff, Guard) el listado con acceso por asignación.
   */
  getBuildingsForRole(role: string | null): Observable<GetBuildingsResponse[]> {
    return role === 'Client'
      ? this.getMyBuildings()
      : this.GetAllBuildings().pipe(map((res) => res.items));
  }

  /**
   * A dónde mandar al usuario al iniciar sesión:
   * 1 edificio → su dashboard; 0 o varios → /inicio (tarjetas).
   * Si falla o tarda más de 10 s, cae en /inicio.
   */
  resolveLandingUrl(role: string | null): Observable<string> {
    return this.getBuildingsForRole(role).pipe(
      timeout(10_000),
      map((buildings) =>
        buildings.length === 1 ? `/building-dashboard/${buildings[0].id}` : '/inicio',
      ),
      catchError(() => of('/inicio')),
    );
  }

  GetBuildingById(id: string): Observable<GetBuildingsResponse> {
    return this.http.get<GetBuildingsResponse>(
      `${environment.apiUrl}/api/buildings/${id}`,
      { withCredentials: true },
    );
  }


  AssignBuilding(request: AssignUserToBuildingRequest): Observable<AssignUserToBuildingRequest>{
    return this.http.post<AssignUserToBuildingRequest>(
      `${environment.apiUrl}/api/buildings/assign`, request,
      { withCredentials: true },
    );
  }

  updateBuilding(request: UpdateBuildingRequest): Observable<void> {
    const formData = this.buildFormData(request);
    return this.http.put<void>(
      `${environment.apiUrl}/api/buildings/update`,
      formData,
      { withCredentials: true },
    );
  }

  private buildFormData(request: Record<string, any>): FormData {
    const formData = new FormData();
    for (const key of Object.keys(request)) {
      const value = request[key];
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
