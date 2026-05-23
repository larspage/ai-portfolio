import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextValue {
  tenantId: string | null;
  userId?: string;
  userRole?: string;
}

const tenantStorage = new AsyncLocalStorage<TenantContextValue>();

export const TenantContext = {
  /**
   * Run a function within a tenant context.
   * Call this in middleware to scope a request to a tenant.
   */
  run(tenantId: string | null, fn: () => Promise<unknown>): Promise<unknown> {
    return tenantStorage.run({ tenantId }, fn);
  },

  /**
   * Get the current tenant ID from the async context.
   * Returns null if no tenant context is active (e.g., unauthenticated routes).
   */
  getTenantId(): string | null {
    const store = tenantStorage.getStore();
    return store?.tenantId ?? null;
  },

  /**
   * Get the full tenant context value.
   */
  get(): TenantContextValue | undefined {
    return tenantStorage.getStore();
  },

  /**
   * Require a tenant ID — throws if not set.
   * Use in API routes that must be tenant-scoped.
   */
  requireTenantId(): string {
    const store = tenantStorage.getStore();
    if (!store?.tenantId) {
      throw new Error('No tenant context available — request is not tenant-scoped');
    }
    return store.tenantId;
  },

  /**
   * Update the current context with additional values (e.g., after auth resolves).
   */
  update(partial: Partial<TenantContextValue>): void {
    const store = tenantStorage.getStore();
    if (store) {
      Object.assign(store, partial);
    }
  },
};
