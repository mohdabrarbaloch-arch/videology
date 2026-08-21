const SHELL_META_RE = /[;&|`$(){}!<>#~\n\r]/;

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("URL cannot be empty");
  if (SHELL_META_RE.test(trimmed)) {
    throw new Error("URL contains invalid characters");
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("URL must use http or https protocol");
    }
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error("Invalid URL format");
    }
    throw e;
  }
  return trimmed;
}

export function isOpenRouterKey(key: string): boolean {
  return key.startsWith("sk-or-v1-");
}
