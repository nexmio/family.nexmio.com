# Import template for the Nexmio Family week plan

## Your task

Make an import file for a family calendar from the material below. The material can be a school week plan, a letter, a list of homework or an invitation.

## Rules

1. Write every date as `YYYY-MM-DD`.
2. If the material does not state the year, **ask the user for the year before you answer**.
3. A value you do not know is `null`. Never guess a value.
4. `category` must be exactly one of: `homework` (homework), `plan` (a school or club plan), `appointment` (a fixed time or appointment), `other` (anything else).
5. Never invent events. Only write what the material says.
6. One event for each homework item or activity.
7. Times are written as `HH:MM` (24 hours), for example `08:00`.
8. Keep titles and notes in the language of the material. Do not translate them.
9. The file may hold at most 500 events.

## The format

The file is JSON. `schema_version` is always `1`. No other fields are allowed.

| Field | Meaning | Required |
|---|---|---|
| `title` | Short title, 1-120 characters | yes |
| `date` | The day, `YYYY-MM-DD` | yes |
| `start` | Start time `HH:MM`, or `null` for an all-day event | no |
| `end` | End time `HH:MM`, not before `start`, or `null` | no |
| `person` | The first name of the family member it is for, at most 40 characters, or `null` for the whole family | no |
| `category` | `homework`, `plan`, `appointment` or `other` | yes |
| `notes` | Extra text, at most 1000 characters, or `null` | no |

The JSON schema:

```jsonschema
{{JSON_SCHEMA}}
```

## Examples

A small file:

```json
{
  "schema_version": 1,
  "events": [
    {
      "title": "Maths: pages 40-41",
      "date": "2026-11-24",
      "start": null,
      "end": null,
      "person": "Alex",
      "category": "homework",
      "notes": null
    }
  ]
}
```

A file with several categories:

```json
{
  "schema_version": 1,
  "events": [
    {
      "title": "Swimming",
      "date": "2026-11-24",
      "start": "16:00",
      "end": "17:00",
      "person": "Sam",
      "category": "appointment",
      "notes": "Bring a towel"
    },
    {
      "title": "Forest trip",
      "date": "2026-11-25",
      "start": null,
      "end": null,
      "person": null,
      "category": "plan",
      "notes": "Dress for the weather"
    },
    {
      "title": "Birthday at grandma's",
      "date": "2026-11-29",
      "start": "14:00",
      "end": null,
      "person": null,
      "category": "other",
      "notes": null
    }
  ]
}
```

## Answer

Answer only with JSON, with no explanation and no code block.
