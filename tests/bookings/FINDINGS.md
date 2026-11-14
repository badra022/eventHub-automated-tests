# Findings - US-114 Book Tickets

Everything the automation and the exploration found on https://eventhub.rahulshettyacademy.com (API `/api`) up to 2026-11-13.
Each item says how it was observed, how to reproduce it, and which test guards it. Tests for confirmed defects keep the
correct assertion and are tagged `@excluded` with an `exclusionReason`; run them with `RUN_EXCLUDED=true`.

Severity: **Critical** (money or seats wrong for real users), **High**, **Medium**, **Low**.

## 1. Product defects

| ID | Severity | Risk | Finding | Evidence | Reproduce | Guarded by |
|---|---|---|---|---|---|---|
| D1 | Critical | R3 | **Overbooking under concurrency.** Six single-ticket bookings sent at the same moment for a 2-seat event succeed 3 to 6 times. The API claims seats are decremented atomically. | 5 of 5 framework runs on 2026-11-13 (3, 4, 6, 6, 4 successes, refs logged). One run with staggered requests (PowerShell parallel) did not overbook, so it is timing-dependent. | Create an event with `totalSeats: 2`; fire 6 `POST /bookings` (`quantity: 1`) with `Promise.all`; count the 201s and the bookings listed for the event. | [api/S35](api/S35-parallelBookingsDoNotOverbook.spec.ts) (`@excluded`) |
| D2 | High | R2, T2 | **Seat leak after sandbox eviction.** When a 10th booking silently evicts the oldest one, the evicted booking's seat is never given back: an event of 100 seats shows 90 free while only 9 bookings exist. | 3 of 3 runs on 2026-11-13 (`seats: 90, held: 9`). | On an empty sandbox book 9 x 1 ticket on a 100-seat event, then a 10th; compare `availableSeats` with the tickets still listed. | [api/S19](api/S19-sandboxLimitEviction.spec.ts) second test (`@excluded`) |
| D3 | Medium | R1 | **Quantity sent as text is accepted.** `quantity: "2"` creates a booking (201) and is stored as 2; the contract says integer. | 201 on a fresh event, confirmed twice on 2026-11-13. | `POST /bookings` with `"quantity": "2"`. | [api/S31](api/S31-quantityBoundaries.spec.ts) `"2"` case (`@excluded`) |
| D4 | Medium | R2 | **Server error on a non-numeric booking id.** `DELETE /bookings/abc` answers 500 "Internal server error" instead of a client error. | 3 runs on 2026-11-13. | `DELETE /api/bookings/abc` with a valid token. | [api/S25](api/S25-cancelMissingBookingReturns404.spec.ts) third test (`@excluded`) |
| D5 | Low | R4 | **`limit` above the documented maximum is accepted.** `GET /bookings?limit=101` answers 200 with `pagination.limit: 101`; the spec maximum is 100. | 3 runs on 2026-11-13. | `GET /api/bookings?limit=101`. | [api/S39](api/S39-listFiltersAndPaging.spec.ts) third test (`@excluded`) |
| D6 | Low | R6 | **Different answers for another user's booking.** User B gets 403 "You are not authorized to view this booking" on GET (by id and by reference) but 404 on DELETE of the same booking. The 403 also confirms to user B that the id exists (enumeration). | Framework and independent raw-HTTP checks on 2026-11-13. | As user B: `GET /bookings/{idOfA}`, `GET /bookings/ref/{refOfA}`, `DELETE /bookings/{idOfA}`. | [api/S38](api/S38-otherUserCannotReadOrCancelBooking.spec.ts) accepts 403 or 404 (both prevent access); inconsistency annotated |

## 2. Contract deviations (API differs from its OpenAPI spec)

