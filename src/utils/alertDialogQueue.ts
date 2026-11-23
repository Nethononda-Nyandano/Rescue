export type DialogButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

export type DialogOptions = {
  cancelable?: boolean;
  onDismiss?: () => void;
};

export type DialogRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
  cancelable: boolean;
  onDismiss?: () => void;
};

export class AlertDialogQueue {
  private dialogs: DialogRequest[] = [];
  private listeners = new Set<() => void>();
  private visibleModalIds: string[] = [];
  private nextId = 0;

  getCurrent = (): DialogRequest | null => this.dialogs[0] ?? null;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getActiveModalId = (): string | null =>
    this.visibleModalIds[this.visibleModalIds.length - 1] ?? null;

  setModalVisible(id: string, visible: boolean): void {
    this.visibleModalIds = this.visibleModalIds.filter((modalId) => modalId !== id);
    if (visible) this.visibleModalIds.push(id);
    this.notify();
  }

  show(
    title: string,
    message?: string,
    buttons?: DialogButton[],
    options?: DialogOptions,
  ): number {
    const id = ++this.nextId;
    this.dialogs = [
      ...this.dialogs,
      {
        id,
        title,
        message,
        buttons: buttons?.length ? buttons : [{ text: "OK" }],
        cancelable: options?.cancelable ?? false,
        onDismiss: options?.onDismiss,
      },
    ];
    this.notify();
    return id;
  }

  pressButton(id: number, buttonIndex: number): void {
    const dialog = this.removeCurrent(id);
    if (!dialog) return;

    dialog.buttons[buttonIndex]?.onPress?.();
    dialog.onDismiss?.();
  }

  dismiss(id: number): void {
    const current = this.getCurrent();
    if (!current?.cancelable) return;
    const dialog = this.removeCurrent(id);
    if (dialog) dialog.onDismiss?.();
  }

  private removeCurrent(id: number): DialogRequest | null {
    const current = this.getCurrent();
    if (!current || current.id !== id) return null;

    this.dialogs = this.dialogs.slice(1);
    this.notify();
    return current;
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const alertDialogQueue = new AlertDialogQueue();