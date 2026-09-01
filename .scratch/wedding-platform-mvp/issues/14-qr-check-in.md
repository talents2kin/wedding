# 14 — QR check-in

**What to build:** On the day of a Ceremony, a staff member opens a check-in view on their mobile browser (no app install required). They can scan a Guest's QR code from their PDF Invitation to mark them as arrived. If a Guest does not have their QR code, the staff member can search by name and mark them arrived manually. A live counter shows how many Guests have arrived vs. the total expected for the Ceremony. This flow is tested at the E2E browser seam.

**Blocked by:** 09 — PDF invitation + QR code.

**Status:** ready-for-agent

- [ ] The check-in view is accessible on a mobile browser without installing an app
- [ ] A staff member can activate the device camera and scan a Guest's QR code
- [ ] Scanning a valid QR code marks the Guest as arrived for the correct Ceremony
- [ ] Scanning an invalid or already-used QR code shows a clear error message
- [ ] A staff member can search for a Guest by name and mark them arrived manually
- [ ] A live counter shows arrived count vs. total expected for the Ceremony, updating in real time
- [ ] A Wedding Admin or Editor can see the full check-in log (who arrived, at what time) from the dashboard
- [ ] E2E test covers: open check-in view → scan QR → Guest status updates to arrived in the organiser dashboard
