# 02 — Couple Account + Wedding creation

**What to build:** A Couple signs up and is taken through a short onboarding flow that creates their Couple Account and their one Wedding (name, date). They land on the Wedding dashboard showing zero Ceremonies and zero Guests. The free-tier guest cap and template limit are recorded on the account from the start. A Couple Account cannot create a second Wedding — the UI and API both enforce this.

**Blocked by:** 01 — Project scaffold.

**Status:** ready-for-agent

- [ ] Signing up as a Couple creates a Couple Account
- [ ] A Couple can create one Wedding with a name and date
- [ ] The Wedding dashboard shows Ceremony count, Guest count, and RSVP summary (all zero initially)
- [ ] Attempting to create a second Wedding is rejected by the API (4xx) and surfaced clearly in the UI
- [ ] Free-tier limits (guest cap, template limit) are recorded on the Couple Account
- [ ] The Couple Account type is distinct from the Planner Account type at the data level