| ID | Finding | Spec says | API does | Handled in |
|---|---|---|---|---|
| C1 | Booking reference format | `EVT-XXXXXX` | `<first letter of the event title>-XXXXXX`, e.g. `D-W6VW4J`, `Q-MD84WU` | `BOOKING_REF_PATTERN` (services/bookings.service.ts), schema, S01/S28 |
| C2 | Decimal types | `price`, `totalPrice` are numbers | Strings, e.g. `"1500"`, `"299.97"`, and without trailing zeros (`"999.9"`) | `api/types.ts`, `assertions/schemas.ts` |
| C3 | Authentication on bookings | No 401 documented for `/bookings` | Every booking endpoint answers 401 without a valid token (correct, just undocumented) | S37 |
| C4 | Invalid list parameters | `limit` 1-100, `page` >= 1, `status` in confirmed/cancelled | `limit=0` silently becomes 10, `page=0` becomes 1, `status=bogus` returns 200 with no results; no validation error | S39 `limit=0` asserts today's behaviour (`@needs-clarification`) |
| C5 | Cancel semantics | `DELETE` "permanently deletes", yet the schema has status `cancelled` | Hard delete: the booking answers 404 by id and by reference; `status=cancelled` never returns anything | `helpers/bookings/cancellation.helpers.ts`, S21, S27 |

## 3. Questions for the PO (gaps G1-G11 from the test plan, with what the system does today)

