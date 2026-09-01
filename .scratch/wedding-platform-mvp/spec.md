# Wedding Guest Management Platform — MVP

**Label**: `ready-for-agent`

---

## Problem Statement

Couples organising weddings with multiple ceremony types (coutumier, civil, religieux) have no dedicated tool. They rely on spreadsheets and generic event platforms that treat each ceremony as an independent event, forcing them to duplicate their guest list for each one, manage separate RSVPs with no unified view, and send invitations from tools with no wedding-specific logic.

Planners face the same problem at scale — managing dozens of weddings across a shared calendar with no way to track guests, tables, or invitations per couple in one place.

The diaspora dimension compounds this: a Congolese couple in Paris organising a wedding with family across multiple countries needs a tool that bridges both markets, supports mobile payment methods common in Africa, and handles guest data responsibly across jurisdictions.

---

## Solution

A multi-tenant SaaS platform where Couples manage one Wedding and Planners manage many. Each Wedding contains one or more Ceremonies (coutumier, civil, religieux, or custom). Guest lists, invitations, seating plans, and RSVP tracking are managed per Ceremony within a unified Wedding view.

Couples and Planners can invite each other as Collaborators on a Wedding with granular roles. Planners can build a team with per-member roles across all their Weddings.

Invitations are sent digitally (email, SMS, WhatsApp) or generated as PDFs with QR codes. Guests can self-register and RSVP via a link. Staff check guests in at the door by scanning their QR code.

The platform is free to start (guest cap + template limit for Couples; one Wedding free for Planners) with paid tiers that unlock more capacity, visual seating plans, and full white-label branding for Pro/Agency Planners.

---

## User Stories

### Onboarding

1. As a Couple, I want to create a Couple Account so that I can start managing my Wedding.
2. As a Planner, I want to create a Planner Account so that I can manage multiple Weddings for my clients.
3. As a Couple or Planner, I want to log in with email and password so that I can access my account.
4. As a Couple or Planner, I want to reset my password via email so that I can regain access if I forget it.
5. As a Couple, I want to see my current Subscription tier and its limits (guest cap, template limit) so that I know when to upgrade.
6. As a Planner, I want to see how many active Weddings I have against my Subscription limit so that I know when to upgrade.

### Wedding management

7. As a Couple, I want to create a Wedding with a name and date so that I have a container for all my Ceremonies and Guests.
8. As a Planner, I want to create a Wedding on behalf of a couple so that I can manage it for them.
9. As a Couple or Planner, I want to invite the other party as a Collaborator on a Wedding so that we can work together.
10. As a Wedding owner, I want to assign a Collaborator the Admin, Editor, or Viewer role so that I control what they can do.
11. As a Wedding owner, I want to remove a Collaborator from a Wedding so that they lose access.
12. As a Planner, I want to see all my Weddings in a calendar view so that I can manage my schedule.
13. As a Planner, I want to filter my calendar by Wedding status (upcoming, past, in-progress) so that I can focus on what's relevant.
14. As a Wedding Admin, I want to archive a completed Wedding so that it no longer appears in my active list but remains accessible.

### Ceremony management

15. As a Wedding Admin or Editor, I want to add a Ceremony to a Wedding with a type (coutumier, civil, religieux, or custom), date, time, and venue so that I can track each part of the wedding separately.
16. As a Wedding Admin or Editor, I want to edit a Ceremony's details so that I can correct mistakes or update the plan.
17. As a Wedding Admin or Editor, I want to delete a Ceremony so that I can remove one that was cancelled.
18. As a Wedding Admin or Editor, I want to reorder Ceremonies so that they appear in chronological order in the dashboard.

### Guest management

19. As a Wedding Admin or Editor, I want to add a Guest manually (name, phone, email, meal preference, +1, Guest Groups) so that I can build my guest list one by one.
20. As a Wedding Admin or Editor, I want to import Guests from a CSV or Excel file so that I can build my list quickly from an existing spreadsheet.
21. As a Wedding Admin or Editor, I want to assign a Guest to one or more Ceremonies so that I control who is invited to each part of the wedding.
22. As a Wedding Admin or Editor, I want to create and name Guest Groups (e.g., Family, Friends, VIP, Côté marié) so that I can segment my guest list.
23. As a Wedding Admin or Editor, I want to assign a Guest to one or more Guest Groups so that I can filter and target them.
24. As a Wedding Admin or Editor, I want to filter the Guest list by Guest Group, Ceremony, or RSVP status so that I can find guests quickly.
25. As a Wedding Admin or Editor, I want to edit a Guest's details after adding them so that I can correct or update their information.
26. As a Wedding Admin or Editor, I want to delete a Guest so that I can remove someone who is no longer invited.
27. As a Wedding Admin or Editor, I want to record a Guest's +1 (name and contact) so that I have a full headcount.
28. As a Wedding Admin or Editor, I want to generate a self-registration link for a Ceremony so that Guests can fill in their own details.
29. As a Guest, I want to follow a self-registration link and fill in my name, contact, RSVP status, meal preference, and +1 so that the organiser has my information without needing to enter it manually.
30. As a Wedding Admin or Editor, I want to see which Guests self-registered so that I can distinguish organiser-entered from self-reported data.

