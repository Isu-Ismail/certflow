// Design tokens: `{Name}` placeholders in .cert.html files, matched to data columns.

export const TOKEN_SOURCE = String.raw`\{([^{}<>\n]{1,60})\}`;
const NAMELIKE = /^[\p{L}\p{N}_ .\-#/]+$/u; // skips CSS / JS braces such as `{ color: red; }`

/** Unique token names used in a design's HTML, in order of appearance. */
export function tokensIn(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(new RegExp(TOKEN_SOURCE, 'g'))) {
    const name = m[1].trim();
    if (name && NAMELIKE.test(name)) found.add(name);
  }
  return [...found];
}

/** True if `name` looks like a field name (not CSS/JS braces). */
export const isTokenName = (name: string) => !!name && NAMELIKE.test(name);

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * The data column a token reads from: an explicit mapping, else the same name,
 * else a near match (`Roll_Number` ~ `Roll Number`). Null = unmatched.
 * Rendering must use this same function so the Data page and the output agree.
 */
export function resolveColumn(token: string, columns: string[], fieldMap: Record<string, string>): string | null {
  const mapped = fieldMap[token];
  if (mapped && columns.includes(mapped)) return mapped;
  if (columns.includes(token)) return token;
  const n = norm(token);
  const near = columns.find((c) => norm(c) === n);
  if (near) return near;
  // `{data2.Mobile}`: a column of one data file (any case)
  const alias = Object.keys(fieldMap).find((k) => k.includes('.') && norm(k) === n);
  return alias && columns.includes(fieldMap[alias]) ? fieldMap[alias] : null;
}
