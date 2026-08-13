type SupabaseProjectUrls = {
  databaseUrl: string;
  expectedProjectRef: string;
  publicUrls?: string[];
};

export class SupabaseProjectConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseProjectConfigError";
  }
}

function parseUrl(value: string, name: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new SupabaseProjectConfigError(`${name} must be a valid URL.`);
  }
}

function databaseProjectRef(databaseUrl: string): string {
  const url = parseUrl(databaseUrl, "POSTGRES_URL");

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new SupabaseProjectConfigError(
      "POSTGRES_URL must use the PostgreSQL protocol.",
    );
  }

  const username = decodeURIComponent(url.username);
  const usernameMatch = /^postgres\.([a-z0-9]+)$/i.exec(username);
  const isPoolerHost = /(^|\.)pooler\.supabase\.com$/i.test(url.hostname);
  const hostnameMatch = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(
    url.hostname,
  );
  const usernameRef = isPoolerHost
    ? usernameMatch?.[1].toLowerCase()
    : undefined;
  const hostnameRef = hostnameMatch?.[1].toLowerCase();

  if (usernameRef && hostnameRef && usernameRef !== hostnameRef) {
    throw new SupabaseProjectConfigError(
      "POSTGRES_URL contains conflicting Supabase project refs.",
    );
  }

  const projectRef = usernameRef ?? hostnameRef;

  if (!projectRef) {
    throw new SupabaseProjectConfigError(
      "POSTGRES_URL does not identify a Supabase project ref.",
    );
  }

  return projectRef;
}

function publicProjectRef(publicUrl: string): string {
  const url = parseUrl(publicUrl, "SUPABASE_URL");
  const match = /^([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname);

  if (!match) {
    throw new SupabaseProjectConfigError(
      "SUPABASE_URL does not identify a Supabase project ref.",
    );
  }

  return match[1].toLowerCase();
}

export function resolveSupabaseProjectRef(
  urls: SupabaseProjectUrls,
): string {
  const databaseRef = databaseProjectRef(urls.databaseUrl);
  const expectedProjectRef = urls.expectedProjectRef.trim().toLowerCase();

  if (!/^[a-z0-9]+$/.test(expectedProjectRef)) {
    throw new SupabaseProjectConfigError(
      "SUPABASE_PROJECT_REF must be a valid project ref.",
    );
  }

  if (databaseRef !== expectedProjectRef) {
    throw new SupabaseProjectConfigError(
      "POSTGRES_URL targets a different Supabase project.",
    );
  }

  for (const publicUrl of urls.publicUrls ?? []) {
    if (publicProjectRef(publicUrl) !== expectedProjectRef) {
      throw new SupabaseProjectConfigError(
        "A public Supabase URL targets a different project.",
      );
    }
  }

  return databaseRef;
}

export function isSupabaseProjectConfigError(
  error: unknown,
): error is SupabaseProjectConfigError {
  return error instanceof SupabaseProjectConfigError;
}
