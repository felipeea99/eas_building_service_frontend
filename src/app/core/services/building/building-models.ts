import { PaginatedResponse } from "../../../shared/shared-models";

export interface BuildingAvailableModel{
  buildingId: string,
  buildingName: string,
  imageS3?: string
}

export interface GetBuildingsResponse {
  id: string;
  name: string;
  address: string;
  hasParking: boolean;
  hasReservableSpaces: boolean;
  trackWater: boolean;
  trackElectricity: boolean;
  trackGas: boolean;
  totalUnits: number;
  occupiedUnits: number;
  imageS3?: string;
  status: boolean;
}

export interface UnitPaginatedResponse {
  buildingId: string;
  buildingName: string;
  units: PaginatedResponse<UnitResponse>;
}

export interface UnitResponse {
  id: string;
  unitName: string;
  floor: number;
  section: string;
  status: string;
  type: string;
  baseRent: number;
  tenantClientName?: string;
}

export interface AssignUserToBuildingRequest {
  buildingId: string;
  tenantUserId: string;
}
