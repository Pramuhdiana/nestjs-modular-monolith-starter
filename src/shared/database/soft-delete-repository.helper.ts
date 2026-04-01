import { activeWhere, restoreSoftDeleteData, softDeleteData } from './soft-delete.helper';

type UpdateManyFn = (args: {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
}) => Promise<{ count: number }>;

export async function softDeleteByWhere(
  updateMany: UpdateManyFn,
  where: Record<string, unknown>,
): Promise<boolean> {
  const result = await updateMany({
    where: activeWhere(where),
    data: softDeleteData(),
  });
  return result.count > 0;
}

export async function restoreByWhere(
  updateMany: UpdateManyFn,
  where: Record<string, unknown>,
): Promise<boolean> {
  const result = await updateMany({
    where,
    data: restoreSoftDeleteData(),
  });
  return result.count > 0;
}
