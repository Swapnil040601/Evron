export type DialogVariant = 'info' | 'error' | 'success' | 'warning';

export type DialogRequest = {
  type: 'alert' | 'confirm';
  message: string;
  variant?: DialogVariant;
  resolve: (value: boolean) => void;
};

type QueueSetter = ((updater: (q: DialogRequest[]) => DialogRequest[]) => void) | null;
let _setter: QueueSetter = null;

export function _registerDialogSetter(setter: QueueSetter) {
  _setter = setter;
}

function push(req: Omit<DialogRequest, 'resolve'>): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (!_setter) {
      if (req.type === 'confirm') { resolve(window.confirm(req.message)); }
      else { window.alert(req.message); resolve(true); }
      return;
    }
    _setter(q => [...q, { ...req, resolve }]);
  });
}

export function showAlert(message: string, variant: DialogVariant = 'info'): Promise<void> {
  return push({ type: 'alert', message, variant }).then(() => undefined);
}

export function showConfirm(message: string): Promise<boolean> {
  return push({ type: 'confirm', message, variant: 'warning' });
}
