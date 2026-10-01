# Incident Response

> **Draft — pending legal review.** Notification deadlines and legal references must be confirmed by an attorney before this document is relied on. Items in [BRACKETS] must be completed.

**Last updated:** October 1, 2026

This page describes how **GGHighTech LLC** responds to security incidents affecting School Drop-off & Pick-up (the "Service"), and what schools and families can expect from us.

## What counts as an incident

- **Unauthorized access** — someone viewing or changing data they are not entitled to, including another school's data.
- **Compromised account** — a password, authenticator or device in the wrong hands, or a pickup released to an unauthorized adult.
- **Data breach** — unauthorized acquisition of personal information, including student information.
- **Service disruption** that affects children's safety, for example an outage during dismissal.

## How we respond

1. **Detect and report.** Incidents can come from monitoring, the audit log, a school, a parent or a security researcher. Anyone can report one through our live chat [coming soon] or at [SECURITY CONTACT EMAIL]. School staff should also follow their own school's procedures.
2. **Triage (within [X] hours).** An incident lead confirms what happened, which schools and people may be affected, and how serious it is.
3. **Contain.** Depending on the incident, we may do any of the following:
   - suspend the affected accounts and sign them out everywhere;
   - reset two-step verification;
   - cancel pending pickups;
   - rotate credentials and keys;
   - block network addresses;
   - temporarily disable a feature.
4. **Investigate.** We use the append-only audit log, which records sign-ins, failed sign-ins, record views, pickups and changes. Together with server and hosting logs, it tells us exactly what was accessed and by whom.
5. **Notify** (see below).
6. **Recover.** We fix the cause, restore from backups if needed, and confirm the Service is safe to use.
7. **Review.** Within [X] days we write a post-incident report covering the root cause, timeline, impact and the changes made to prevent it from happening again. We share it with affected schools.

## Notifying schools and families

- **Schools first.** For incidents involving a school's data, we notify the school's administrators **without unreasonable delay, and no later than [X — e.g. 72 hours / 10 days]** after we determine an incident occurred. [ATTORNEY: under Florida's Information Protection Act, s. 501.171, F.S., a third-party agent must notify the covered entity within 10 days of determining a breach; school contracts often require faster notice.]
- **What we tell the school:**
  - what happened and when;
  - what information and which students or people were involved;
  - what we have done;
  - what the school should do;
  - who to contact.
- **Families and individuals.** The school, as owner of the records, normally decides how families are notified, and we provide the information and support it needs. Where the law requires notice to individuals or regulators, we make sure it is given. [ATTORNEY: confirm roles; s. 501.171 requires notice to individuals within 30 days, and to the Florida Department of Legal Affairs when 500 or more Florida residents are affected.]
- **Law enforcement.** Notification may be delayed only if law enforcement requests it, and only for as long as requested.

## What schools can do right away

- **Suspend a person** in Faculty or Families. They are signed out immediately and cannot sign back in.
- **Reset a staff member's two-step verification** from Faculty.
- **Decline or cancel pending requests** in the Live Queue.
- **Review the Audit Log**, filtered by action, to see who did what and when.
- Contact us through the live chat [coming soon] or at [SECURITY CONTACT EMAIL].

## Records

We keep a record of every incident: what happened, the decisions taken and the notifications sent. We keep these records for [X] years. [CONFIRM]
