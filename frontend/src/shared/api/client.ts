import { requestLogin } from "../access-code/store";
import { showToast } from "../ui/toast";
import i18n from "i18next";

export class ApiError extends Error {
  constructor(
    public status: number,
    public error: string,
    public details?: unknown,
    public retryAfter?: number,
  ) {
    super(error);
  }
}

async function parse(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function send<T>(method: string, path: string, body?: unknown, code?: string): Promise<T> {
  // the browser sends the login cookie by itself, so a change also carries our own header
  const headers: Record<string, string> = { "X-Requested-With": "nexmio" };
  const raw = body instanceof Uint8Array;
  if (body !== undefined) headers["Content-Type"] = raw ? "application/octet-stream" : "application/json";
  if (code) headers["X-Family-Code"] = code;
  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : raw ? (body as BodyInit) : JSON.stringify(body),
  });
  const data = await parse(res);
  if (!res.ok) {
    const payload = (data ?? {}) as { error?: string; details?: unknown };
    const retry = res.headers.get("Retry-After");
    throw new ApiError(res.status, payload.error ?? "http_error", payload.details, retry ? Number(retry) : undefined);
  }
  return data as T;
}

/** Kept so that every change can still say "this is one action". The login covers the whole session now. */
export interface Action {
  code?: string;
}
export const newAction = (): Action => ({});

export const api = {
  get: <T>(path: string) => send<T>("GET", path),
  post: <T>(path: string, body?: unknown) => send<T>("POST", path, body),
  postText: async <T>(path: string, text: string): Promise<T> => {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "nexmio" }, body: text });
    return (await parse(res)) as T;
  },
  /** A change. The admin login covers it. If the login has run out, the login dialog opens and the change is retried. */
  withCode: async <T>(method: string, path: string, body?: unknown, _action?: Action, silent = false): Promise<T> => {
    void _action;
    for (;;) {
      try {
        const result = await send<T>(method, path, body);
        if (!silent) showToast(i18n.t(method === "DELETE" ? "common.deleted" : "common.saved"));
        return result;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          if (await requestLogin()) continue;
          throw new ApiError(0, "cancelled");
        }
        throw e;
      }
    }
  },
};
