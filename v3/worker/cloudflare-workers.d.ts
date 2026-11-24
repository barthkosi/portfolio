interface SqlStorageCursor<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  toArray(): T[];
  one(): T;
}

interface SqlStorage {
  exec<T extends Record<string, unknown> = Record<string, unknown>>(
    query: string,
    ...bindings: unknown[]
  ): SqlStorageCursor<T>;
}

interface DurableObjectStorage {
  sql: SqlStorage;
  setAlarm(scheduledTime: number | Date): Promise<void>;
  getAlarm(): Promise<number | null>;
  deleteAlarm(): Promise<void>;
}

interface DurableObjectState {
  storage: DurableObjectStorage;
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}

declare module "cloudflare:workers" {
  export class DurableObject<TEnv = unknown> {
    protected ctx: DurableObjectState;
    protected env: TEnv;
    constructor(ctx: DurableObjectState, env: TEnv);
  }
}
