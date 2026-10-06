import { resolveColumn, tokensIn } from '$lib/workspace/tokens';
import { fileRefs } from './assets';

export interface TokenInfo { token: string; column: string | null }
export interface Analysis {
  tokens: TokenInfo[];
  unmatched: string[];
  missingFiles: string[];
  /** https:// images / fonts / stylesheets: they stop working offline. */
  externalRefs: number;
}

/** What a design needs: its {fields} (and which column each reads), files it points to, external resources. */
export function analyzeDesign(html: string, columns: string[], fieldMap: Record<string, string>, fileNames: string[]): Analysis {
  const tokens = tokensIn(html).map((token) => ({ token, column: resolveColumn(token, columns, fieldMap) }));
  const have = new Set(fileNames);
  return {
    tokens,
    unmatched: tokens.filter((t) => !t.column).map((t) => t.token),
    missingFiles: fileRefs(html).filter((f) => !have.has(f)),
    externalRefs: (html.match(/(?:src|href)\s*=\s*["']https?:\/\/|url\(\s*["']?https?:\/\//gi) ?? []).length,
  };
}
