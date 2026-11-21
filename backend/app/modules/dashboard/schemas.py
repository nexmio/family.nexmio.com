import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Category = Literal["homework", "plan", "appointment", "other"]
Size = Literal["small", "medium", "large"]
Device = Literal["phone", "tablet", "screen"]
Orientation = Literal["landscape", "portrait"]

SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,29}$")
RESERVED_SLUGS = {"admin", "api", "assets", "static", "default", "favicon", "_test"}


class CalendarSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    categories: Annotated[list[Category], Field(min_length=1, max_length=4)]
    weeks: Annotated[int, Field(ge=1, le=4)]
    members: Annotated[list[int], Field(max_length=20)] = []

    @model_validator(mode="after")
    def unique(self):
        if len(set(self.categories)) != len(self.categories):
            raise ValueError("categories must be unique")
        return self


class MealSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    days: Annotated[int, Field(ge=1, le=14)]


class CalendarWidget(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Annotated[str, StringConstraints(min_length=1, max_length=20)]
    type: Literal["week-calendar"]
    order: int
    size: Size
    settings: CalendarSettings


class MealWidget(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Annotated[str, StringConstraints(min_length=1, max_length=20)]
    type: Literal["meal-boxes"]
    order: int
    size: Size
    settings: MealSettings


class AgendaSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    days: Annotated[int, Field(ge=1, le=7)]
    members: Annotated[list[int], Field(max_length=20)] = []


class AgendaWidget(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Annotated[str, StringConstraints(min_length=1, max_length=20)]
    type: Literal["person-agenda"]
    order: int
    size: Size
    settings: AgendaSettings


class ClockSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ClockWidget(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Annotated[str, StringConstraints(min_length=1, max_length=20)]
    type: Literal["clock"]
    order: int
    size: Size
    settings: ClockSettings


class SlideshowWidgetSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    layout: Literal["tile", "mosaic"] = "tile"


class SlideshowWidget(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Annotated[str, StringConstraints(min_length=1, max_length=20)]
    type: Literal["photo-slideshow"]
    order: int
    size: Size
    settings: SlideshowWidgetSettings


class EmptySettings(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TodoWidget(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Annotated[str, StringConstraints(min_length=1, max_length=20)]
    type: Literal["todo"]
    order: int
    size: Size
    settings: EmptySettings


class MealTodayWidget(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Annotated[str, StringConstraints(min_length=1, max_length=20)]
    type: Literal["meal-today"]
    order: int
    size: Size
    settings: EmptySettings


def _simple(kind: str):
    """A widget without settings of its own: chores, stars, birthdays, countdown, message, weather."""

    class Simple(BaseModel):
        model_config = ConfigDict(extra="forbid")
        id: Annotated[str, StringConstraints(min_length=1, max_length=20)]
        type: Literal[kind]  # type: ignore[valid-type]
        order: int
        size: Size
        settings: EmptySettings

    Simple.__name__ = f"{kind.title()}Widget"
    return Simple


ChoresWidget = _simple("chores")
StarsWidget = _simple("stars")
BirthdaysWidget = _simple("birthdays")
CountdownWidget = _simple("countdown")
MessageWidget = _simple("message")
WeatherWidget = _simple("weather")

Widget = Annotated[
    CalendarWidget | MealWidget | AgendaWidget | ClockWidget | SlideshowWidget | TodoWidget | MealTodayWidget
    | ChoresWidget | StarsWidget | BirthdaysWidget | CountdownWidget | MessageWidget | WeatherWidget,
    Field(discriminator="type"),
]


class Slideshow(BaseModel):
    """How the photo series looks on this screen."""

    model_config = ConfigDict(extra="forbid")
    transition: Literal["fade", "slide", "zoom"] = "fade"
    interval: Annotated[int, Field(ge=5, le=600)] = 30
    albums: Annotated[list[int], Field(max_length=50)] = []
    overlay_clock: bool = True
    overlay_plan: bool = True
    overlay_meal: bool = True


class DashboardBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
    device: Device
    orientation: Orientation
    title: Annotated[str, StringConstraints(strip_whitespace=True, max_length=40)] | None = None
    show_title: bool = True
    show_clock: bool = True
    night_start: Annotated[int, Field(ge=0, le=23)] | None = None
    night_end: Annotated[int, Field(ge=0, le=23)] | None = None
    start_view: Literal["day", "week", "photos"] = "day"
    touch: bool = False
    return_after: Annotated[int, Field(ge=10, le=3600)] = 60
    idle_photo_after: Annotated[int, Field(ge=0, le=240)] = 0
    slideshow: Slideshow = Slideshow()
    widgets: Annotated[list[Widget], Field(max_length=14)]

    @model_validator(mode="after")
    def night_pair(self):
        if (self.night_start is None) != (self.night_end is None):
            raise ValueError("night_start and night_end go together")
        return self

    @model_validator(mode="after")
    def unique_ids(self):
        ids = [w.id for w in self.widgets]
        if len(set(ids)) != len(ids):
            raise ValueError("widget ids must be unique")
        return self


class DashboardCreate(DashboardBody):
    slug: str

    @model_validator(mode="after")
    def valid_slug(self):
        if not SLUG_PATTERN.match(self.slug) or self.slug in RESERVED_SLUGS:
            raise ValueError("invalid slug")
        return self


ALL = ["homework", "plan", "appointment", "other"]
PRESETS = [
    {
        "id": "family-hub",
        "device": "screen",
        "orientation": "landscape",
        "widgets": [
            {"id": "w1", "type": "person-agenda", "order": 1, "size": "medium", "settings": {"days": 1, "members": []}},
            {"id": "w2", "type": "photo-slideshow", "order": 2, "size": "medium", "settings": {"layout": "tile"}},
            {"id": "w3", "type": "meal-today", "order": 3, "size": "small", "settings": {}},
            {"id": "w4", "type": "todo", "order": 4, "size": "small", "settings": {}},
            {"id": "w5", "type": "clock", "order": 5, "size": "small", "settings": {}},
        ],
    },
    {
        "id": "kids-board",
        "device": "screen",
        "orientation": "landscape",
        "widgets": [
            {"id": "w1", "type": "chores", "order": 1, "size": "medium", "settings": {}},
            {"id": "w2", "type": "stars", "order": 2, "size": "medium", "settings": {}},
            {"id": "w3", "type": "message", "order": 3, "size": "small", "settings": {}},
            {"id": "w4", "type": "countdown", "order": 4, "size": "small", "settings": {}},
            {"id": "w5", "type": "weather", "order": 5, "size": "small", "settings": {}},
        ],
    },
    {
        "id": "large-calendar",
        "device": "screen",
        "orientation": "landscape",
        "widgets": [
            {"id": "w1", "type": "week-calendar", "order": 1, "size": "large",
             "settings": {"categories": ALL, "weeks": 2, "members": []}},
            {"id": "w2", "type": "meal-boxes", "order": 2, "size": "large", "settings": {"days": 7}},
        ],
    },
    {
        "id": "homework-and-meals",
        "device": "screen",
        "orientation": "landscape",
        "widgets": [
            {"id": "w1", "type": "week-calendar", "order": 1, "size": "medium",
             "settings": {"categories": ["homework", "plan"], "weeks": 1, "members": []}},
            {"id": "w2", "type": "meal-boxes", "order": 2, "size": "medium", "settings": {"days": 7}},
        ],
    },
    {
        "id": "phone-today",
        "device": "phone",
        "orientation": "portrait",
        "widgets": [
            {"id": "w1", "type": "person-agenda", "order": 1, "size": "large",
             "settings": {"days": 1, "members": []}},
            {"id": "w2", "type": "meal-boxes", "order": 2, "size": "large", "settings": {"days": 3}},
        ],
    },
]
