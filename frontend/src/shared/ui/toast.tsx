import { useEffect, useSyncExternalStore } from "react";

/** A short message at the bottom ("Saved"), optionally with an action ("Undo"). */
export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

let current: Toast | null = null;
let counter = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function showToast(text: string, action?: Toast["action"], ms = 4500) {
  current = { id: ++counter, text, action };
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, action ? Math.max(ms, 7000) : ms);
}

export function hideToast() {
  current = null;
  emit();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function ToastHost() {
  const toast = useSyncExternalStore(subscribe, () => current);
  useEffect(() => () => clearTimeout(timer), []);
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite" key={toast.id}>
      <span>{toast.text}</span>
      {toast.action && (
        <button type="button" onClick={() => { toast.action!.run(); hideToast(); }}>{toast.action.label}</button>
      )}
    </div>
  );
}