### RSVP

31. As a Wedding Admin or Editor, I want to see each Guest's RSVP status (confirmed / declined / pending) per Ceremony so that I have an accurate headcount.
32. As a Wedding Admin or Editor, I want to manually update a Guest's RSVP status so that I can record responses received by phone or in person.
33. As a Guest, I want to confirm or decline my attendance via an online form so that the organiser knows I'm coming.
34. As a Wedding Admin or Editor, I want to see a summary of RSVP counts per Ceremony (confirmed / declined / pending) so that I can track progress at a glance.

### Invitations

35. As a Wedding Admin or Editor, I want to choose an invitation Template from the platform catalog so that I have a designed starting point.
36. As a paid Couple or Planner, I want to customise a Template's colours, fonts, and text so that the invitation matches our style.
37. As a Pro or Agency Planner, I want to replace the platform logo with my agency logo on all Invitations so that my clients receive a white-labelled experience.
38. As a Wedding Admin or Editor, I want to send a digital Invitation to one or more Guests via email, SMS, or WhatsApp so that they receive their invitation on their preferred channel.
39. As a Wedding Admin or Editor, I want to generate a PDF Invitation for a Guest so that I can print or forward it manually.
40. As a Wedding Admin or Editor, I want the PDF Invitation to include a QR code unique to the Guest so that they can use it to RSVP or check in.
41. As a Wedding Admin or Editor, I want to choose which name appears as the sender of digital Invitations (couple's names or planner's agency name) so that recipients know who the invitation is from.
42. As a Wedding Admin or Editor, I want to schedule an Invitation send for a future date and time so that it goes out at the right moment without manual action.
43. As a Wedding Admin or Editor, I want to set up an automated RSVP reminder that sends to Guests who haven't responded after N days so that I don't have to chase manually.
44. As a Wedding Admin or Editor, I want to see the delivery status of each Notification (sent, delivered, failed) so that I know which Guests need to be contacted another way.
45. As a Wedding Admin or Editor, I want to resend a failed Notification to a Guest so that they receive their invitation.

### Seating plan

46. As a Wedding Admin or Editor, I want to create a Seating Plan for a Ceremony by defining Tables (name and capacity) so that I can organise where Guests will sit.
47. As a Wedding Admin or Editor, I want to assign a Guest to a Table so that they have a seat.
48. As a paid Wedding Admin or Editor, I want to drag and drop Guests between Tables on a visual floor plan so that I can rearrange seating intuitively.
49. As a Wedding Admin or Editor, I want to see which Guests are unassigned to a Table so that I know the Seating Plan is incomplete.
50. As a Wedding Admin or Editor, I want to share a read-only link to the Seating Plan so that the venue or couple can view it without logging in.
51. As a Wedding Admin or Editor, I want to export the Seating Plan as a PDF so that it can be printed and displayed at the venue.

### Check-in

52. As a staff member at the Ceremony, I want to open a check-in view on a mobile browser so that I can scan Guests as they arrive without installing an app.
53. As a staff member, I want to scan a Guest's QR code to mark them as arrived so that attendance is recorded in real time.
54. As a staff member, I want to search for a Guest by name and manually mark them as arrived so that I can handle Guests who don't have their QR code.
55. As a Wedding Admin or Editor, I want to see a live count of arrived vs. expected Guests per Ceremony so that I know how many are still outstanding.

### Analytics & reporting

56. As a Couple or Wedding Admin, I want to see a dashboard summary for my Wedding (total Guests, RSVP breakdown, table occupancy, Notifications sent) so that I have the full picture in one place.
57. As a Wedding Admin, I want to see per-Ceremony breakdowns (confirmed count, meal preference summary, table occupancy) so that I can share accurate numbers with caterers and venue.
58. As a Planner, I want to see a dashboard across all my Weddings (upcoming dates, total guest counts, RSVP rates) so that I can manage my workload.
59. As a Couple or Planner, I want to export a report as PDF or Excel so that I can share it with vendors or keep a record.

### Team management (Planners)

60. As a Planner (Pro or Agency), I want to invite a Team Member to my Planner Account by email so that they can help manage Weddings.
61. As a Planner, I want to assign a Team Member the Admin, Editor, or Viewer role across my Weddings so that I control their access level.
62. As a Planner, I want to remove a Team Member from my Planner Account so that they lose access to all my Weddings.

### Subscriptions & billing

63. As a Couple, I want to upgrade my Subscription to remove the guest cap and unlock premium Templates so that I can manage a larger wedding with more design options.
64. As a Planner, I want to upgrade from Free to Starter, Pro, or Agency so that I can manage more Weddings and unlock team features.
65. As a Couple or Planner, I want to pay via card (Stripe) or Mobile Money (Orange Money, MTN, Wave) so that I can use my preferred payment method.
66. As a Couple or Planner in a CFA or Congolese franc market, I want to see prices in my local currency (XAF/XOF or CDF) so that I understand the cost without converting.
67. As a Couple or Planner, I want to receive an email receipt after each payment so that I have a record for my accounts.
68. As a Couple or Planner, I want to cancel my Subscription so that I stop being billed.

