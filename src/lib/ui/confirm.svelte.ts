export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}
interface Request extends ConfirmOptions { resolve: (ok: boolean) => void }

class ConfirmStore {
  req = $state.raw<Request | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    this.req?.resolve(false); // never leave an earlier question hanging
    return new Promise((resolve) => (this.req = { ...options, resolve }));
  }

  answer(ok: boolean) {
    this.req?.resolve(ok);
    this.req = null;
  }
}

export const confirmStore = new ConfirmStore();
/** Asks the user; resolves true on confirm, false on cancel / Esc / outside click. */
export const confirmDialog = (options: ConfirmOptions) => confirmStore.ask(options);
