import { useState } from "react";
import { useMembers } from "../shared/members";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, api, newAction } from "../shared/api/client";
import { errorText } from "../shared/api/errors";
import { useQuery } from "@tanstack/react-query";
import { WALLPAPERS, useFamily } from "../shared/family";
import { showToast } from "../shared/ui/toast";
import { CITIES } from "./cities";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [oldCode, setOldCode] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const queryClient = useQueryClient();
  const { name: current, wallpaper } = useFamily();
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [nameMessage, setNameMessage] = useState<string | null>(null);

  const members = useMembers();
  const weather = useQuery({ queryKey: ["weather-config"], queryFn: () => api.get<{ configured: boolean; place?: string }>("/api/weather") });
  const links = useQuery({ queryKey: ["share-links"], queryFn: () => api.get<{ id: number; label: string; days: number; expires_at: string; active: boolean }[]>("/api/share/links") });
  const [feedMember, setFeedMember] = useState("");
  const [shareDraft, setShareDraft] = useState({ label: "", days: 7, valid: 14 });
  const [newLink, setNewLink] = useState<string | null>(null);
  const feedUrl = `${window.location.origin}/api/weekplan/calendar.ics${feedMember ? `?member=${feedMember}` : ""}`;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(t("settings.copied"));
    } catch {
      showToast(t("settings.copyFailed"));
    }
  }

  async function setPlace(name: string) {
    const city = CITIES.find((c) => c.name === name);
    try {
      if (!city) await api.withCode("DELETE", "/api/weather/location", undefined, newAction());
      else await api.withCode("PUT", "/api/weather/location", { place: city.name, lat: city.lat, lon: city.lon }, newAction());
      await queryClient.invalidateQueries({ queryKey: ["weather-config"] });
      await queryClient.invalidateQueries({ queryKey: ["display-weather"] });
    } catch (err) {
      setNameMessage(errorText(err, t));
    }
  }

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api.withCode<{ path: string }>("POST", "/api/share/links", { label: shareDraft.label.trim(), days: shareDraft.days, valid_days: shareDraft.valid }, newAction(), true);
      setNewLink(`${window.location.origin}${r.path}`);
      setShareDraft({ ...shareDraft, label: "" });
      await queryClient.invalidateQueries({ queryKey: ["share-links"] });
    } catch (err) {
      setNameMessage(errorText(err, t));
    }
  }

  async function removeLink(id: number) {
    try {
      await api.withCode("DELETE", `/api/share/links/${id}`, undefined, newAction());
      await queryClient.invalidateQueries({ queryKey: ["share-links"] });
    } catch (err) {
      setNameMessage(errorText(err, t));
    }
  }

  async function logout() {
    await api.post("/api/session/logout");
    await queryClient.invalidateQueries({ queryKey: ["session"] });
  }

  async function saveWallpaper(value: string) {
    try {
      await api.withCode("PUT", "/api/family", { wallpaper: value }, newAction());
      await queryClient.invalidateQueries({ queryKey: ["family"] });
    } catch (err) {
      setNameMessage(errorText(err, t));
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.withCode("PUT", "/api/family", { name: (familyName ?? current).trim() === "Nexmio Family" ? "" : (familyName ?? current) }, newAction());
      await queryClient.invalidateQueries({ queryKey: ["family"] });
      setFamilyName(null);
      setNameMessage(null);
    } catch (err) {
      setNameMessage(errorText(err, t));
    }
  }

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (next !== repeat) return setMessage({ ok: false, text: t("settings.mismatch") });
    try {
      await fetch("/api/code/change", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Family-Code": oldCode },
        body: JSON.stringify({ new: next }),
      }).then(async (res) => {
        if (res.ok) return;
        const data = await res.json().catch(() => ({}));
        throw new ApiError(res.status, data.error ?? "http_error");
      });
      setOldCode("");
      setNext("");
      setRepeat("");
      setMessage({ ok: true, text: t("settings.changed") });
    } catch (err) {
      const code = err instanceof ApiError ? err.error : "http_error";
      setMessage({ ok: false, text: t(`errors.${code}`, { defaultValue: t("common.error") }) });
    }
  }

  return (
    <div className="page narrow">
      <h1>{t("settings.title")}</h1>
      <section className="card">
        <h2>{t("settings.familyName")}</h2>
        <form onSubmit={saveName} className="row">
          <div>
            <label className="visually-hidden" htmlFor="fam">{t("settings.familyName")}</label>
            <input id="fam" className="field" maxLength={40} value={familyName ?? current} onChange={(e) => setFamilyName(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={familyName === null}>{t("common.save")}</button>
        </form>
        {nameMessage && <p className="error" role="alert">{nameMessage}</p>}
        <p className="hint">{t("settings.familyNameHint")}</p>
      </section>
      <section className="card">
        <h2>{t("settings.wallpaper")}</h2>
        <div className="seg" role="group" aria-label={t("settings.wallpaper")}>
          {WALLPAPERS.map((w) => (
            <button key={w} type="button" className={wallpaper === w ? "on" : ""} aria-pressed={wallpaper === w} onClick={() => void saveWallpaper(w)}>
              {t(`settings.wall.${w}`)}
            </button>
          ))}
        </div>
        <p className="hint">{t("settings.wallpaperHint")}</p>
      </section>
      <section className="card">
        <h2>{t("settings.language")}</h2>
        <div className="seg" role="group" aria-label={t("settings.language")}>
          {(["da", "en"] as const).map((lng) => (
            <button
              key={lng}
              type="button"
              className={i18n.language === lng ? "on" : ""}
              aria-pressed={i18n.language === lng}
              onClick={() => void i18n.changeLanguage(lng)}
            >
              {lng === "da" ? "Dansk" : "English"}
            </button>
          ))}
        </div>
        <p className="hint">{t("settings.languageHint")}</p>
      </section>
      <section className="card">
        <h2>{t("settings.changeCode")}</h2>
        <form onSubmit={change} className="stack">
          <label className="field-label" htmlFor="old">{t("settings.oldCode")}</label>
          <input id="old" className="field" type="password" autoComplete="off" value={oldCode} onChange={(e) => setOldCode(e.target.value)} />
          <label className="field-label" htmlFor="new">{t("settings.newCode")}</label>
          <input id="new" className="field" type="password" autoComplete="off" value={next} onChange={(e) => setNext(e.target.value)} />
          <label className="field-label" htmlFor="rep">{t("settings.repeatCode")}</label>
          <input id="rep" className="field" type="password" autoComplete="off" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
          {message && <p className={message.ok ? "ok" : "error"} role="status">{message.text}</p>}
          <button className="btn btn-primary" type="submit" disabled={!oldCode || !next}>{t("common.save")}</button>
        </form>
        <details><summary className="hint" style={{ cursor: "pointer" }}>{t("settings.forgot")}</summary><p className="hint"><code>podman exec -it nexmio-family python -m app.cli set-code</code></p></details>
      </section>
      <section className="card">
        <h2>{t("settings.weatherTitle")}</h2>
        <label className="visually-hidden" htmlFor="weather-place">{t("settings.weatherTitle")}</label>
        <select id="weather-place" className="field" value={weather.data?.place ?? ""} onChange={(e) => void setPlace(e.target.value)}>
          <option value="">{t("settings.noWeather")}</option>
          {CITIES.map((c) => (<option key={c.name} value={c.name}>{c.name}</option>))}
        </select>
        <p className="hint">{t("settings.weatherHint")}</p>
      </section>
      <section className="card">
        <h2>{t("settings.feedTitle")}</h2>
        <p className="muted">{t("settings.feedIntro")}</p>
        <label className="field-label" htmlFor="feed-member">{t("settings.feedWho")}</label>
        <select id="feed-member" className="field" value={feedMember} onChange={(e) => setFeedMember(e.target.value)}>
          <option value="">{t("common.all")}</option>
          {members.list.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
        </select>
        <input className="field" style={{ marginTop: 10 }} readOnly value={feedUrl} aria-label={t("settings.feedTitle")} onFocus={(e) => e.target.select()} />
        <div className="toolbar" style={{ marginTop: 10 }}>
          <button className="btn btn-primary" type="button" onClick={() => void copy(feedUrl)}>{t("settings.copy")}</button>
          <a className="btn" href={feedUrl.replace(/^https?:/, "webcal:")}>{t("settings.feedOpen")}</a>
        </div>
        <p className="hint">{t("settings.feedHint")}</p>
      </section>
      <section className="card">
        <h2>{t("settings.shareTitle")}</h2>
        <p className="muted">{t("settings.shareIntro")}</p>
        <form className="todo-add" onSubmit={createLink}>
          <label className="visually-hidden" htmlFor="share-label">{t("settings.shareLabel")}</label>
          <input id="share-label" className="field" placeholder={t("settings.shareLabel")} value={shareDraft.label} maxLength={40} onChange={(e) => setShareDraft({ ...shareDraft, label: e.target.value })} />
          <label className="visually-hidden" htmlFor="share-days">{t("settings.shareDays")}</label>
          <select id="share-days" className="field" style={{ width: 150 }} value={shareDraft.days} onChange={(e) => setShareDraft({ ...shareDraft, days: Number(e.target.value) })}>
            {[3, 7, 14].map((n) => (<option key={n} value={n}>{t("settings.shareDaysN", { n })}</option>))}
          </select>
          <label className="visually-hidden" htmlFor="share-valid">{t("settings.shareValid")}</label>
          <select id="share-valid" className="field" style={{ width: 170 }} value={shareDraft.valid} onChange={(e) => setShareDraft({ ...shareDraft, valid: Number(e.target.value) })}>
            {[1, 7, 14, 30, 90].map((n) => (<option key={n} value={n}>{t("settings.shareValidN", { n })}</option>))}
          </select>
          <button className="btn btn-primary" type="submit" disabled={!shareDraft.label.trim()}>{t("settings.shareMake")}</button>
        </form>
        {newLink && (
          <div className="notice" style={{ marginTop: 12 }}>
            <p style={{ margin: 0 }}>{t("settings.shareNew")}</p>
            <input className="field" readOnly value={newLink} aria-label={t("settings.shareNew")} onFocus={(e) => e.target.select()} />
            <button className="btn" type="button" style={{ marginTop: 8 }} onClick={() => void copy(newLink)}>{t("settings.copy")}</button>
          </div>
        )}
        {(links.data ?? []).map((l) => (
          <div key={l.id} className="todo-item">
            <span style={{ flex: 1 }}><strong>{l.label}</strong> <span className="muted">· {t("settings.shareDaysN", { n: l.days })} · {l.active ? t("settings.shareActive", { date: l.expires_at.slice(0, 10) }) : t("settings.shareExpired")}</span></span>
            <button className="icon-btn" aria-label={t("common.delete")} onClick={() => void removeLink(l.id)}>✕</button>
          </div>
        ))}
      </section>
      <section className="card">
        <h2>{t("settings.backupTitle")}</h2>
        <p className="muted">{t("settings.backupIntro")}</p>
        <a className="btn btn-primary" href="/api/backup" download>{t("settings.backupGet")}</a>
        <p className="hint">{t("settings.backupHint")}</p>
      </section>
      <section className="card">
        <h2>{t("settings.install")}</h2>
        <p className="muted">{t("settings.installText")}</p>
      </section>
      <section className="card">
        <h2>{t("settings.logout")}</h2>
        <button className="btn" type="button" onClick={() => void logout()}>{t("settings.logout")}</button>
        <p className="hint">{t("settings.logoutHint")}</p>
      </section>
      <p className="hint">{t("settings.about")}</p>
    </div>
  );
}
