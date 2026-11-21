import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, api } from "../api/client";

/** Asks for the family code once. The code is sent, never kept: the server gives a login cookie back. */
export function LoginForm({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/session/login", { code: value });
      setValue("");
      onDone();
    } catch (err) {
      const code = err instanceof ApiError ? err.error : "http_error";
      setError(t(`errors.${code}`, { defaultValue: t("common.error") }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 10 }}>
      <label className="field-label" htmlFor="login-code">{t("code.label")}</label>
      <input id="login-code" className="field" type="password" autoComplete="current-password" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions">
        {onCancel && <button type="button" className="btn" onClick={onCancel}>{t("common.cancel")}</button>}
        <button type="submit" className="btn btn-primary" disabled={!value || busy}>{t("code.login")}</button>
      </div>
    </form>
  );
}
