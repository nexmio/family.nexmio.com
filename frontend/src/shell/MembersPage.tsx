import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { newAction, api } from "../shared/api/client";
import { errorText } from "../shared/api/errors";
import { Avatar, MEMBER_COLORS, type Member, type MemberColor, colorClass, useMembers } from "../shared/members";
import { Modal } from "../shared/ui/Modal";

function Editor({ initial, onClose }: { initial: Member | null; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const members = useMembers();
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState<MemberColor>(
    initial?.color ?? MEMBER_COLORS.find((c) => !members.list.some((m) => m.color === c)) ?? "coral",
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setError(null);
    try {
      const body = { name: name.trim(), color };
      if (initial) await api.withCode("PUT", `/api/members/${initial.id}`, body, newAction());
      else await api.withCode("POST", "/api/members", body, newAction());
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      onClose();
    } catch (e) {
      const text = errorText(e, t);
      if (text) setError(text);
    }
  }

  async function remove() {
    try {
      await api.withCode("DELETE", `/api/members/${initial!.id}`, undefined, newAction());
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      onClose();
    } catch (e) {
      setConfirmDelete(false);
      const text = errorText(e, t);
      if (text) setError(text);
    }
  }

  if (confirmDelete && initial) {
    return (
      <Modal title={t("common.delete")} onClose={() => setConfirmDelete(false)}>
        <p>{t("members.confirmDelete", { name: initial.name })}</p>
        <div className="modal-actions">
          <button className="btn" onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</button>
          <button className="btn btn-danger" onClick={() => void remove()}>{t("common.delete")}</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={initial ? t("members.edit") : t("members.add")} onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <label className="field-label" htmlFor="m-name">{t("members.name")}</label>
        <input id="m-name" className="field" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} />
        <span className="field-label">{t("members.color")}</span>
        <div className="swatches" role="group" aria-label={t("members.color")}>
          {MEMBER_COLORS.map((c) => (
            <button key={c} type="button" className={`swatch mc-${c}${color === c ? " on" : ""}`} aria-pressed={color === c} aria-label={c} onClick={() => setColor(c)} />
          ))}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="modal-actions">
          {initial && <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>{t("common.delete")}</button>}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>{t("common.cancel")}</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>{t("common.save")}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function MembersPage() {
  const { t } = useTranslation();
  const members = useMembers();
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  return (
    <div className="page narrow">
      <div className="page-head">
        <h1>{t("members.title")}</h1>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>+ {t("members.add")}</button>
      </div>
      <p className="muted">{t("members.intro")}</p>
      {members.isSuccess && members.list.length === 0 && <p className="card">{t("members.empty")}</p>}
      <div className="member-grid">
        {members.list.map((m) => (
          <button key={m.id} className={`card member-card ${colorClass(m)}`} onClick={() => setEditing(m)}>
            <Avatar member={m} size={56} />
            <strong>{m.name}</strong>
          </button>
        ))}
      </div>
      {editing && <Editor key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
