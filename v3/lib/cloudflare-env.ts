export type R2ObjectBodyLike = {
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
};

export type R2BucketLike = {
  get: (key: string) => Promise<R2ObjectBodyLike | null>;
  put: (
    key: string,
    value: string | ArrayBuffer | Uint8Array | ReadableStream,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
      customMetadata?: Record<string, string>;
    },
  ) => Promise<unknown>;
  delete: (keys: string | string[]) => Promise<void>;
  list: (options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }) => Promise<{
    objects: Array<{ key: string }>;
    truncated: boolean;
    cursor?: string;
  }>;
};

type CloudflareEnvMap = Record<string, unknown> & {
  PORTFOLIO_BUCKET?: R2BucketLike;
};

async function loadCloudflareEnv(): Promise<CloudflareEnvMap | null> {
  try {
    const specifier: string = "cloudflare:workers";
    const mod = (await import(
      /* @vite-ignore */ /* webpackIgnore: true */ specifier
    )) as { env?: CloudflareEnvMap };
    return mod.env ?? null;
  } catch {
    return null;
  }
}

export async function getPortfolioBucket(): Promise<R2BucketLike | null> {
  const cfEnv = await loadCloudflareEnv();
  return cfEnv?.PORTFOLIO_BUCKET ?? null;
}

export async function getRuntimeSecret(key: string): Promise<string | undefined> {
  const cfEnv = await loadCloudflareEnv();
  const fromCf = cfEnv?.[key];
  if (typeof fromCf === "string" && fromCf.length > 0) {
    return fromCf;
  }
  const fromProcess = process.env[key];
  if (typeof fromProcess === "string" && fromProcess.length > 0) {
    return fromProcess;
  }
  return undefined;
}
