# Event Hub automated tests

Playwright + TypeScript tests for the [EventHub](https://eventhub.rahulshettyacademy.com) booking flow (US-114).

## Structure

| Folder | Holds |
|---|---|
| `api/` | Thin REST clients (`AuthAPIClient`, `EventsAPIClient`, `BookingsAPIClient`, `HealthAPIClient`) and wire types |
| `services/` | Domain operations over the clients (`AuthService`, `EventsService`, `BookingsService`, `HealthService`), with cleanup |
| `pages/` | Page objects and `components/` |
| `helpers/bookings/` | Shared workflows: `setup` (API seeding) and `ui` (browser journeys), payload builders |
| `fixtures/` | `base` -> `data` / `auth` -> `services`, combined into `app.ts` (UI) and `api.ts` (API only) |
| `assertions/` | Custom `expect` matchers |
| `config/env.ts` | Environment URLs and secrets (`prod`, `local`) |
| `utils/` | Logger, navigation, polling, retry, test data registry, encryption, common helpers |
| `test-data/` | `events.json`, `bookings.json`, `users.json` (encrypted accounts) |
| `scripts/` | `secret.ts` (encrypt/decrypt a value), `provision-users.ts` (register the account pool) |

## Setup

```bash
npm ci
npx playwright install
cp .env.example .env   # set TEST_DATA_KEY
npm run users:provision -- 4   # once: paste the output into test-data/users.json
```

## Run

```bash
npm test                      # everything
npm run test:api              # API project
npx playwright test --project=chromium --grep @smoke
npm run typecheck
```

CI: `.github/workflows/playwright.yml`. Needs the `TEST_DATA_KEY` secret in a `prod` GitHub environment and GitHub Pages enabled (source: GitHub Actions).
