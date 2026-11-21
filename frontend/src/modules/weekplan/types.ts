import type { GridEvent } from "../../shared/ui/WeekGrid";

export type EventData = GridEvent & { created_at: string; updated_at: string; series_id: string | null; also_ids: number[] };

export const CATEGORIES = ["homework", "plan", "appointment", "other"] as const;
