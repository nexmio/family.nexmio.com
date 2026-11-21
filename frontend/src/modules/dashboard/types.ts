export type Category = "homework" | "plan" | "appointment" | "other";
export type Size = "small" | "medium" | "large";
export type Device = "phone" | "tablet" | "screen";
export type Orientation = "landscape" | "portrait";

export interface CalendarWidget {
  id: string; type: "week-calendar"; order: number; size: Size;
  settings: { categories: Category[]; weeks: number; members: number[] };
}
export interface AgendaWidget {
  id: string; type: "person-agenda"; order: number; size: Size; settings: { days: number; members: number[] };
}
export interface ClockWidget {
  id: string; type: "clock"; order: number; size: Size; settings: Record<string, never>;
}
export interface MealWidget {
  id: string; type: "meal-boxes"; order: number; size: Size; settings: { days: number };
}
export interface PhotoWidget {
  id: string; type: "photo-slideshow"; order: number; size: Size; settings: { layout: "tile" | "mosaic" };
}
export interface TodoWidget {
  id: string; type: "todo"; order: number; size: Size; settings: Record<string, never>;
}
export interface MealTodayWidget {
  id: string; type: "meal-today"; order: number; size: Size; settings: Record<string, never>;
}
export type SimpleType = "chores" | "stars" | "birthdays" | "countdown" | "message" | "weather";
export interface SimpleWidget {
  id: string; type: SimpleType; order: number; size: Size; settings: Record<string, never>;
}
export type Widget = CalendarWidget | MealWidget | AgendaWidget | ClockWidget | PhotoWidget | TodoWidget | MealTodayWidget | SimpleWidget;

export type StartView = "day" | "week" | "photos";
export type Transition = "fade" | "slide" | "zoom";
export interface SlideshowSettings {
  transition: Transition; interval: number; albums: number[];
  overlay_clock: boolean; overlay_plan: boolean; overlay_meal: boolean;
}
export const DEFAULT_SLIDESHOW: SlideshowSettings = {
  transition: "fade", interval: 30, albums: [], overlay_clock: true, overlay_plan: true, overlay_meal: true,
};

export interface Dashboard {
  slug: string; name: string; device: Device; orientation: Orientation; is_default: boolean; widgets: Widget[];
  start_view: StartView; touch: boolean; return_after: number; idle_photo_after: number; slideshow: SlideshowSettings;
  title: string | null; show_title: boolean; show_clock: boolean; night_start: number | null; night_end: number | null;
}
export interface DashboardSummary {
  slug: string; name: string; device: Device; orientation: Orientation; is_default: boolean; widget_count: number;
}
export interface Preset { id: string; device: Device; orientation: Orientation; widgets: Widget[] }

export const ALL_CATEGORIES: Category[] = ["homework", "plan", "appointment", "other"];
export const SPAN: Record<Size, number> = { small: 4, medium: 6, large: 12 };
