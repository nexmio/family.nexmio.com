from datetime import date as Date
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

Category = Literal["homework", "plan", "appointment", "other"]
CATEGORIES: tuple[str, ...] = ("homework", "plan", "appointment", "other")
TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Time = Annotated[str, Field(pattern=TIME_PATTERN)]


class Repeat(BaseModel):
    """A series: the same event every day, week, second week or month, up to a last day."""

    model_config = ConfigDict(extra="forbid")
    every: Literal["day", "week", "2weeks", "month"]
    until: Date


class EventIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Title
    date: Date
    start: Time | None = None
    end: Time | None = None
    member_id: int | None = None
    also_ids: Annotated[list[int], Field(max_length=6)] = []
    category: Category
    notes: Annotated[str, StringConstraints(max_length=1000)] | None = None
    repeat: Repeat | None = None

    @field_validator("notes", mode="after")
    @classmethod
    def empty_to_none(cls, value):
        return value if value else None

    @model_validator(mode="after")
    def check(self):
        if self.start and self.end and self.end < self.start:
            raise ValueError("end must not be before start")
        if self.member_id is not None and self.member_id in self.also_ids:
            raise ValueError("also_ids must not contain member_id")
        if len(set(self.also_ids)) != len(self.also_ids):
            raise ValueError("also_ids must be unique")
        if self.repeat and self.repeat.until < self.date:
            raise ValueError("repeat.until must not be before date")
        return self


class ImportEvent(BaseModel):
    """One event in an import file. The AI only knows names, so `person` is a name (section 10)."""

    model_config = ConfigDict(extra="forbid")

    title: Title
    date: Date
    start: Time | None = None
    end: Time | None = None
    person: Annotated[str, StringConstraints(strip_whitespace=True, max_length=40)] | None = None
    category: Category
    notes: Annotated[str, StringConstraints(max_length=1000)] | None = None

    @field_validator("person", "notes", mode="after")
    @classmethod
    def empty_to_none(cls, value):
        return value if value else None

    @model_validator(mode="after")
    def end_after_start(self):
        if self.start and self.end and self.end < self.start:
            raise ValueError("end must not be before start")
        return self


class ImportFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1]
    events: Annotated[list[ImportEvent], Field(max_length=500)]


class ExecuteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    file: ImportFile
    skip: list[int] = []
