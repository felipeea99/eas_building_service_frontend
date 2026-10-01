export interface CreateParkingSpotRequest {
  buildingId: string;
  spotNumber: string;
  monthlyRate: number;
}

export interface CreateParkingSpotResponse {
  parkingSpotId: string;
  buildingId: string;
  spotNumber: string;
  monthlyRate: number;
}

export interface AssignParkingSpotRequest {
  parkingSpotId: string;
  tenantClientId: string;
}

export interface ParkingSpotInfo {
  parkingSpotId: string;
  buildingId: string;
  spotNumber: string;
  monthlyRate: number;
  hasMonthlyRate: boolean;
  isAssigned: boolean;
  unitAssigned: string | null;
  unitName: string | null;
  tenantClientId: string | null;
  tenantClientFullName: string | null;
}
