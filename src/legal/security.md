# Security Policy

> **Draft — pending legal review.** Items in [BRACKETS] must be confirmed before this document is relied on.

**Last updated:** October 1, 2026

This page describes how **GGHighTech LLC** protects School Drop-off & Pick-up (the "Service") and the information schools trust us with.

## Access control

- **Strict roles.** Parent, teacher, front desk, school administrator, district administrator and platform administrator each have separate permissions. The server checks them on every request; hiding a button is never the only protection.
  - Parents see only their own linked children.
  - Teachers see only their own class.
  - Front desk staff can view the administration pages but cannot change records or permissions.
  - District administrators can act only within their own district's schools.
- **School data isolation.** Every school's records carry a school identifier. The server rejects any attempt to reach another school's data, including by changing IDs or headers. Automated tests check this.
- **Suspension takes effect immediately.** A suspended or removed person is signed out on their next action and cannot sign back in.

## Sign-in security

- **Two-step verification** (authenticator app codes) is required for everyone who uses the administration pages. Teachers and parents can turn it on themselves. Authenticator secrets are encrypted in the database, and recovery codes are stored only as hashes.
- **Passwords** are stored only as salted scrypt hashes with a unique random salt per user, never in readable form.
- **Lockout:** repeated failed sign-ins lock that account name, and that network address, for 15 minutes. Five wrong two-step codes cancel the sign-in attempt.
- **Sessions** expire after 24 hours and can be ended by an administrator.

## Pickup verification

Releasing a child requires a **one-time 6-digit code** shown only on the phone of the adult who requested the pickup. Five wrong codes cancel the request. If the code can't be shown, only an administrator can release the child, and must record how the adult's identity was checked.

## Authorized adults

A parent can ask for another adult to be authorized, but that adult gets no access until a school administrator approves. Every request and decision is kept.

## Encryption

- **In transit:** the Service only works over HTTPS (TLS). Plain-HTTP connections are refused or redirected, and browsers are told to use HTTPS only (HSTS).
- **At rest:** authenticator secrets are encrypted by the application (AES-256-GCM). The database, its backups and file storage are encrypted at rest by our hosting provider. [CONFIRM with hosting provider: database volume and backup encryption.]
- **Browser protections:** security headers prevent the Service from being embedded in other sites and block scripts from other origins.

## Audit log

Sensitive actions are written to an **append-only audit log** that the database itself prevents anyone from editing or deleting. Each entry records who acted, their role, when, from which network address, and which student or person it concerned. Recorded actions include:

- sign-ins and failed sign-ins;
- viewing student lists and rosters;
- every drop-off and pickup decision;
- changes to pickup authorization and to student or staff records;
- exports and deletions.

School administrators can review their school's log.

## Location privacy

The app reads a device's location only when someone taps Drop Off or Pick Up, to check they are at the school. Coordinates are not stored and there is no background tracking.

## Data minimization and retention

We collect only what the Service needs. Schools can export and permanently delete records and set automatic retention periods. See the [Data Retention & Deletion Policy](/legal/data-retention).

## Infrastructure and operations

- Hosting: see [Vendors & Subprocessors](/legal/subprocessors).
- Backups: [CONFIRM backup frequency, retention period and restore testing.]
- Production access is limited to personnel who need it, with two-step verification on all administrative accounts. [CONFIRM internal access controls and review schedule.]
- Software dependencies are kept up to date. Changes to permissions and security features are covered by automated tests.
- Demonstration accounts are never created on production systems.

## Incidents

We have a documented process for suspected unauthorized access, compromised accounts and data breaches, including notifying affected schools. See [Incident Response](/legal/incident-response).

## Reporting a vulnerability

If you believe you've found a security issue, please contact us through the live chat on our website [coming soon] or at [SECURITY CONTACT EMAIL]. Please don't access other people's data or disrupt the Service while testing. We will acknowledge reports promptly and keep you informed.
