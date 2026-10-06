// The node graph (Svelte Flow) is a separate chunk. It is fetched in the background once the app is up, so the
// Flow step shows it at once; until then the step shows a short loading line.
export const graphLoader = $state<{ component: typeof import('./GraphView.svelte').default | null }>({ component: null });

let started = false;
export function preloadGraph() {
  if (started) return;
  started = true;
  import('./GraphView.svelte').then((m) => (graphLoader.component = m.default)).catch(() => (started = false));
}
