import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from '../components/SiteFooter';
import {
  ArrowRightIcon, BellIcon, BuildingIcon, CarIcon, CheckIcon, ClipboardIcon, KeyIcon, ListIcon, LockIcon, PhoneIcon,
  ShieldCheckIcon, UsersCheckIcon,
} from './icons';
import { PublicNavbar } from './PublicNavbar';

// Brand roles for the colored icon tiles: blue = action, green = done /
// safe, amber = waiting / attention, navy = trust.
type Tone = 'blue' | 'green' | 'amber' | 'navy';

const HIGHLIGHTS: { value: string; label: string }[] = [
  { value: '1 tap', label: 'to check in from the car line' },
  { value: '6-digit', label: 'one-time code at every pickup' },
  { value: 'Live', label: 'queue for teachers and the office' },
  { value: 'Every', label: 'release recorded in an audit log' },
];

const FEATURES: { icon: ReactNode; tone: Tone; title: string; body: string }[] = [
  { icon: <CarIcon />, tone: 'blue', title: 'Check in from the car line', body: "Parents tap Drop Off or Pick Up when they arrive. The app confirms they're at the school before the request is sent." },
  { icon: <KeyIcon />, tone: 'amber', title: 'Verified pickups', body: "Each pickup gets a one-time code on the parent's phone. The teacher enters it before releasing the child." },
  { icon: <ListIcon />, tone: 'blue', title: 'Live queue', body: 'Teachers see their class, the office sees the whole school. Confirm or decline in one tap.' },
  { icon: <ClipboardIcon />, tone: 'green', title: 'Attendance that keeps itself', body: 'An accepted drop-off marks the student present, and late arrivals are flagged automatically.' },
  { icon: <UsersCheckIcon />, tone: 'navy', title: 'Approved adults only', body: 'Parents can ask to add a grandparent or sitter. Nobody gets access until the school approves.' },
  { icon: <BellIcon />, tone: 'green', title: 'Messages that arrive', body: 'Notices from the school and teachers reach parents in the app and on the web, never in a backpack.' },
];

const STEPS = [
  { title: 'Arrive and tap', body: "The parent opens the app at the school and taps Drop Off or Pick Up. Location confirms they're on site." },
  { title: 'Show the code', body: 'For pickups, the parent shows the one-time code on their phone. It only works for this pickup.' },
  { title: 'Release and record', body: "The teacher confirms. Attendance updates, the parent's app updates, and the release is logged." },
];

const SAFETY = [
  'One-time pickup codes; an administrator ID check is the only override',
  'New adults need school approval before they see anything',
  'Two-step verification for every administrator',
  'A tamper-proof audit log of releases, record views and changes',
  "Each school's data is kept separate, and the school owns it",
  'No ads, no tracking, never sold',
];

const ROLES: { icon: ReactNode; tone: Tone; title: string; body: string; items: string[] }[] = [
  {
    icon: <PhoneIcon />, tone: 'blue', title: 'Parents',
    body: 'Check children in and out, see attendance and read school messages, from your phone or the web.',
    items: ['Drop-off and pick-up', 'Attendance by month', 'Add a trusted adult'],
  },
  {
    icon: <ClipboardIcon />, tone: 'green', title: 'Teachers',
    body: "Release students with confidence and keep the class roster current without extra paperwork.",
    items: ['Live queue with pickup codes', 'Class attendance', 'Message families'],
  },
  {
    icon: <BuildingIcon />, tone: 'navy', title: 'Administrators & districts',
    body: 'See every class, campus and school at a glance, with the controls and records you need.',
    items: ['School-wide queue and overview', 'Approvals and audit log', 'Multi-school district view'],
  },
];

/**
 * Public marketing home page — the front door for logged-out visitors.
 * The hero mockup on the right is built from real markup (not an image)
 * so it stays sharp and on-brand: the parent's pickup code above the
 * teacher's queue card that asks for it.
 */
