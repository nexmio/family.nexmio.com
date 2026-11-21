import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toISO } from "../../../shared/dates";
import { Avatar, useMembers } from "../../../shared/members";
import { dashboardGet, dashboardPost } from "../dashboardApi";

interface Item { id: number; title: string; done: boolean; member_id: number | null; due?: string | null }

/** The to-do list. On a screen with touch the boxes can be ticked (no code needed). */
export function TodoWidget({ tickable }: { tickable: boolean }) {
  const { t } = useTranslation();
  const members = useMembers();
  const queryClient = useQueryClient();
  const items = useQuery({
    queryKey: ["display-todos"],
    queryFn: () => dashboardGet<Item[]>("/api/todo/items"),
    refetchInterval: 60_000,
  });
  const data = (items.data ?? []).slice(0, 10);

  async function tick(i: Item) {
    queryClient.setQueryData<Item[]>(["display-todos"], (old) => old?.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)));
    try {
      await dashboardPost(`/api/todo/items/${i.id}/tick`, { done: !i.done });
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["display-todos"] });
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    }
  }

  return (
    <div>
      {items.isSuccess && data.length === 0 && <p className="muted">{t("dashboard.display.noTodos")}</p>}
      {data.map((i) => (
        <div key={i.id} className={`todo-item${i.done ? " done" : ""}`}>
          {tickable ? (
            <button className={`box${i.done ? " on" : ""}`} role="checkbox" aria-checked={i.done} aria-label={i.title} onClick={() => void tick(i)}>
              {i.done ? "✓" : ""}
            </button>
          ) : (
            <span className={`box static${i.done ? " on" : ""}`} aria-hidden="true">{i.done ? "✓" : ""}</span>
          )}
          <span className="t" style={{ flex: 1 }}>{i.title}{i.due && !i.done && i.due <= toISO(new Date()) ? <span className="due late"> !</span> : null}</span>
          {i.member_id && <Avatar member={members.byId.get(i.member_id)} size={24} />}
        </div>
      ))}
    </div>
  );
}
