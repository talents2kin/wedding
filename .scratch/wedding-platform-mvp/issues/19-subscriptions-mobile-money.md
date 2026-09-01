# 19 — Subscriptions — Mobile Money

**What to build:** A Couple or Planner can pay for their Subscription using Mobile Money — Orange Money, MTN Mobile Money, or Wave — in addition to Stripe card. Prices are displayed in the user's local currency: EUR, XAF/XOF (CFA franc), or CDF (Congolese franc), detected from their account or location. The same Subscription tiers and limits apply regardless of payment method.

**Blocked by:** 18 — Subscriptions — Stripe.

**Status:** ready-for-agent

- [ ] The Subscription upgrade flow offers Mobile Money (Orange Money, MTN, Wave) as a payment option alongside Stripe card
- [ ] Prices are displayed in EUR, XAF/XOF, or CDF based on the user's detected or selected currency
- [ ] A Mobile Money payment initiates the provider's confirmation flow (USSD prompt or push notification to the user's phone)
- [ ] On successful Mobile Money payment, the account Subscription updates immediately (same behaviour as Stripe)
- [ ] A payment receipt is sent by email after a successful Mobile Money charge
- [ ] Failed or timed-out Mobile Money payments surface a clear error and do not change the Subscription
- [ ] Mobile Money webhook / callback events are handled: payment confirmed, payment failed, payment expired
