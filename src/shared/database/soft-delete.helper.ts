type PlainObject = Record<string, unknown>;

/**
 * Menambahkan filter soft-delete aktif (`deletedAt: null`) ke where clause.
 * Digunakan konsisten di seluruh query GET agar data terhapus tidak terbaca.
 */
export function activeWhere<T extends PlainObject>(where?: T): T & { deletedAt: null } {
  return {
    ...(where ?? ({} as T)),
    deletedAt: null,
  };
}

/**
 * Payload standar untuk soft delete.
 */
export function softDeleteData() {
  return {
    deletedAt: new Date(),
  };
}

/**
 * Payload standar untuk restore soft delete.
 */
export function restoreSoftDeleteData() {
  return {
    deletedAt: null,
  };
}
