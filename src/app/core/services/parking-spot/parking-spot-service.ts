import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import {
  AssignParkingSpotRequest,
  CreateParkingSpotRequest,
  CreateParkingSpotResponse,
  ParkingSpotInfo,
} from './parking-spot-models';

@Service()
export class ParkingSpotService {
  private http = inject(HttpClient);

  create(request: CreateParkingSpotRequest): Observable<CreateParkingSpotResponse> {
    return this.http.post<CreateParkingSpotResponse>(
      `${environment.apiUrl}/api/parking-spots`,
      request,
      { withCredentials: true }
    );
  }

  release(parkingSpotId: string): Observable<void> {
    return this.http.put<void>(
      `${environment.apiUrl}/api/parking-spots/${parkingSpotId}/release`,
      {},
      { withCredentials: true }
    );
  }

  assign(parkingSpotId: string, tenantClientId: string): Observable<void> {
    const body: AssignParkingSpotRequest = { parkingSpotId, tenantClientId };
    return this.http.put<void>(
      `${environment.apiUrl}/api/parking-spots/assign`,
      body,
      { withCredentials: true }
    );
  }

  getByBuilding(buildingId: string): Observable<ParkingSpotInfo[]> {
    return this.http.get<ParkingSpotInfo[]>(
      `${environment.apiUrl}/api/parking-spots/${buildingId}`,
      { withCredentials: true }
    );
  }
}
