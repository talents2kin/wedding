# 06 — Guest import via CSV

**What to build:** A Wedding Admin or Editor can upload a CSV or Excel file to bulk-import Guests. The platform presents a column-mapping step where the user maps their file's columns to the Guest fields (name, phone, email, meal preference). After confirming, Guests are imported into the Wedding. Import errors (missing required fields, duplicate email/phone) are surfaced row by row so the user knows what to fix. The free-tier guest cap is enforced across the full import — if the import would exceed the cap, the whole import is rejected with an upgrade prompt showing how many Guests would be over the limit.

**Blocked by:** 05 — Guest list — manual entry + groups.

**Status:** ready-for-agent

- [ ] A Wedding Admin or Editor can upload a CSV or Excel file
- [ ] A column-mapping step lets the user match their columns to Guest fields (name, phone, email, meal preference)
- [ ] After confirming the mapping, Guests are imported and appear in the Guest list
- [ ] Import errors are reported per row (e.g., "Row 12: missing name")
- [ ] Duplicate phone or email within the import is flagged before committing
- [ ] If the import would exceed the free-tier guest cap, the entire import is rejected with an upgrade prompt
- [ ] A successful import shows the number of Guests imported
