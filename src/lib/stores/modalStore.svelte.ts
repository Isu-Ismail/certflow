export interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'alert' | 'success' | 'danger';
  confirmText: string;
  cancelText: string;
  resolve?: (value: boolean) => void;
}

class ModalStore {
  state = $state<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    confirmText: 'OK',
    cancelText: ''
  });

  showAlert(message: string, title: string = 'Notice', type: 'alert' | 'success' = 'alert'): Promise<boolean> {
    return new Promise((resolve) => {
      this.state = {
        isOpen: true,
        title,
        message,
        type,
        confirmText: 'OK',
        cancelText: '',
        resolve
      };
    });
  }

  showConfirm(message: string, title: string = 'Confirm Action', type: 'confirm' | 'danger' = 'confirm'): Promise<boolean> {
    return new Promise((resolve) => {
      this.state = {
        isOpen: true,
        title,
        message,
        type,
        confirmText: type === 'danger' ? 'Yes, Proceed' : 'Confirm',
        cancelText: 'Cancel',
        resolve
      };
    });
  }

  confirm() {
    if (this.state.resolve) this.state.resolve(true);
    this.state.isOpen = false;
  }

  cancel() {
    if (this.state.resolve) this.state.resolve(false);
    this.state.isOpen = false;
  }
}

export const modalStore = new ModalStore();
