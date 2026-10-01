export interface CreateBuildingRequest {
  name: string;
  address: string;
  hasReservableSpaces: boolean;
  hasParking: boolean;
  trackWater: boolean;
  trackElectricity: boolean;
  trackGas: boolean;
  imageFileS3?: File | null;
}

export interface CreateBuildingResponse {
  id: string;
  name: string;
  imageS3?: string;
}

export interface UpdateBuildingRequest {
  buildingId: string;
  name: string;
  address: string;
  hasReservableSpaces: boolean;
  hasParking: boolean;
  trackWater: boolean;
  trackElectricity: boolean;
  trackGas: boolean;
  imageFileS3?: File | null;
}
