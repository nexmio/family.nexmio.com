/** The login dialog state. Opens when a change needs a login that has run out. */
type Pending = { id: number; resolve: (loggedIn: boolean) => void };

let pending: Pending | null = null;
let counter = 0;
const listeners = new Set<() => void>();

export const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getPending = () => pending;

function emit() {
  listeners.forEach((fn) => fn());
}

export function requestLogin(): Promise<boolean> {
  return new Promise((resolve) => {
    pending = { id: ++counter, resolve };
    emit();
  });
}

export function answerLogin(loggedIn: boolean) {
  const current = pending;
  pending = null;
  emit();
  current?.resolve(loggedIn);
}
