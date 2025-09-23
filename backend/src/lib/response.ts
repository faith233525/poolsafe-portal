export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  [key: string]: any; // allow extension
}

export function buildPaginated<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number,
  extra?: Record<string, any>,
): PaginatedResult<T> {
  return {
    data,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    ...(extra || {}),
  };
}

export function errorResponse(message: string, code?: string) {
  return { error: message, code };
}
