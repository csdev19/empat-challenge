/**
 * Standard API response structure
 * All API responses follow this format for consistency
 */
export interface ApiResponse<T> {
  data: T | null;
  error: { message: string } | null;
  meta?: {
    pagination?: PaginationMeta;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Calculated pagination values
 */
export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}
