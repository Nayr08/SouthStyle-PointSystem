# SouthStyle Test Cases

## Scope
This checklist covers the highest-risk customer and admin flows in the current app.

## Environment
- Run `myschema.sql` in Supabase first.
- Run `run-this-login-functions.sql` after that.
- Seed at least:
  - 1 active admin account
  - 1 active customer account
  - 1 customer with points balance for coupon redemption

## Manual Smoke Checklist

### Customer Auth
- Enter a valid registered customer phone number and continue.
  - Expected: MPIN screen opens.
- Enter an invalid MPIN.
  - Expected: Wrong MPIN error appears.
- Enter the correct MPIN.
  - Expected: Customer home screen loads.
- Logout from Account tab.
  - Expected: Confirmation modal appears, then app returns to welcome screen after confirm.

### Admin Auth
- Open admin login with a valid admin phone number.
  - Expected: Login form loads.
- Enter a wrong PIN.
  - Expected: `Invalid admin number or PIN.` error appears in red.
- Enter a correct PIN.
  - Expected: Admin dashboard loads.
- Logout from admin dashboard.
  - Expected: Logout confirmation appears, then app returns to the welcome screen after confirm.

### Customer Registration
- Register a new customer from admin.
  - Expected: Customer is created, QR token is generated, customer appears in admin customer list.

### Staff Management
- Add a new staff account using an admin account.
  - Expected: Staff member appears in Current Staff.
- Open a staff member card.
  - Expected: Staff details modal appears.
- Remove a staff member.
  - Expected: Confirmation modal appears, staff becomes inactive, active staff counters update.

### Points and Orders
- Search for a customer in Add Points using phone / RFID / QR.
  - Expected: Customer account is found.
- Add a paid purchase without coupon or points usage.
  - Expected: Order is created and points are earned.
- Add a purchase with points usage.
  - Expected: Amount due updates correctly and points are deducted.

### Coupons and Rewards
- Create a new coupon from admin.
  - Expected: Coupon appears in Available Coupons.
- Open customer rewards page with enough points.
  - Expected: Coupon is available to redeem.
- Claim coupon from customer side.
  - Expected: Points are deducted and coupon appears in redeem history.
- Use claimed coupon in admin Add Points flow.
  - Expected: Coupon is validated, applied once, then marked used.

### Order Tracking
- Open an order in admin and update the current step to done.
  - Expected: Next step becomes active.
- Use `Go Back To Previous Step` on the active step.
  - Expected: Previous step becomes active again.
- Open customer order tracking.
  - Expected: Stepper reflects the admin tracking state.

### Customer Pages
- Open Scan tab.
  - Expected: Customer QR image renders instead of camera UI.
- Open Rewards page.
  - Expected: Redeem history shows a 3-item preview and `View all` only when needed.
- Open Transactions page.
  - Expected: Recent activity panel scrolls cleanly with hidden scrollbar.

## Automated E2E Coverage Added
- `tests/e2e/customer-auth.spec.ts`
- `tests/e2e/admin-auth.spec.ts`
- `tests/e2e/customer-navigation.spec.ts`

## Required E2E Environment Variables
- `E2E_CUSTOMER_PHONE`
- `E2E_CUSTOMER_PIN`
- `E2E_ADMIN_PHONE`
- `E2E_ADMIN_PIN`

## Run Commands
- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:ui`
