import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../../shared/api/client";
import { errorText } from "../../shared/api/errors";
import { showToast } from "../../shared/ui/toast";
import { type Lang, formatDate, parseISO } from "../../shared/dates";

interface PreviewEvent {
  title: string; date: string; start: string | null; end: string | null; person: string | null; category: string;
}
interface Problem { index: number | null; field: string | null; code: string }
interface Duplicate { index: number; kind: "existing" | "file" }
interface Preview { ok: boolean; errors: Problem[]; events: PreviewEvent[]; duplicates: Duplicate[]; new_people: string[] }

export default function ImportPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === "da" ? "da" : "en") as Lang;
  const [text, setText] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [choices, setChoices] = useState<Record<number, "skip" | "create">>({});
  const [result, setResult] = useState<{ created: number; skipped: number; first_date: string | null; new_members: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [pasted, setPasted] = useState("");

  async function copyTemplate() {
    try {
      const res = await fetch(`/api/weekplan/import/template?lang=${lang}`);
      await navigator.clipboard.writeText(await res.text());
      showToast(t("weekplan.import.copied"));
    } catch {
      setError(t("weekplan.import.copyFailed"));
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    await check(await file.text());
  }

  async function check(content: string) {
    setResult(null);
    setError(null);
    setText(content);
    try {
      const data = await api.postText<Preview>("/api/weekplan/import/preview", content);
      setPreview(data);
      setChoices(Object.fromEntries(data.duplicates.map((d) => [d.index, "skip" as const])));
    } catch {
      setError(t("common.error"));
    }
  }

  const problemText = (p: Problem) => {
    const known = t(`weekplan.import.err.${p.code}`, { defaultValue: "" });
    const problem = known || t("weekplan.import.err.other");
    if (p.index === null) return t("weekplan.import.errorFile", { problem });
    return t("weekplan.import.errorLine", { n: p.index + 1, field: p.field ?? "", problem });
  };

  const skipIndexes = Object.entries(choices).filter(([, v]) => v === "skip").map(([k]) => Number(k));
  const toCreate = preview ? preview.events.length - skipIndexes.length : 0;

  async function run() {
    if (!preview || text === null) return;
    setBusy(true);
    try {
      const res = await api.withCode<{ created: number; skipped: number; first_date: string | null; new_members: number }>(
        "POST", "/api/weekplan/import/execute", { file: JSON.parse(text), skip: skipIndexes },
      );
      setResult(res);
      setPreview(null);
      setText(null);
    } catch (e) {
      const msg = errorText(e, t);
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const setAll = (value: "skip" | "create") =>
    setChoices(Object.fromEntries((preview?.duplicates ?? []).map((d) => [d.index, value])));

  return (
    <div className="page narrow">
      <div className="page-head">
        <h1>{t("weekplan.import.title")}</h1>
        <Link className="btn" to="..">{t("common.back")}</Link>
      </div>
      <p className="muted">{t("weekplan.import.intro")}</p>

      <section className="card">
        <h2>{t("weekplan.import.step1")}</h2>
        <div className="toolbar">
          <button className="btn btn-primary" type="button" onClick={() => void copyTemplate()}>{t("weekplan.import.copyTemplate")}</button>
          <a className="btn" href={`/api/weekplan/import/template?lang=${lang}`} download>{t("weekplan.downloadTemplate")}</a>
        </div>
      </section>

      <section className="card">
        <h2>{t("weekplan.import.step2")}</h2>
        <label className="field-label" htmlFor="import-paste">{t("weekplan.import.paste")}</label>
        <textarea id="import-paste" className="field" rows={5} value={pasted} placeholder={'{"schema_version": 1, "events": [ … ]}'} onChange={(e) => setPasted(e.target.value)} />
        <div className="toolbar" style={{ marginTop: 10 }}>
          <button type="button" className="btn btn-primary" disabled={!pasted.trim()} onClick={() => void check(pasted)}>{t("weekplan.import.checkPasted")}</button>
          <label className="btn" htmlFor="import-file">{t("weekplan.import.choose")}</label>
        </div>
        <input
          id="import-file"
          className="visually-hidden"
          type="file"
          accept=".json,application/json"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </section>

      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <section className="card ok-card" role="status">
          <p>{t("weekplan.import.result", { created: result.created, skipped: result.skipped })}</p>
          {result.new_members > 0 && <p className="muted">{t("weekplan.import.newMembersResult", { n: result.new_members })}</p>}
          {result.first_date && (
            <Link className="btn btn-primary" to={`/admin/weekplan?date=${result.first_date}`}>
              {t("weekplan.import.openWeek")}
            </Link>
          )}
        </section>
      )}

      {preview && !preview.ok && (
        <section className="card" aria-live="polite">
          <ul className="problems">
            {preview.errors.map((p, i) => (<li key={i} className="error">{problemText(p)}</li>))}
          </ul>
        </section>
      )}

      {preview?.ok && (
        <>
          <section className="card">
            <h2>{t("weekplan.import.step3")}</h2>
            {preview.new_people.length > 0 && (
              <p className="notice">{t("weekplan.import.newPeople", { names: preview.new_people.join(", ") })}</p>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("weekplan.import.colDate")}</th><th>{t("weekplan.import.colTitle")}</th>
                    <th>{t("weekplan.import.colTime")}</th><th>{t("weekplan.import.colPerson")}</th>
                    <th>{t("weekplan.import.colCategory")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.events.map((e, i) => (
                    <tr key={i}>
                      <td>{formatDate(parseISO(e.date), lang)}</td><td>{e.title}</td>
                      <td>{e.start ? `${e.start}${e.end ? `–${e.end}` : ""}` : t("common.allDay")}</td>
                      <td>{e.person ?? ""}</td><td>{t(`weekplan.category.${e.category}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {preview.duplicates.length > 0 && (
            <section className="card">
              <h2>{t("weekplan.import.duplicates")}</h2>
              <p className="muted">{t("weekplan.import.duplicatesIntro")}</p>
              <div className="toolbar">
                <button className="btn" onClick={() => setAll("skip")}>{t("weekplan.import.allSkip")}</button>
                <button className="btn" onClick={() => setAll("create")}>{t("weekplan.import.allCreate")}</button>
              </div>
              {preview.duplicates.map((d) => (
                <div key={d.index} className="dup-row">
                  <span>
                    <strong>{preview.events[d.index].title}</strong>{" "}
                    <span className="muted">
                      {formatDate(parseISO(preview.events[d.index].date), lang)} ·{" "}
                      {d.kind === "existing" ? t("weekplan.import.kindExisting") : t("weekplan.import.kindFile")}
                    </span>
                  </span>
                  <span className="seg" role="group">
                    {(["skip", "create"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={choices[d.index] === v ? "on" : ""}
                        aria-pressed={choices[d.index] === v}
                        onClick={() => setChoices({ ...choices, [d.index]: v })}
                      >
                        {v === "skip" ? t("weekplan.import.skip") : t("weekplan.import.createAnyway")}
                      </button>
                    ))}
                  </span>
                </div>
              ))}
            </section>
          )}

          <button className="btn btn-primary" disabled={busy || toCreate === 0} onClick={() => void run()}>
            {t("weekplan.import.doImport", { n: toCreate })}
          </button>
        </>
      )}
    </div>
  );
}
