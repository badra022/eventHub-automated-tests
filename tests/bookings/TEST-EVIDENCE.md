# Test Evidence - bookings (US-114)

Evidence for the automated US-114 scenarios in `tests/bookings/` (Playwright projects `api` and `chromium`).
Status as of 2026-11-13: **not verified yet**. The review fixes are not committed, no PR exists, and nothing has run in CI on them (see "Open items").

## Tests

Local = `npx playwright test --project=api --project=chromium --repeat-each=3 --workers=4` unless stated. CI = GitHub Actions push run on the same commit.

| Scenario | Test(s) | File | Tags | Coverage (what it verifies) | Local run | CI run | Independently verified | Plan conformance |
|---|---|---|---|---|---|---|---|---|
| S01 | 1 | [ui/S01-bookOneTicketShowsConfirmation.spec.ts](ui/S01-bookOneTicketShowsConfirmation.spec.ts) | @ui @critical @smoke | Book 1 ticket in the UI; confirmation shows ref, customer, tickets, total; API holds the booking; 1 seat taken | 9dc1082: 3/3 passed | [43410523745](https://github.com/badra022/eventHub-automated-tests/actions/runs/43410523745): passed | - | Matches |
| S02 | 2 (10 tickets, last 2 seats) | [ui/S02-bookMaximumAllowedTickets.spec.ts](ui/S02-bookMaximumAllowedTickets.spec.ts) | @ui @critical @smoke @visual | Counter max = min(10, seats left); `+` disabled at max; ARIA + screenshot of the form; booking takes that many seats | 9dc1082: 6/6 passed | 43410523745: **2 failed**, missing `-chromium-linux.png` baseline only (ARIA passed) | - | Matches |
| S11 | 4 (qty 1, 2, 5, 10) | [api/S11-totalIsPriceTimesQuantity.spec.ts](api/S11-totalIsPriceTimesQuantity.spec.ts) | @api @critical @smoke | totalPrice = price × quantity | 9dc1082: 12/12 passed | 43410523745: passed | - | Matches |
| S12 | 1 | [ui/S12-decimalPriceTotal.spec.ts](ui/S12-decimalPriceTotal.spec.ts) | @ui @critical @needs-clarification | 99.99 × 3: API total exactly 299.97 and schema-valid; UI shows $300 (G7, current behaviour) | 9dc1082: 3/3 passed. Fixed version (schema instead of `toFixed(2)`): **not run to completion** | 43410523745: passed (old version) | - | Matches; G7 open |
| S14 | 1 | [ui/S14-confirmationTotalMatchesApi.spec.ts](ui/S14-confirmationTotalMatchesApi.spec.ts) | @ui @critical | Confirmation total and ticket count equal the stored totalPrice (qty 3) | 9dc1082: 3/3 passed | 43410523745: passed | - | Matches (overlaps S01, adds qty > 1) |
| S15 | 1 | [api/S15-clientSentPriceIsIgnored.spec.ts](api/S15-clientSentPriceIsIgnored.spec.ts) | @api @critical | Client-sent totalPrice, status, bookingRef, userId are ignored | 9dc1082: 3/3 passed | 43410523745: passed | - | Matches |
| S16 | 1 | [ui/S16-apiBookingAppearsInMyBookings.spec.ts](ui/S16-apiBookingAppearsInMyBookings.spec.ts) | @ui @critical @smoke @visual | API booking appears in My Bookings with ref, title, tickets, total, status; ARIA + masked screenshot of the card | 9dc1082: 3/3 passed; `--update-snapshots=changed` leaves ARIA baseline untouched | 43410523745: **failed**, missing linux PNG only | - | Matches |
| S18 | 1 | [ui/S18-usersSeeOnlyTheirOwnBookings.spec.ts](ui/S18-usersSeeOnlyTheirOwnBookings.spec.ts) | @ui @api @critical @security | A sees the booking (control); B's GET /bookings and B's My Bookings do not | 9dc1082: 3/3 passed | 43410523745: passed | - | Matches |
| S21 | 1 | [ui/S21-cancelFromMyBookings.spec.ts](ui/S21-cancelFromMyBookings.spec.ts) | @ui @critical @smoke @visual | Cancel dialog text, ARIA + masked screenshot; success message; card removed; API 404; seat back | 9dc1082: 3/3 passed; `--update-snapshots=changed` leaves ARIA baseline untouched | 43410523745: **failed**, missing linux PNG only | - | Matches; G5 open |
| S23 | 1 | [api/S23-cancelRestoresSeats.spec.ts](api/S23-cancelRestoresSeats.spec.ts) | @api @critical | Booking 3 takes 3 seats; cancel restores them | 9dc1082: 3/3 passed | 43410523745: passed | - | Matches |
| S24 | 1 | [ui/S24-cancelOneOfSeveralBookings.spec.ts](ui/S24-cancelOneOfSeveralBookings.spec.ts) | @ui @critical | Cancel the middle of 3 bookings in the UI; only it disappears (UI + API); only its seats released | 9dc1082: 3/3 passed | 43410523745: passed | - | Matches |
| S28 | 1 | [api/S28-validPostReturns201.spec.ts](api/S28-validPostReturns201.spec.ts) | @api @critical @smoke | 201, body matches the Zod schema, status confirmed, ref format | 9dc1082: 3/3 passed | 43410523745: passed | - | Matches (spec deviations annotated) |
| S29 | 1 | [api/S29-getByIdAndRefReturnSameBooking.spec.ts](api/S29-getByIdAndRefReturnSameBooking.spec.ts) | @api @critical | GET by id and by ref equal the created booking | 9dc1082: 3/3 passed | 43410523745: passed | - | Matches |
| S30 | 5 (one per required field) | [api/S30-missingRequiredFieldReturns400.spec.ts](api/S30-missingRequiredFieldReturns400.spec.ts) | @api @critical | 400 with a `details` entry naming the missing field; nothing created | 9dc1082: 15/15 passed | 43410523745: passed | - | Matches |
| S31 | 8 (7 run, 1 @excluded) | [api/S31-quantityBoundaries.spec.ts](api/S31-quantityBoundaries.spec.ts) | @api @critical | 1 and 10 accepted; 0, 11, -1, 1.5, null rejected; seats unchanged when rejected | 9dc1082: 20/21 passed; 1 failure = `connect EACCES` network error (environment, now retried) | 43410523745: passed | Excluded `"2"` case: 201 on a fresh event (defect confirmed) | Matches; defect R1 excluded |
| S32 (API) | 9 | [api/S32-fieldValidationRules.spec.ts](api/S32-fieldValidationRules.spec.ts) | @api @critical (+@needs-clarification) | API status for each field rule from the shared table `helpers/bookings/validationRules.helpers.ts` | 9dc1082: 27/27 passed. Refactored version: **not run to completion** | 43410523745: passed (old version) | - | Now paired with the UI counterpart |
| S32 (UI) | 9 | [ui/S32-fieldValidationRulesInForm.spec.ts](ui/S32-fieldValidationRulesInForm.spec.ts) | @ui @critical (+@needs-clarification) | Same values in the booking form: exact validation message and no booking request, or a successful booking | Working tree: 27/27 passed (`--repeat-each=3 --workers=4`) | **Not run in CI** | Form behaviour probed with playwright-cli before automating (booking POSTs intercepted) | Closes the review gap; G2 mismatch (`----------`) now verified in both layers |
| S34 | 1 | [api/S34-notEnoughSeatsReturns400.spec.ts](api/S34-notEnoughSeatsReturns400.spec.ts) | @api @critical | 400 "Only N seat(s) available, but M requested"; nothing created; seats unchanged | 9dc1082: 3/3 passed | 43410523745: passed | - | Matches |
| S35 | 1 (@excluded) | [api/S35-parallelBookingsDoNotOverbook.spec.ts](api/S35-parallelBookingsDoNotOverbook.spec.ts) | @api @critical @excluded | 6 simultaneous bookings for 2 seats: exactly 2 succeed, seats never oversold | Excluded. Framework runs on 2026-11-13: 5/5 overbooked (3, 4, 6, 6 and 4 successes) | Not run (excluded) | Staggered raw requests: 2/6 succeeded, no overbooking. Defect is timing-dependent | Matches; defect R3 excluded |
| S37 | 3 (no, malformed, expired token) | [api/S37-missingOrInvalidTokenReturns401.spec.ts](api/S37-missingOrInvalidTokenReturns401.spec.ts) | @api @critical @security | 401 on list, create, get by id, get by ref, cancel; owner's booking untouched | 9dc1082: 9/9 passed | 43410523745: passed | No token: list 401; bad token: cancel 401; owner still gets 200 | "Expired" is foreign-signed (annotated) |
| S38 | 1 | [api/S38-otherUserCannotReadOrCancelBooking.spec.ts](api/S38-otherUserCannotReadOrCancelBooking.spec.ts) | @api @critical @security | User B gets 403/404 on read, read by ref and cancel; A's booking and seats unchanged | 9dc1082: 3/3 passed. Fixed version (status asserted before logging): **not run to completion** | 43410523745: passed (old version) | User B: GET 403, GET by ref 403, DELETE 404; owner GET 200 | Matches |

## Verification log

### 2026-11-13 - commit `9dc1082` (pushed to main, no PR)
- Static checks: `npm run typecheck` 0 errors; `npm audit --omit=dev` 0 vulnerabilities; credentials encrypted (`users.json`, `otherUsers.json`); `.env`, `.auth/`, `*-win32.png` not committed.
- Local: `npx playwright test --project=api --project=chromium --repeat-each=3 --workers=4` -> 128 passed, 1 failed (S31 "quantity 1.5", `connect EACCES` on a read-back GET), 296 s.
- CI: [run 43410523745](https://github.com/badra022/eventHub-automated-tests/actions/runs/43410523745), report https://badra022.github.io/eventHub-automated-tests/ -> 39 passed, 4 failed. All 4 failures are `A snapshot doesn't exist ... -chromium-linux.png` (S02 x2, S16, S21), read from the CI traces; the ARIA assertions before them passed on Linux.
- Independent verification (raw HTTP as pool account16 and user B, data deleted afterwards): S38 403/403/404 and owner 200; S37 401/401 and owner 200; S35 staggered requests 2/6 succeeded; S31 `"2"` inconclusive (event already sold out), later confirmed 201 on a fresh event by the framework.
- Review verdict: **Changes required** (6 findings, below).

### 2026-11-13 - review fixes (working tree, not committed)
| Finding | Fix | Evidence |
|---|---|---|
| 1 High: `update_snapshots` job rewrote ARIA baselines (regex -> literal ref) | Job uses `--update-snapshots=changed` and commits only `tests/**/*-linux.png` | Reproduced with `=all` (ref `Q-383X9K` written, file restored). With `=changed` on S16 + S21: 2 passed, `git diff` on `*.aria.yml` empty |
| 2 High: CI red, no Linux PNG baselines | Pending: run the workflow with `update_snapshots` after finding 1 is merged | - |
| 3 Medium: S32 UI comparison was hard-coded | Shared rules table `helpers/bookings/validationRules.helpers.ts`; new UI test `ui/S32-fieldValidationRulesInForm.spec.ts`; `submitInvalidBookingForm` helper counts booking requests | Form probed with playwright-cli first; new test 27/27 passed |
| 4 Low: S38 parsed bodies before asserting status | Status asserted first; body dump left to the API client's debug log | Not run to completion |
| 5 Low: `EACCES` not retried | Added to `utils/retry.ts` (GET only) | Not run to completion |
| 6 Low: S12 `toFixed(2)` format coupling | Replaced with `toMatchSchema(BookingSchema)`; exact numeric total kept | Not run to completion |
| 7 Info: S35 timing dependence | `exclusionReason` now states both observations | - |

- Typecheck after the fixes: 0 errors.
- Full regression after the fixes (`--project=api --project=chromium --repeat-each=3 --workers=4`): started, **result not captured**. It must be rerun before sign-off.

## Open items before "Verified"
1. Commit the fixes on a branch and open a PR (this work was pushed straight to `main`).
2. Rerun the full local regression above and record the counts here.
3. In GitHub Actions: run the workflow with `update_snapshots` ticked, then a normal run on the PR branch; record both run links.
4. Product follow-ups: defects R3 (S35 overbooking) and R1 (S31 quantity as text); PO decisions G2 (phone rule), G5 (cancel semantics), G7 (price display).
