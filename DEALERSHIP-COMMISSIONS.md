# Dealership referral and commission workflow

## Workflow

1. A signed-in customer selects a motorcycle and dealership in offline checkout and explicitly consents to sharing contact details.
2. The backend saves the offline purchase request and creates or reuses an active referral. The order is an enquiry only; it does not establish a sale or commission.
3. Dealership users see referrals scoped to dealerships they own or staff. They can update follow-up status, record contact attempts and notes, and submit completed offline sales with invoice details.
4. A submitted referral sale starts as `pending_verification`. The admin reviews the sale and its invoice evidence, then approves or rejects the commission.
5. Approval resolves the effective dealership policy on the sale date, calculates in integer paise, and snapshots the policy terms. A payout can only be recorded once the payable date has arrived.
6. Payouts and reversals are separate `CommissionPayout` ledger entries. Reversing a paid commission creates a reversal entry and preserves the original payout.

Walk-in sales without a referral remain sales records and never earn MOTOAI commission. The customer sale price is separate from MOTOAI's commission.

## Policy configuration

Admins configure a dealership rule from the **Dealership Commissions → Commission Rules** tab. Supported terms include fixed or percentage amount, eligible amount basis, minimum and maximum eligible sale amount, commission cap, effective dates, payout delay, and whether taxes, accessories, and registration are included. Changing a rule creates a new dated policy version; approved commission records retain the policy snapshot.

The policy resolver can also evaluate dealership, brand, category, and global scopes from `CommissionRule`, but the current dashboard editor exposes dealership scoped rules only. A dealership rule must explicitly be configured before any referral sale can earn commission; there is no default commission rate.

## APIs

Customer routes:

- `POST /api/referrals`
- `GET /api/referrals/my-referrals`
- Offline checkout submits an order with `consentToShare`; the order controller associates it with a referral.

Dealership routes:

- `GET /api/provider/referrals`
- `GET /api/provider/referrals/:id`
- `PATCH /api/provider/referrals/:id/status`
- `POST /api/provider/referrals/:id/contact-attempt`
- `PATCH /api/provider/referrals/:id/notes`
- `POST /api/provider/sales`
- `GET /api/provider/sales` and `/api/provider/commissions`

Admin routes:

- `GET /api/admin/commissions/summary`
- `GET /api/admin/commissions/referrals`; `PATCH /api/admin/commissions/referrals/:id/dispute`
- `GET|PUT /api/admin/commissions/rules`
- `GET /api/admin/commissions/sales`
- `POST /api/admin/commissions/sales/:saleId/approve` and `/reject`
- `GET /api/admin/commissions`, `POST /api/admin/commissions/:commissionId/payout`
- `POST /api/admin/commissions/:commissionId/reverse`
- `GET /api/admin/commissions/:commissionId/audit`
- `GET /api/admin/commissions/report.csv`

## Security and data rules

- Customer and provider routes require the existing authentication middleware. Admin operations additionally require the admin role.
- Provider referral and sale queries are filtered by server-derived dealership ownership/staff membership.
- Provider referral serializers hide customer details unless referral consent is present.
- Financial amounts, approval status, and payout status are set by backend code. The provider's submitted eligible amount is ignored; the sale amount and its declared meaning are checked against policy during admin approval.
- Unique referral-code, active-referral dedupe, sale-per-referral, commission-per-sale, invoice-number, and payout indexes provide duplicate guards.
- Invoice files are referenced by URL; the application does not store them in MongoDB.

## Verification

- `npm test --prefix server`: 4 unit tests pass for paise arithmetic, fixed/percentage calculations, policy caps/minimums, referral code generation, and referral status transitions.
- Node syntax checks pass for the modified backend route/service/controller files.
- `npm run build`: Vite production build passes.
- Targeted ESLint was attempted. The repository currently reports numerous existing lint errors across its server and frontend, so lint is not a clean acceptance check.

Database-backed API authorization, MongoDB transaction behavior, email delivery, and responsive UI behavior still need integration testing against the deployment MongoDB and browser environment. The service uses unique constraints for idempotency; sale approval and payout writes are not wrapped in MongoDB multi-document transactions.
