# 15 — Collaborator invites + roles

**What to build:** The owner of a Wedding can invite another user (a Couple or a Planner) as a Collaborator by email. The invited user receives an email with a link to accept. Once accepted, the Collaborator can access the Wedding with the role assigned: Admin (full control), Editor (manage guests, ceremonies, invitations — cannot manage collaborators or delete the wedding), or Viewer (read-only). The owner can change a Collaborator's role or remove them at any time.

**Blocked by:** 02 — Couple Account + Wedding creation, 03 — Planner Account + Wedding list.

**Status:** ready-for-agent

- [ ] A Wedding owner can invite a user by email with a chosen role (Admin / Editor / Viewer)
- [ ] The invited user receives an email with an accept link
- [ ] Accepting the invite grants the user access to the Wedding with the assigned role
- [ ] An Admin Collaborator can do everything the owner can do except delete the Wedding or transfer ownership
- [ ] An Editor Collaborator can manage Guests, Ceremonies, Seating Plans, and Invitations but cannot manage Collaborators
- [ ] A Viewer Collaborator can see all Wedding data but cannot modify anything
- [ ] The owner can change a Collaborator's role
- [ ] The owner can remove a Collaborator, immediately revoking their access
- [ ] The Wedding detail page shows the current list of Collaborators and their roles
