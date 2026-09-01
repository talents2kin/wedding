# Wedding Guest Management Platform

A platform for managing wedding guests, invitations, and seating. Couples and planners use it to organise one or multiple weddings, covering all ceremony types (coutumier, civil, religieux) with per-ceremony guest lists, invitations, and seating plans.

## Language

### Events

**Wedding** (Mariage):
The top-level event representing a couple's wedding. Contains one or more Ceremonies. Created by either a Couple or a Planner.
_Avoid_: Event, function

**Ceremony** (Cérémonie):
A sub-event within a Wedding with a specific type (coutumier, civil, religieux, or custom), date, and venue. Has its own guest list, Seating Plan, and Invitations.
_Avoid_: Event, sub-event, occasion

**Ceremony Type**:
The category of a Ceremony — coutumier, civil, religieux, or a custom label defined by the organiser.

### People

**Couple**:
The pair getting married. Holds a Couple Account limited to one Wedding.
_Avoid_: Client, user, bride and groom

**Planner**:
A wedding organiser who manages multiple Weddings under a Planner Account.
_Avoid_: Organiser, coordinator, agent

**Guest** (Invité):
A person invited to one or more Ceremonies. Holds contact info, RSVP status per Ceremony, meal preference, and optional +1.
_Avoid_: Attendee, participant, invitee

**Team Member**:
A person invited to a Planner Account with a role (Admin, Editor, or Viewer) that applies across all of that planner's Weddings.
_Avoid_: Staff, assistant, sub-user

**Collaborator**:
A Couple or Planner invited to a specific Wedding with a role (Admin, Editor, or Viewer) scoped to that Wedding only.
_Avoid_: Co-organiser, shared user

### Guest Management

**Guest Group**:
A label applied to one or more Guests (e.g., Family, Friends, VIP, Côté marié). Used to filter Guests across invitations, tables, and reports.
_Avoid_: Tag, category, list

**RSVP**:
A Guest's attendance status for a specific Ceremony — confirmed, declined, or pending.
_Avoid_: Confirmation, response, attendance

**Self-registration**:
A flow where a Guest follows a link to submit their own data (name, contact, RSVP, meal preference, +1) without organiser intervention.
_Avoid_: Guest sign-up, self-invite

**+1** (Accompagnant):
An additional person brought by a Guest, captured at the Guest level.
_Avoid_: Plus-one, guest of guest, companion

### Invitations & Notifications

**Invitation**:
A digital (email/SMS/WhatsApp) or PDF artefact sent to a Guest for a specific Ceremony, built from a Template.
_Avoid_: Card, message, summons

**Template** (Modèle):
A platform-provided invitation design. Paid tiers can customise colours, fonts, and text.
_Avoid_: Theme, layout, design

**Notification**:
An email, SMS, or WhatsApp message sent to a Guest — may be an Invitation, an RSVP reminder, or an automated follow-up.
_Avoid_: Message, alert, communication

### Seating

**Seating Plan** (Plan de table):
The assignment of Guests to Tables for a specific Ceremony.
_Avoid_: Seating chart, table plan

**Table**:
A named seat grouping within a Seating Plan.
_Avoid_: Seat, group

**Check-in**:
The act of a staff member scanning a Guest's QR code at a Ceremony entrance to mark them as arrived.
_Avoid_: Attendance tracking, sign-in

### Accounts & Billing

**Couple Account**:
An account tied to a single Wedding. Subject to a guest cap and template limit on the free tier.
_Avoid_: Personal account, solo account

**Planner Account**:
An account that can hold multiple Weddings and invite Team Members. Available in tiers: Free (1 Wedding), Starter, Pro, Agency.
_Avoid_: Professional account, business account

**Subscription**:
The active plan on a Couple Account or Planner Account, governing feature limits and billing.
_Avoid_: Plan, licence, membership

**White-label**:
The ability for Pro and Agency Planners to fully replace platform branding on Invitations and Notification sender identity with their own agency branding. Co-branding (platform + agency logos) is a lesser form and is not what this platform offers.
_Avoid_: Co-branding, custom branding