| Gap | Question | Observed today | Tests asserting today's behaviour |
|---|---|---|---|
| G2 | One phone rule for UI and API? | API counts characters (10+ chars, digits and `+ - ( )` spaces), UI needs 10 digits: `----------` passes the API, the form rejects it | S32 API + S32 form (`@needs-clarification`) |
| G5 | Soft-cancel or hard-delete? | Hard delete (see C5) | S21, S27 |
| G7 | How are decimal totals shown? | UI shows whole dollars: 99.99 x 3 = 299.97 is displayed as `$300`; free events total `0` | S12, S13 |
| G10 | Past and deleted events | `POST /events` rejects past dates ("Event date must be in the future"), but the three featured shared events are already past (e.g. #285 on 2026-10-20) and still bookable. Deleting an event deletes its bookings with no notice to the user; its page then shows "Event not found" | S36 (create rejected), S40. Booking a past featured event is **not automated**: tests must not depend on shared events (repo rule) |
| G11 | Is the 9-booking eviction a product rule? | The 10th booking replaces the oldest silently (201, normal "Booking confirmed!" message, no warning field) and leaks a seat (D2) | S19 |

## 4. UX and accessibility observations

| ID | Observation | Evidence | Test |
|---|---|---|---|
| U1 | Failed bookings show raw technical texts: "Internal server error" (500) and "Network Error" (connection failure). Readable, but not user guidance (no "try again", the form keeps the input) | S07 with mocked failures | S07 |
| U2 | "Clear all bookings" asks through a native browser `confirm()`, while cancelling one booking uses an in-page dialog | Probe + S26 | S26 |
| U3 | The form's own messages and the browser's native validation both fire on empty fields (`required` attributes show "Please fill out this field."), so users can see two different messages for one problem | Probe on 2026-11-13 | S04 asserts the app messages |
| U4 | **Accessibility defect (R11, Medium):** axe reports a serious `color-contrast` violation on the "(max N)" label of the booking form: `#9ca3af` on `#ffffff` = 2.53:1, WCAG AA needs 4.5:1 for 14 px text. Keyboard-only booking works (Tab order name, email, phone, Confirm; Enter submits) | 2 of 2 axe runs on 2026-11-13 | S09 scan (`@excluded`), S09 keyboard (passes) |
| U5 | On a sold-out event the counter still shows "1" next to "(max 0)" and the summary still prices 1 ticket ($500 x 1 = $500), although nothing can be booked | S08 ARIA baseline | S08 |
| U6 | When the seats run out after the event page loaded, the API's rejection is shown as a toast ("Only 0 seat(s) available, but 1 requested"), but the page keeps showing "2 / 2 seats" and an enabled Confirm button until it is reloaded, inviting the user to retry | Observed 2026-11-14; the page shows SOLD OUT only after a reload | [ui/S34](ui/S34-seatsGoneBeforeSubmitShowsError.spec.ts) |

## 5. Security findings (product)

Status: **Confirmed** (observed), **Not reproduced** (checked, no issue), **Unverified** (plausible, not tested).

| ID | Severity | Status | Finding | Evidence | Recommended fix | Guarded by |
|---|---|---|---|---|---|---|
| P1 | High | Confirmed | **Booking ids can be enumerated.** Another user's booking answers 403 on GET while a missing one answers 404, and ids are sequential integers, so anyone logged in can map which bookings exist (same root cause as D6). | S38 and raw HTTP on 2026-11-13 | Answer 404 for "not yours" and "does not exist" alike; use non-sequential ids (UUIDs) | [api/S38](api/S38-otherUserCannotReadOrCancelBooking.spec.ts) |
| P2 | High | Confirmed | **Concurrent requests oversell seats** (D1): a caller can obtain more tickets than exist by sending requests in parallel. | 5 of 5 runs on 2026-11-13 | Reserve seats atomically (`UPDATE ... SET available = available - n WHERE available >= n`, or a row lock) in the booking transaction | [api/S35](api/S35-parallelBookingsDoNotOverbook.spec.ts) (`@excluded`) |
| P3 | High | Confirmed (leak); Unverified (shared events) | **Seat leak on eviction** (D2): each evicted booking keeps its seat forever. If it also applies to the shared featured events, one user could make them sold out for everyone by booking repeatedly. | 3 of 3 runs on 2026-11-13 on own events; shared events not tested (repo rule: no data on shared events) | Release seats when a booking is evicted; reconcile `availableSeats` with existing bookings | [api/S19](api/S19-sandboxLimitEviction.spec.ts) (`@excluded`) |
| P4 | Medium | Confirmed | **Weak server-side validation; the browser's rules can be bypassed.** `quantity: "2"` accepted (D3), phone `----------` accepted (G2), `DELETE /bookings/abc` answers 500 (D4, unhandled error), `limit=101` accepted (D5, unbounded page size helps scraping and load). | See D3, D4, D5, G2 | Strict schema validation on the server (types, formats, max page size); 400 instead of 500 for malformed ids | S31, S32, S25, S39 |
| P5 | Medium | Confirmed | **Session token exposure.** The JWT is kept in `localStorage` (`eventhub_token`), so any XSS can read it; it is valid for 7 days, carries the user's email, has no refresh/rotation, and the API has no logout endpoint, so a stolen token works until it expires. | Saved storage state and token claims (2026-11-13); API spec has no logout route | HttpOnly + Secure + SameSite cookie, short-lived access token with refresh, server-side revocation on logout, only the user id in the claims | Not automated (needs product decisions) |
| P6 | Low | Not reproduced | **User enumeration at login.** Suspected from earlier framework code, but an unknown email and a known email with a wrong password both answer 400 "Invalid email or password" (no difference). The only deviation is 400 instead of the usual 401. | One request each on 2026-11-14 | None for enumeration; consider 401 for failed login | Not automated |
| P7 | Medium | Unverified | **No rate limiting or verification on login and registration.** Not tested, to avoid load on the public site; registration needs no email verification, and accounts can never be deleted, so mass registration would be permanent. | Swagger (no delete or verification endpoints) | Rate limits and lockout on `/auth/*`, CAPTCHA or email verification on register, account deletion | Not automated |
| P8 | High (if failing) | Not reproduced | **Token signature and algorithm checks.** A live token signed with a foreign key, an unsigned token (`alg: none`) and the owner's real token with another user's id in its payload are all rejected with 401 on every booking endpoint, and nothing changes. | 6 of 6 S37 cases passing on 2026-11-14 | Keep verifying the signature and allowing only the expected algorithm | [api/S37](api/S37-missingOrInvalidTokenReturns401.spec.ts) (three new cases) |

## 6. Environment notes

- The public server drops connections now and then (`socket hang up`, `ECONNRESET`, `connect EACCES`); GETs are retried, other calls fail loudly with the error in the log.
- Booking cleanup relies on each worker account's own sandbox; a dedicated account (`sandboxLimitUser`) is used for the eviction scenario so pool accounts never go above 8 bookings.
