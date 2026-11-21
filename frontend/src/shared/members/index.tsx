import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";

export type MemberColor =
  | "coral" | "orange" | "amber" | "lime" | "teal" | "sky" | "indigo" | "violet" | "pink" | "slate";
export const MEMBER_COLORS: MemberColor[] = [
  "coral", "sky", "lime", "violet", "amber", "teal", "pink", "indigo", "orange", "slate",
];

export interface Member {
  id: number;
  name: string;
  color: MemberColor;
}

/** The family members. Shared by every screen, so colours are the same everywhere. */
export function useMembers() {
  const query = useQuery({ queryKey: ["members"], queryFn: () => api.get<Member[]>("/api/members") });
  const list = query.data ?? [];
  const byId = new Map(list.map((m) => [m.id, m]));
  return { ...query, list, byId };
}

/** CSS class that sets --mc and --mc-bg for a member (or the neutral "whole family" colour). */
export const colorClass = (m?: Member | null): string => (m ? `mc-${m.color}` : "mc-none");

export function Avatar({ member, size = 28 }: { member?: Member | null; size?: number }) {
  const { t } = useTranslation();
  const label = member ? member.name : t("common.wholeFamily");
  return (
    <span
      className={`avatar ${colorClass(member)}`}
      style={{ width: size, height: size, fontSize: size * 0.46 }}
      title={label}
      aria-hidden="true"
    >
      {member ? member.name.trim().charAt(0).toUpperCase() : (
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M4 11l8-7 8 7v9H4z" /></svg>
      )}
    </span>
  );
}

/** Person bubbles: "All" plus one per person, plus the whole-family bucket. `selected` empty = everyone. */
export function MemberFilter({
  members, selected, onChange, includeFamily = true,
}: {
  members: Member[];
  selected: (number | "none")[];
  onChange: (next: (number | "none")[]) => void;
  includeFamily?: boolean;
}) {
  const { t } = useTranslation();
  const toggle = (id: number | "none") =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const dim = (id: number | "none") => selected.length > 0 && !selected.includes(id);
  return (
    <div className="bubbles" role="group" aria-label={t("common.people")}>
      <button type="button" className={`bubble all${selected.length === 0 ? "" : " off"}`} aria-pressed={selected.length === 0} onClick={() => onChange([])}>
        <span className="bubble-body"><span className="avatar mc-none" style={{ width: 52, height: 52, fontSize: 22 }}>★</span></span>
        <span>{t("common.all")}</span>
      </button>
      {members.map((m) => (
        <button key={m.id} type="button" className={`bubble ${colorClass(m)}${dim(m.id) ? " off" : ""}`} aria-pressed={selected.includes(m.id)} onClick={() => toggle(m.id)}>
          <span className="bubble-body"><Avatar member={m} size={52} /></span>
          <span>{m.name}</span>
        </button>
      ))}
      {includeFamily && (
        <button type="button" className={`bubble mc-none${dim("none") ? " off" : ""}`} aria-pressed={selected.includes("none")} onClick={() => toggle("none")}>
          <span className="bubble-body"><Avatar size={52} /></span>
          <span>{t("common.wholeFamily")}</span>
        </button>
      )}
    </div>
  );
}
