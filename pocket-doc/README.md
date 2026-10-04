# Pocket Doc

A mobile-first, browser-based prototype for private health orientation. This is a software-engineering demo, **not a clinical product**. It does not diagnose, and its keyword-based assistant is not clinically validated.

## Run locally

```bash
pnpm install
pnpm dev
```

The app starts with clearly fictional records for **Amina Test** so every section is explorable. Data and preferences can be edited or deleted from the app.

## Privacy by default

- Medical records persist in browser IndexedDB, with a same-shape `localStorage` fallback through `client/src/lib/localStore.ts`.
- No API key, remote model, backend, upload, analytics, external font, or other network request is used in the default prototype. Health-record attachments are stored as local data URLs in the same browser database.
- The app’s internal section selection does not put profile or health information in URLs.
- Export produces one JSON download. “Delete all local data” requires typing `DELETE` and clears the stored profile, records, and preferences.
- Local browser storage is not encrypted, synchronized, or backed up. Clearing browser site data will remove the prototype’s data.

## Assistant replacement boundary

`client/src/lib/assistant.ts` implements the `MedicalAssistantService` boundary. `mockMedicalAssistantService` is a deterministic, local mock:

- `detectEmergencySigns(rawText)` runs synchronously on every submitted user message before extraction or guidance. It uses an explicit, extendable keyword/pattern list and interrupts the normal flow on a match.
- `analyzeSymptoms(input, patientContext)` returns a typed `SymptomExtraction` with a symptom category, age/sex where available, relevant history, medication/allergy context, and the original text kept for the session transcript.
- `askFollowUpQuestion(extraction, field, locale)` asks one question for duration or severity at a time.
- `generateHealthGuidance(extraction, locale)` returns all four required result areas: plural and hedged possible explanations, warning signs, a next-step urgency and reason, and optional follow-up questions.

A future remote assistant should implement that same TypeScript contract behind a deliberately explicit opt-in integration. Its output should be schema-validated and safety-reviewed before display. **Do not add a network call to the default local-only build or send health information without a separate privacy/consent design.** Keep the deterministic emergency detector before any remote service call; an LLM is not the emergency safety layer.

`client/src/contexts/PocketDocContext.tsx` is the UI-facing data boundary. It owns typed CRUD operations over the snapshot; replace the implementation behind `LocalStore` in `client/src/lib/localStore.ts` to use a different browser-local database without coupling screens to the storage engine.

## Safety and demo limitations

- The exact medical disclaimer is shown on first launch, at the top of every symptom-check session, and in Settings → About.
- Emergency alerts interrupt the checker immediately and use the country explicitly selected in Settings for local emergency/crisis numbers. If a country is not configured, the app asks the user to set one instead of guessing.
- The assistant only offers preliminary orientation. It cannot assess emergencies, inspect files, verify medication safety, or provide individualized clinical advice. In an emergency, use local emergency services.
- Browser notifications are optional and only fire while the page is open. Add a time such as `08:30` to a medication’s frequency or instructions; the browser must grant notification permission.
- Language switching is local. French, English, and Arabic UI strings are included, and Arabic activates document RTL direction (including the chat and history timeline).

## Main source layout

- `client/src/pages/PocketDocApp.tsx` — seven-section application shell and CRUD screens
- `client/src/pages/SymptomChecker.tsx` — conversation, emergency interruption, and guidance result
- `client/src/components/EntityEditor.tsx` — shared validated CRUD dialogs
- `client/src/lib/types.ts` — typed data model and fictional seed data
- `client/src/lib/localStore.ts` — IndexedDB / localStorage adapter
- `client/src/lib/assistant.ts` — mock service and safety patterns
- `client/src/lib/i18n.ts` — English, French, and Arabic dictionaries