---

## Implementation Decisions

- **Account types are distinct at the data model level.** A Couple Account is linked to exactly one Wedding. A Planner Account has no intrinsic Wedding limit beyond what the Subscription allows. They are not subtypes of a shared User entity — they have different fields, different constraints, and different billing logic.

- **Wedding is the tenancy boundary.** All guest data, seating plans, invitations, and ceremony config belong to a Wedding. Access control is enforced at the Wedding level via Collaborator roles. Planner-level Team Member roles are separate — they govern access to the Planner Account, not to individual Weddings directly (a Team Member is implicitly a Collaborator on all Weddings that planner manages, with their Team Member role as the floor).

- **Ceremony is a child of Wedding.** A Guest belongs to a Wedding, then is assigned to one or more Ceremonies. This means the Guest record is created once and linked to Ceremonies, rather than duplicated per Ceremony. RSVP status, table assignment, and invitation delivery are tracked at the Guest-Ceremony pairing level.

- **RSVP is a per-Guest-per-Ceremony record.** A single Guest confirmed for the civil ceremony and declined for the coutumier ceremony holds two separate RSVP records. The summary view aggregates these.

- **QR code is per-Guest-per-Ceremony.** The QR code embedded in a PDF Invitation encodes the Guest's identity and the Ceremony they are invited to, enabling check-in to be scoped correctly when a Guest attends multiple Ceremonies.

- **Notifications are a separate entity from Invitations.** An Invitation is the content artefact (template + personalisation). A Notification is a delivery event (channel, status, timestamp, recipient). One Invitation can produce multiple Notifications (e.g., email failed → SMS resent).

- **Freemium limits are enforced at write time.** When a Couple on the free tier tries to add a Guest beyond their cap, the API rejects the request with a clear upgrade prompt. Template customisation is gated behind the paid tier — free tier users can select from the catalog but cannot modify colours, fonts, or text.

- **White-label is scoped to Pro/Agency Planner Accounts.** The sender identity and logo on Invitations are resolved at send time from the Wedding's owning Planner Account Subscription. If the Wedding was created by a Couple (not a Planner), no white-label option is available.

- **GDPR applies to all guest data globally.** Consent is collected at self-registration. Guests have a right-to-deletion endpoint. Data is stored in the EU. Retention policy is applied uniformly regardless of the Guest's country.

- **UI is French at launch; i18n is built in from day one.** All user-facing strings go through a translation layer. No hardcoded French strings in components. English and other languages are added by populating translation files, not by touching components.

- **Web-first; mobile browser is the check-in surface for v1.** The check-in view is a responsive web page optimised for mobile browsers. No native app is shipped in v1.

---

## Testing Decisions

A good test verifies observable behaviour at a system boundary — what a client receives in response to a request, not how the system produced that response. Tests must not assert on internal implementation (database queries, private methods, in-memory state). They must be deterministic and not depend on test execution order.

**Seam 1 — HTTP API (organiser flows):**
All Wedding creation, Guest management, RSVP recording, Invitation scheduling, Seating Plan assignment, and analytics are tested by sending HTTP requests and asserting on responses and side-effects (e.g., a Notification record created, a Guest's RSVP status updated). This is the primary seam and covers the vast majority of business logic.

**Seam 2 — E2E browser (guest-facing flows):**
Three flows can only be verified at the browser level because they involve unauthenticated public URLs and rendered output:
- Self-registration link → form submission → Guest record created
- RSVP form → RSVP status updated
- QR code scan → check-in status updated

There is no prior art in the codebase (greenfield project). Test patterns should be established at the first test written and documented in a `CONTRIBUTING.md` or test README so they serve as the canonical example.

---

## Out of Scope

- Vendor/supplier management (caterer, photographer, florist)
- Budget tracking
- Native iOS and Android apps
- English, Portuguese, or any non-French UI in v1
- Full custom invitation builder (Canva-style)
- Real-time collaborative seating plan editing (multiple simultaneous editors)
- Guest gift tracking
- Transport or accommodation tracking

---

## Further Notes

- The coutumier ceremony type is the primary market differentiator. It must be treated as a first-class Ceremony Type, not a custom label, with its own display name and translation.
- Mobile Money integration (Orange Money, MTN, Wave) is critical for the African market and must not be deferred to a post-MVP release.
- The self-registration link doubles as the RSVP mechanism for Guests who were not pre-imported. The same link should handle both first-time registration and returning Guests updating their RSVP, detected by whether the Guest record already exists for that email/phone.
- Planner calendar view must display Weddings with their Ceremony dates, not just the Wedding creation date — a Wedding can span several weeks if the coutumier and civil ceremonies are on different weekends.
