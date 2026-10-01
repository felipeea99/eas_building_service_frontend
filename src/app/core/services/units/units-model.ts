export interface CreateUnitRequest {
  buildingId: string;
  floor: number;
  section: string;
  unitName: string;
  type: UnitType;
  areaSqm: number;
  baseRent: number;
}

export interface CreateUnitResponse {
  id: string;
  buildingId: string;
  floor: number;
  section: string;
  unitName: string;
  type: string;
  status: string;
  areaSqm: number;
  baseRent: number;
}

export interface UpdateUnitRequest {
  unitId: string;
  floor: number;
  section: string;
  unitName: string;
  type: UnitType;
  status: UnitStatus;
  areaSqm: number;
  baseRent: number;
}

export enum UnitType {
  Apartment = 1,
  Commercial = 2,
  Office = 3,
  Warehouse = 4,
  Parking = 5,
  Storage = 6,
  Other = 7
}

export enum UnitStatus {
  Available = 0,
  Occupied = 1,
  Maintenance = 2,
  Reserved = 3
}

