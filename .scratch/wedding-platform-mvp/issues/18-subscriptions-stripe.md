# 18 — Subscriptions — Stripe

**What to build:** A Couple or Planner can upgrade their Subscription via Stripe card payment from within the platform. For Couples: upgrading removes the guest cap and unlocks Template customisation. For Planners: upgrading moves them from Free (1 Wedding) to Starter, Pro, or Agency, each unlocking more Weddings and features. After a successful payment, the account limits update immediately. An email receipt is sent. Users can cancel their Subscription; on cancellation the account returns to free-tier limits at the end of the billing period.

**Blocked by:** 02 — Couple Account + Wedding creation, 03 — Planner Account + Wedding list.

**Status:** ready-for-agent

- [ ] A Couple can upgrade their Subscription via Stripe card payment
- [ ] Upgrading a Couple Account removes the guest cap and unlocks Template customisation immediately
- [ ] A Planner can upgrade to Starter, Pro, or Agency via Stripe card payment
- [ ] Upgrading a Planner Account increases the Wedding limit and unlocks tier-appropriate features immediately
- [ ] A payment receipt is sent by email after each successful charge
- [ ] A user can cancel their Subscription from account settings
- [ ] On cancellation, free-tier limits are restored at the end of the current billing period (not immediately)
- [ ] Freemium enforcement (guest cap, Wedding cap, template limit) is re-applied after cancellation takes effect
- [ ] Stripe webhook events are handled: payment succeeded, payment failed, subscription cancelled
