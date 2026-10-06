// Page-level safety nets: one editing tab at a time, and errors that are never swallowed silently.
import { toast } from '$lib/ui/toast.svelte';

/** Holds a lock for as long as this tab lives. A second tab does not get it and is warned (both would overwrite the same autosave). */
export function watchOtherTabs() {
  const locks = navigator.locks;
  if (!locks) return;
  void locks.request('certflow-workspace', { ifAvailable: true }, (lock) => {
    if (!lock) {
      toast('CertFlow is already open in another tab. Work in only one tab, or the last one to save wins.', 'error');
      return;
    }
    return new Promise<never>(() => {}); // keep the lock until the tab closes
  });
}

/** Shows unexpected errors as a message (once per few seconds) instead of leaving a dead page. */
export function reportUnexpectedErrors() {
  let last = 0;
  const show = (e: unknown) => {
    console.error(e);
    const now = Date.now();
    if (now - last < 5000) return;
    last = now;
    toast('Something went wrong. Your work is saved in this browser. If it keeps happening, reload the page.', 'error');
  };
  window.addEventListener('error', (e) => {
    if (/ResizeObserver loop/i.test(e.message)) return; // harmless browser notice
    show(e.error ?? e.message);
  });
  window.addEventListener('unhandledrejection', (e) => show(e.reason));
}
