# AquaLedger — Shrimp & Fish Farm Ledger (MVP)

AquaLedger replaces manual books for shrimp and fish farmers with an offline‑first, encrypted mobile app. Built with React + Vite + Tailwind + Capacitor.

## Key features (MVP)
- Offline‑first with local database and background sync when online
- Tabs: Dashboard, Feeding, Materials, Expenses, Settings
- Global pickers (Location, Tank) across tabs
- Role-based access: Owner, Manager, Partner
- Approval workflow for Manager edits (scaffolded)
- WAC (Weighted Average Cost) stock accounting (scaffolded)
- IST crop day counter and timestamps in UTC

## Roles & permissions
- Owner: full access; can view pricing; can create username+password/roles
- Manager: can record data; cannot view accounts/pricing; edits require Owner approval
- Partner: read‑only

## Subscriptions & limits (enforced on create)
- Free: max 1 Location; max 2 Tanks total; Owner only. Price ₹199/yr; Offer ₹0
- Pro: max 2 Locations; max 4 Tanks each; Owner only. Price ₹999/yr; Offer ₹599
- Enterprise: unlimited Locations/Tanks; roles Owner/Manager/Partner; Manager edits require Owner approval; Manager/Partner cannot view pricing. Price ₹5999/yr; Offer ₹2999

## WAC logic (per Location)
- Purchases: amount = qty × unitPrice
- WAC = totalAmount / totalQty
- Usage (feed/materials) deducts qty and cost at current WAC
- Prevent negative stock; prompt to add stock when insufficient

## Approval workflow (Manager edits)
1. Manager edit creates `Approval` with `diffJson`, `status=pending`
2. Owner approves/rejects with comment
3. On approve, apply diff, write `AuditLog`, enqueue sync

## IST crop day counter
- Day = floor((now_IST – start_IST)/1d) + 1; minimum 1
- Timestamps stored in UTC; displayed in IST

## Offline/sync
- Queue all write operations locally
- Sync in batches with exponential backoff
- Conflict resolution: field‑level last‑writer‑wins via `updatedAt` + `deviceId`
- Sync status chip: Synced / Queued / Error

## Security
- Local DB and files encrypted on native (Capacitor SQLite + OS keychain/keystore)
- HTTPS only for network traffic
- Sessions persisted securely (native keychain/keystore)

## Development
- Dev Test Login is enabled in development builds via Settings
- No sample data is shipped; lists are empty until you add data

## Mobile (Android/iOS)
1. Export to your GitHub, clone, and `npm install`
2. Initialize Capacitor if needed and add platforms: `npx cap add ios` / `android`
3. Build: `npm run build` then `npx cap sync`
4. Run: `npx cap run ios` / `android`

Note: This MVP scaffolds offline DB, sync queue, and RBAC UI. Connect Supabase in Lovable to enable backend authentication and cloud sync.
