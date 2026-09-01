# 04 — Ceremony management

**What to build:** A Wedding Admin or Editor can add one or more Ceremonies to a Wedding. Each Ceremony has a type (coutumier, civil, religieux, or a custom label), a date, a time, and a venue. Ceremonies can be edited, reordered to reflect chronological order, and deleted. The coutumier, civil, and religieux types are first-class options — not user-invented custom labels. Deleting a Ceremony warns the user that associated guest assignments will be removed.

**Blocked by:** 02 — Couple Account + Wedding creation.

**Status:** ready-for-agent

- [ ] A Wedding Admin or Editor can add a Ceremony with type, date, time, and venue
- [ ] Coutumier, civil, and religieux are selectable as distinct first-class Ceremony types
- [ ] A custom text label can be provided when the type is "custom"
- [ ] A Wedding Admin or Editor can edit any field of an existing Ceremony
- [ ] Ceremonies can be reordered; the list always shows them in the user-set order
- [ ] A Wedding Admin or Editor can delete a Ceremony; the API rejects deletion if Guests are assigned and the user has not confirmed the warning
- [ ] A Wedding Viewer can view Ceremonies but cannot create, edit, reorder, or delete them