export function HomePage() {
  return (
    <div className="public-page">
      <PublicNavbar />

      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <span className="home-eyebrow">Arrival · Attendance · Dismissal</span>
            <h1 className="hero-title home-hero-title">
              Safer school drop-off and pick-up, <span className="home-accent">from the car line to the classroom.</span>
            </h1>
            <p className="home-hero-subtitle">
              Parents check in from the car. Teachers release each child with a one-time code. Administrators see the whole school update live, with a record of every pickup.
            </p>
            <div className="home-hero-actions">
              <Link to="/register" className="btn btn-primary home-btn-lg">Register your school <ArrowRightIcon /></Link>
              <Link to="/login" className="btn home-btn-ghost home-btn-lg">Sign in</Link>
            </div>
            <ul className="home-trust-row">
              <li><CheckIcon size={16} /> Web, iPhone and Android</li>
              <li><CheckIcon size={16} /> Built for student privacy</li>
              <li><CheckIcon size={16} /> No ads, never sold</li>
            </ul>
          </div>

          <div className="home-mockup" aria-hidden>
            <div className="mock-phone">
              <div className="mock-phone-notch" />
              <p className="mock-label">Drop-off &amp; Pick-up</p>
              <div className="mock-card">
                <div className="mock-row">
                  <span className="mock-avatar">R</span>
                  <div className="mock-grow">
                    <strong>Riley Parker</strong><span>Grade 1 · Room 12</span>
                    <span className="mock-pill mock-pill-amber">Pick-up requested</span>
                  </div>
                </div>
                <div className="mock-code-box">
                  <span>Show this pickup code to the teacher</span>
                  <strong>482 913</strong>
                </div>
              </div>
              <div className="mock-card mock-card-dim">
                <div className="mock-row">
                  <span className="mock-avatar mock-avatar-green">S</span>
                  <div className="mock-grow">
                    <strong>Sam Parker</strong><span>Grade 1 · Room 12</span>
                    <span className="mock-pill mock-pill-green">Present</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mock-queue">
              <p className="mock-label">Teacher · Live queue</p>
              <div className="mock-row">
                <span className="mock-avatar">R</span>
                <div className="mock-grow"><strong>Riley Parker</strong><span>Parent: Parker P. · 2:58 PM</span></div>
              </div>
              <div className="mock-code-input">4 8 2 9 1 3</div>
              <div className="mock-actions">
                <span className="mock-btn mock-btn-blue">Confirm</span>
                <span className="mock-btn mock-btn-outline">Decline</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-highlights" aria-label="Highlights">
        {HIGHLIGHTS.map(item => (
          <div key={item.label} className="home-highlight">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section id="features" className="home-section">
        <div className="home-section-header">
          <span className="home-eyebrow">Features</span>
          <h2 className="section-title">Everything the car line needs</h2>
          <p className="home-section-subtitle">Built around the few minutes each morning and afternoon when getting it right matters most.</p>
        </div>
        <div className="home-features">
          {FEATURES.map(feature => (
            <article key={feature.title} className="home-feature">
              <span className={`home-icon-tile tone-${feature.tone}`}>{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="home-section home-section-soft">
        <div className="home-section-header">
          <span className="home-eyebrow">How it works</span>
          <h2 className="section-title">From arrival to release in a few taps</h2>
        </div>
        <ol className="home-steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="home-step">
              <span className="home-step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="safety" className="home-section">
        <div className="home-safety">
          <div>
            <span className="home-eyebrow">Safety &amp; privacy</span>
            <h2 className="section-title">Built for the trust a school asks of its families</h2>
            <p className="home-section-subtitle home-left">
              Releasing a child should never rely on someone simply being signed in. Every step is verified, approved and recorded, and the school stays in control of its data.
            </p>
            <div className="home-safety-links">
              <Link to="/legal/security">Security <ArrowRightIcon size={16} /></Link>
              <Link to="/legal/student-data-privacy">Student data privacy <ArrowRightIcon size={16} /></Link>
            </div>
          </div>
          <ul className="home-safety-list">
            {SAFETY.map(item => (
              <li key={item}>
                <span className="home-check"><ShieldCheckIcon /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="roles" className="home-section home-section-soft">
        <div className="home-section-header">
          <span className="home-eyebrow">Who it&apos;s for</span>
          <h2 className="section-title">One sign-in, the right view for every role</h2>
        </div>
        <div className="home-roles">
          {ROLES.map(role => (
            <article key={role.title} className="home-role">
              <span className={`home-icon-tile tone-${role.tone}`}>{role.icon}</span>
              <h3>{role.title}</h3>
              <p>{role.body}</p>
              <ul>
                {role.items.map(item => <li key={item}><CheckIcon size={16} /> {item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <div className="home-cta-inner">
          <span className="home-cta-icon"><LockIcon /></span>
          <h2>Ready to retire the paper sign-out sheet?</h2>
          <p>Set up your school in minutes. Parents, teachers and staff all sign in from the same place.</p>
          <div className="home-hero-actions home-center">
            <Link to="/register" className="btn home-btn-white home-btn-lg">Register your school <ArrowRightIcon /></Link>
            <Link to="/login" className="btn home-btn-outline-white home-btn-lg">Sign in</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
