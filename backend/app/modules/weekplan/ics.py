"""A minimal iCalendar (.ics) writer. Times are local to Europe/Copenhagen (A8)."""

from datetime import UTC, date, datetime, timedelta

CRLF = "\r\n"
TZ = "Europe/Copenhagen"
VTIMEZONE = [
    "BEGIN:VTIMEZONE", f"TZID:{TZ}",
    "BEGIN:STANDARD", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "END:STANDARD",
    "BEGIN:DAYLIGHT", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "END:DAYLIGHT",
    "END:VTIMEZONE",
]


def escape(text: str) -> str:
    text = text.replace("\\", "\\\\").replace(";", r"\;").replace(",", r"\,")
    return text.replace("\r\n", r"\n").replace("\n", r"\n")


def fold(line: str) -> str:
    """Lines are at most 75 bytes; the rest continues on the next line after a space."""
    out, current = [], ""
    for ch in line:
        if len((current + ch).encode()) > (75 if not out else 74):
            out.append(current)
            current = ch
        else:
            current += ch
    out.append(current)
    return (CRLF + " ").join(out)


def _local(day: str, time: str) -> str:
    return f"{day.replace('-', '')}T{time.replace(':', '')}00"


def build(events: list[dict], names: dict[int, str]) -> str:
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nexmio Family//EN", "CALSCALE:GREGORIAN",
             "X-WR-CALNAME:Nexmio Family", f"X-WR-TIMEZONE:{TZ}", *VTIMEZONE]
    for e in events:
        people = [names[i] for i in [e["member_id"], *e["also_ids"]] if i in names]
        description = "\n".join(x for x in [", ".join(people), e["notes"] or ""] if x)
        lines += ["BEGIN:VEVENT", f"UID:event-{e['id']}@nexmio-family", f"DTSTAMP:{stamp}", f"SUMMARY:{escape(e['title'])}"]
        if e["start"]:
            lines.append(f"DTSTART;TZID={TZ}:{_local(e['date'], e['start'])}")
            end = e["end"] or (datetime.strptime(e["start"], "%H:%M") + timedelta(hours=1)).strftime("%H:%M")
            lines.append(f"DTEND;TZID={TZ}:{_local(e['date'], end)}")
        else:
            day = date.fromisoformat(e["date"])
            lines += [f"DTSTART;VALUE=DATE:{day:%Y%m%d}", f"DTEND;VALUE=DATE:{day + timedelta(days=1):%Y%m%d}"]
        if description:
            lines.append(f"DESCRIPTION:{escape(description)}")
        lines += [f"CATEGORIES:{e['category']}", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    return CRLF.join(fold(line) for line in lines) + CRLF
