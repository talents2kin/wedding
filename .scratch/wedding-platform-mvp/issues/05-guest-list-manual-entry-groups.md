# 05 — Guest list — manual entry + groups

**What to build:** A Wedding Admin or Editor can build a Guest list by adding Guests one at a time. Each Guest record holds: name, phone, email, meal preference, +1 (name and contact), and one or more Guest Groups. Guests are assigned to one or more Ceremonies. The Guest list can be filtered by Guest Group, Ceremony, or RSVP status. Guests can be edited and deleted. Adding a Guest beyond the free-tier cap is rejected by the API with a clear upgrade prompt.

**Blocked by:** 04 — Ceremony management.

**Status:** ready-for-agent

- [ ] A Wedding Admin or Editor can add a Guest with name, phone, email, meal preference, +1 details
- [ ] A Guest can be assigned to one or more Ceremonies on the Wedding
- [ ] A Wedding Admin or Editor can create named Guest Groups (e.g., Family, VIP, Côté marié)
- [ ] A Guest can belong to one or more Guest Groups
- [ ] The Guest list can be filtered by Guest Group, Ceremony, and RSVP status simultaneously
- [ ] A Wedding Admin or Editor can edit any field of an existing Guest
- [ ] A Wedding Admin or Editor can delete a Guest
- [ ] Adding a Guest when the free-tier cap is reached is rejected by the API (4xx) and surfaced in the UI as an upgrade prompt
- [ ] A Wedding Viewer can view Guests but cannot add, edit, or delete them
- [ ] RSVP status for each Guest starts as "pending" per Ceremony
