# 03 — Planner Account + Wedding list

**What to build:** A Planner signs up, creates a Planner Account, and can create a Wedding on behalf of a couple. They see all their Weddings in a list and a calendar view, each showing the Wedding name, date(s) of upcoming Ceremonies, and status. The free tier allows one active Wedding; attempting to create a second is blocked with a clear upgrade prompt. The calendar displays Weddings positioned by their Ceremony dates, not the Wedding creation date.

**Blocked by:** 01 — Project scaffold.

**Status:** ready-for-agent

- [ ] Signing up as a Planner creates a Planner Account
- [ ] A Planner can create a Wedding with a name and date
- [ ] All Weddings appear in a list view with name, next Ceremony date, and guest count
- [ ] All Weddings appear in a calendar view, positioned by their Ceremony dates
- [ ] Calendar can be filtered by Wedding status (upcoming, in-progress, past)
- [ ] On the free tier, creating a second Wedding is rejected by the API (4xx) and surfaced in the UI as an upgrade prompt
- [ ] Planner Account type is distinct from Couple Account type at the data level
