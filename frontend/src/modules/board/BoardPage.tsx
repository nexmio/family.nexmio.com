import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, newAction } from "../../shared/api/client";
import { errorText } from "../../shared/api/errors";

interface Message { id: number; text: string; expires_at: string | null }

export default function BoardPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const messages = useQuery({ queryKey: ["board"], queryFn: () => api.get<Message[]>("/api/board/messages") });
  const [text, setText] = useState("");
  const [days, setDays] = useState<number | null>(1);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try { await fn(); await queryClient.invalidateQueries({ queryKey: ["board"] }); await queryClient.invalidateQueries({ queryKey: ["display-board"] }); }
    catch (e) { const x = errorText(e, t); if (x) setError(x); }
  }
  const post = () => run(async () => { await api.withCode("POST", "/api/board/messages", { text: text.trim(), days }, newAction()); setText(""); });

  return (
    <div className="page narrow">
      <h1>{t("board.title")}</h1>
      <p className="muted">{t("board.intro")}</p>
      <section className="card">
        <form className="stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); if (text.trim()) void post(); }}>
          <label className="field-label" htmlFor="board-text">{t("board.message")}</label>
          <input id="board-text" className="field" style={{ fontSize: 18 }} value={text} maxLength={200} placeholder={t("board.example")} onChange={(e) => setText(e.target.value)} />
          <span className="field-label">{t("board.showFor")}</span>
          <div className="seg" role="group">
            {([[1, t("board.day")], [7, t("board.week")], [null, t("board.untilRemoved")]] as [number | null, string][]).map(([d, label]) => (
              <button key={String(d)} type="button" className={days === d ? "on" : ""} aria-pressed={days === d} onClick={() => setDays(d)}>{label}</button>
            ))}
          </div>
          <div><button className="btn btn-primary" type="submit" disabled={!text.trim()}>{t("board.post")}</button></div>
        </form>
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      {(messages.data ?? []).map((m) => (
        <section key={m.id} className="card board-note">
          <span style={{ flex: 1 }}>{m.text}</span>
          <button className="icon-btn" aria-label={t("common.delete")} onClick={() => void run(() => api.withCode("DELETE", `/api/board/messages/${m.id}`, undefined, newAction()))}>✕</button>
        </section>
      ))}
      {messages.isSuccess && messages.data.length === 0 && <p className="muted">{t("board.empty")}</p>}
    </div>
  );
}
