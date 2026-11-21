# Importskabelon til Nexmio Family ugeplan

## Din opgave

Lav en importfil til en familiekalender ud fra materialet nedenfor. Materialet kan være en ugeplan fra skolen, et brev, en liste med lektier eller en invitation.

## Regler

1. Skriv alle datoer som `YYYY-MM-DD`.
2. Hvis materialet ikke oplyser året, skal du **spørge brugeren om året, før du svarer**.
3. En værdi du ikke kender, er `null`. Gæt aldrig en værdi.
4. `category` skal være præcis én af disse: `homework` (lektier), `plan` (en plan fra skole eller klub), `appointment` (et fast tidspunkt eller en aftale), `other` (alt andet).
5. Opfind aldrig events. Skriv kun det, materialet siger.
6. Ét event for hver lektie eller aktivitet.
7. Tidspunkter skrives som `HH:MM` (24 timer), for eksempel `08:00`.
8. Behold titler og noter på materialets sprog. Oversæt dem ikke.
9. Filen må højst indeholde 500 events.

## Formatet

Filen er JSON. `schema_version` er altid `1`. Andre felter er ikke tilladt. Feltnavnene og kategorierne er altid på engelsk.

| Felt | Betydning | Krævet |
|---|---|---|
| `title` | Kort titel, 1-120 tegn | ja |
| `date` | Dagen, `YYYY-MM-DD` | ja |
| `start` | Starttid `HH:MM`, eller `null` for et heldagsevent | nej |
| `end` | Sluttid `HH:MM`, ikke før `start`, eller `null` | nej |
| `person` | Fornavnet på den i familien det gælder, højst 40 tegn, eller `null` hvis det gælder hele familien | nej |
| `category` | `homework`, `plan`, `appointment` eller `other` | ja |
| `notes` | Ekstra tekst, højst 1000 tegn, eller `null` | nej |

JSON-skemaet:

```jsonschema
{{JSON_SCHEMA}}
```

## Eksempler

En lille fil:

```json
{
  "schema_version": 1,
  "events": [
    {
      "title": "Matematik: side 40-41",
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

En fil med flere kategorier:

```json
{
  "schema_version": 1,
  "events": [
    {
      "title": "Svømning",
      "date": "2026-11-24",
      "start": "16:00",
      "end": "17:00",
      "person": "Sam",
      "category": "appointment",
      "notes": "Husk håndklæde"
    },
    {
      "title": "Skovtur",
      "date": "2026-11-25",
      "start": null,
      "end": null,
      "person": null,
      "category": "plan",
      "notes": "Tøj efter vejret"
    },
    {
      "title": "Fødselsdag hos farmor",
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

## Svar

Svar kun med JSON, uden forklaring og uden kodeblok.
