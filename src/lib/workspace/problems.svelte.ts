import type { Problem } from './inspect';

export interface ProblemReport { title: string; lead?: string; items: Problem[] }

/** A folder or file that cannot be used: shown as a red dialog (see layout/ProblemDialog.svelte). */
class Problems {
  current = $state.raw<ProblemReport | null>(null);
}

export const problems = new Problems();

export function showProblems(title: string, items: Problem[], lead?: string) {
  problems.current = { title, items, lead };
}
