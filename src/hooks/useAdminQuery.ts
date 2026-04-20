import { supabase } from '@/lib/supabase'

export interface AdminQueryOptions {
  table: string
  select?: string
  count?: boolean
  head?: boolean
  filters?: Array<{
    type: 'eq' | 'in' | 'gte' | 'lte' | 'ilike' | 'or' | 'neq' | 'is'
    col?: string
    val: unknown
  }>
  order?: { col: string; asc?: boolean }
  range?: [number, number]
  limit?: number
}

export interface AdminQueryResult<T = unknown> {
  data: T[] | null
  count: number | null
  error: string | null
}

/**
 * adminQuery
 *
 * Queries Supabase WITHOUT a user_id filter.
 * Access control is handled by the is_admin() RLS function
 * in Supabase — meaning Supabase allows admins to see all rows.
 *
 * Make sure you have run fix_rls_policies.sql in Supabase
 * before using this function.
 */
export async function adminQuery<T = unknown>(
  opts: AdminQueryOptions
): Promise<AdminQueryResult<T>> {
  try {
    // Build query against Supabase directly
    // RLS + is_admin() function ensures only admins can read all rows
    let q = supabase
      .from(opts.table)
      .select(
        opts.select ?? '*',
        opts.count
          ? { count: 'exact', head: opts.head ?? false }
          : undefined
      ) as any

    // Apply filters — NO user_id filter added
    for (const f of opts.filters ?? []) {
      if (f.type === 'eq' && f.col)    q = q.eq(f.col, f.val)
      if (f.type === 'neq' && f.col)   q = q.neq(f.col, f.val)
      if (f.type === 'ilike' && f.col) q = q.ilike(f.col, f.val)
      if (f.type === 'in' && f.col)    q = q.in(f.col, f.val)
      if (f.type === 'gte' && f.col)   q = q.gte(f.col, f.val)
      if (f.type === 'lte' && f.col)   q = q.lte(f.col, f.val)
      if (f.type === 'is' && f.col)    q = q.is(f.col, f.val)
      if (f.type === 'or')             q = q.or(f.val as string)
    }

    if (opts.order) {
      q = q.order(opts.order.col, { ascending: opts.order.asc ?? false })
    }
    if (opts.range) q = q.range(opts.range[0], opts.range[1])
    if (opts.limit) q = q.limit(opts.limit)

    const result = await q
    return {
      data: result.data as T[] | null,
      count: (result as any).count as number | null,
      error: result.error?.message ?? null,
    }
  } catch (err: unknown) {
    return {
      data: null,
      count: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export async function adminQuerySingle<T = unknown>(
  opts: AdminQueryOptions
): Promise<{ data: T | null; error: string | null }> {
  const result = await adminQuery<T>({ ...opts, limit: 1 })
  return { data: result.data?.[0] ?? null, error: result.error }
}

/**
 * adminUpdate
 * Update any row as admin — RLS allows it via is_admin()
 */
export async function adminUpdate(
  table: string,
  id: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
  return { error: error?.message ?? null }
}