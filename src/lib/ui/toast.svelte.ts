export type ToastKind = 'info' | 'success' | 'error';
export interface ToastItem { id: number; text: string; kind: ToastKind }

class Toasts {
  items = $state<ToastItem[]>([]);
  #n = 0;

  push(text: string, kind: ToastKind = 'info') {
    const id = ++this.#n;
    this.items = [...this.items, { id, text, kind }];
    setTimeout(() => this.dismiss(id), kind === 'error' ? 6000 : 3500);
  }

  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toasts = new Toasts();
export const toast = (text: string, kind?: ToastKind) => toasts.push(text, kind);
