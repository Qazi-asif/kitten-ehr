export function parsePagination(query, defaultLimit = 50) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function wantsPagination(query) {
  return query.page != null || query.limit != null;
}

export function paginatedResponse(items, total, page, limit) {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
