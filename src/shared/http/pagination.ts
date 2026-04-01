export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  nextPage: number | null;
  hasPrevPage: boolean;
  prevPage: number | null;
};

export function normalizePagination(params: PaginationParams): Required<PaginationParams> {
  const page =
    Number.isInteger(params.page) && (params.page ?? 0) > 0 ? (params.page as number) : 1;
  const rawLimit =
    Number.isInteger(params.limit) && (params.limit ?? 0) > 0 ? (params.limit as number) : 20;
  const limit = Math.min(rawLimit, 100);
  const search = params.search?.trim() ?? '';
  return { page, limit, search };
}

export function toPaginationMeta(page: number, limit: number, totalItems: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage,
    nextPage: hasNextPage ? page + 1 : null,
    hasPrevPage,
    prevPage: hasPrevPage ? page - 1 : null,
  };
}

export async function paginateQuery<T>(params: {
  page: number;
  limit: number;
  fetchItems: (args: { skip: number; take: number }) => Promise<T[]>;
  countItems: () => Promise<number>;
}): Promise<{ items: T[]; pagination: PaginationMeta }> {
  const skip = (params.page - 1) * params.limit;
  const [items, totalItems] = await Promise.all([
    params.fetchItems({ skip, take: params.limit }),
    params.countItems(),
  ]);

  return {
    items,
    pagination: toPaginationMeta(params.page, params.limit, totalItems),
  };
}
