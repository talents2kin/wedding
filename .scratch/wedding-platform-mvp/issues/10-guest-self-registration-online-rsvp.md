# 10 — Guest self-registration + online RSVP

**What to build:** A Wedding Admin or Editor can generate a self-registration link for a Ceremony. A Guest who follows the link fills in their name, contact details (phone and/or email), RSVP status (confirmed / declined), meal preference, and +1 details — all in one flow. If a Guest with the same phone or email already exists in the Wedding, the link lets them update their RSVP and meal preference rather than creating a duplicate. The organiser can see which Guests self-registered vs. were manually entered. This flow is tested at the E2E browser seam.

**Blocked by:** 05 — Guest list — manual entry + groups, 08 — Invitation template catalog + digital delivery.

**Status:** ready-for-agent

- [ ] A Wedding Admin or Editor can generate a self-registration link scoped to a specific Ceremony
- [ ] A Guest can open the link without logging in and submit their name, phone, email, RSVP status, meal preference, and +1 details
- [ ] A new Guest record is created in the Wedding when a first-time visitor submits the form
- [ ] If a Guest with the same phone or email already exists, the form pre-fills their data and submission updates their RSVP and meal preference (no duplicate created)
- [ ] The Guest list shows a "self-registered" indicator for Guests who came through this flow
- [ ] The self-registration link is scoped — it cannot be used to register for Ceremonies the Guest was not intended to attend
- [ ] The form is fully usable on a mobile browser
- [ ] E2E test covers: open link → fill form → submit → Guest record appears in the organiser's dashboard
