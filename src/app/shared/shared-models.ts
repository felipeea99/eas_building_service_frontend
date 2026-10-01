export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}


/** Parámetros de paginación (PaginationRequest del backend) */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
