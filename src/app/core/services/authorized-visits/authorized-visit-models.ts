export interface CreateAuthorizedVisitRequest {
  buildingId: string;
  visitorName: string;
  visitorPhone?: string;
  purpose?: string;
  qrCode: string;
  validFrom: string;
  validUntil: string;
  unitId?: string;
  reservableSpaceId?: string;
}

export interface CreateAuthorizedVisitResponse {
  id: string;
  visitorName: string;
  qrCode: string;
  validFrom: string;
  validUntil: string;
  isValid: boolean;
  unitId?: string;
  reservableSpaceId?: string;
  accessType: string;
}

export interface GetAuthorizedVisitResponse {
  id: string;
  buildingId: string;
  authorizedByUserId: string;
  visitorName: string;
  visitorPhone?: string;
  purpose?: string;
  qrCode: string;
  validFrom: string;
  validUntil: string;
  enteredAt?: string;
  exitedAt?: string;
  isCancelled: boolean;
  isValid: boolean;
  isInside: boolean;
}

export interface ValidateQRResponse {
  isValid: boolean;
  visitorName: string;
  purpose: string;
  buildingId: string;
  message: string;
}
