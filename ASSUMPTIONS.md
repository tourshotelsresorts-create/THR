# Assumptions & open business questions

Unresolved BRD items are **admin-configurable** (`SystemSetting` + Admin → Settings). Defaults below.

## Open questions (BRD §9)

| # | Question | Config key | Default |
| --- | --- | --- | --- |
| 1 | Rate-change lock duration after quote | `RATE_LOCK_HOURS` | `24` |
| 2 | Who approves markup overrides / manual price adjustments | `MARKUP_APPROVER_ROLE` | `REVENUE_ADMIN` |
| 3 | WhatsApp Business API provider / template approval | `WHATSAPP_PROVIDER` | `stub` (interface in `apps/api/src/services/quote.ts`) |
| 4 | Final Transfer / Activity vendor | `TRANSFER_VENDOR`, `ACTIVITY_VENDOR`, `HOTEL_VENDOR` | `mock-holidaytaxis`, `mock-viator`, `mock-hotelbeds` |

## Pricing stack

Configurable via `TAX_STACKING_ORDER` (default `NET,MARKUP,GST,TCS,COMMISSION`):

1. **NET** — Hotel + Vehicle + Activity + Visa + Insurance + Guide + Service charges (canonical INR paise)
2. **MARKUP** — stacked matching rules (see precedence)
3. **GST** — % of base depending on whether GST is after MARKUP in the order (default: after markup)
4. **TCS** — % of post-GST amount when nationality matches `TaxRule.nationalityIn` (empty list = all)
5. **COMMISSION** — subtracted from the running total (`Agent.commissionBps`)

GST-before-vs-after-markup is an open Finance question; changing `TAX_STACKING_ORDER` to `NET,GST,MARKUP,TCS,COMMISSION` applies GST on net only.

## Markup precedence (deterministic)

BRD does not specify overlap. Implementation:

1. Keep enabled rules whose targeting matches and whose seasonal window contains travel date.
2. Sort by **scope specificity ascending**, then **priority ascending**, then **createdAt ascending**. Least specific applies first so more specific rules stack on top.
3. Specificity map: `CUSTOMER_SEGMENT(10) < AGENT_GROUP(20) < PACKAGE_COST_BAND(30) < DESTINATION(40) < HOTEL_CATEGORY(50) < SUPPLIER(60) < PRODUCT_TYPE(70)`.
4. If a matched rule has `exclusive=true`, stop stacking after it.

PERCENTAGE `value` is **basis points** (800 = 8.00%). FIXED `value` is canonical minor units.

## Rate resolution

Static and API rates coexist. **API wins** when a valid API rate exists for the night (live adapter or stored `HotelRate.source=API`). Seasonal multipliers apply to STATIC rates only.

## Itinerary immutability

Day-wise slot types on `ItineraryTemplate` cannot be reordered by agents. Only component IDs inside slots change. Search `nights` must equal `template.nightCount` (BRD search form omitted nights; we require it so the correct skeleton is selected).

## Vehicle type

A package has **one** `vehicleId` for the whole itinerary (enforced in the data model, not only UI).

## Audit log

All back-office master writes go to `AuditLog` (who / what / when / before / after) even though the BRD does not list it — needed for contracting compliance.

## Auth

JWT local login plus `POST /auth/sso/callback` stub. Real THR.com SSO is not reinvented.

## Money

Canonical currency is INR stored as **integer paise**. Display FX uses `FxRate.rateE6` (rate × 1e6). No floating-point prices in the engine.

## Visa / insurance

Cost line items only; no issuance (out of scope).

## Idempotency

`Idempotency-Key` header on quote create and booking convert. Retries return the original row.

## Cache

Redis when `REDIS_URL` is reachable; otherwise an in-memory map. Reprice target is well under 1s with mock adapters.

## Object storage

Local `apps/api/storage` by default; S3/MinIO env vars reserved for production.
