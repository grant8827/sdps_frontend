import { Link } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';

const FEATURES = [
  {
    icon: '🚗',
    title: 'Tap to check in',
    body: "Alert your child's teacher the moment you're in the lane — no more waiting on a paper sign-in sheet.",
  },
  {
    icon: '✅',
    title: 'Live attendance',
    body: 'Drop-offs and pick-ups sync to the class roster instantly, so everyone sees the same status in real time.',
  },
  {
    icon: '🔔',
    title: 'Stay in the loop',
    body: 'Messages from the school and teachers land right on your phone or in your browser — never a missed slip.',
  },
  {
    icon: '📊',
    title: 'One dashboard per role',
    body: 'Parents, teachers, and admins each get a home screen built for exactly what they need to do that morning.',
  },
];

const STEPS = [
  {
    step: '1',
    title: 'Sign in',
    body: 'Parents, teachers, and admins all sign in from the same screen — the app routes you to your dashboard automatically.',
  },
  {
    step: '2',
    title: 'Request or review',
    body: 'A parent taps Drop Off or Pick Up; the request lands instantly, highlighted green, on the teacher\'s live queue.',
  },
  {
    step: '3',
    title: 'Approve & sync',
    body: 'One approval marks attendance and updates the parent\'s app — no extra steps, no double data entry.',
  },
];

const ROLES = [
  {
    icon: '👪',
    title: 'Parents',
    body: 'Check kids in and out, see this week\'s attendance, and read messages from the school and homeroom.',
    items: ['Drop-off & pick-up', 'Class & attendance', 'Messages'],
  },
  {
    icon: '🍎',
    title: 'Teachers',
    body: 'Approve requests the moment they land, keep the class roster current, and message parents directly.',
    items: ['Live queue', 'Class roster', 'Compose messages'],
  },
  {
    icon: '🏫',
    title: 'Admins',
    body: 'See the whole school at a glance and manage faculty, families, and school-wide announcements.',
    items: ['Overview', 'Faculty & families', 'Broadcast'],
  },
];

/**
 * Public marketing home page — the front door for logged-out visitors
 * on the web. It mirrors the pitch already used on the app's login
 * screen (see mobile_app/src/screens/auth/LoginScreen and this repo's
 * screens/auth/LoginScreen) so the website and the app tell the same
 * story before either asks you to sign in.
 */
export function HomePage() {
  return (
    <div className="public-page">
      <PublicNavbar />

      <section className="hero">
        <div className="hero-inner">
          <p className="hero-eyebrow">For parents, teachers &amp; school staff</p>
          <h1 className="hero-title">
            Faster, safer drop-offs and pick-ups — for your whole school.
          </h1>
          <p className="hero-subtitle">
            One app, one website, one shared live queue. Parents check in from the car line,
            teachers approve with a tap, and admins see it all update in real time.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary">Get Started</Link>
            <a href="#features" className="btn btn-secondary">See how it works</a>
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="section-header">
          <p className="section-eyebrow">Features</p>
          <h2 className="section-title">Everything a car-line morning needs</h2>
          <p className="section-subtitle">
            Built for the moments that actually matter at drop-off and pick-up.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map(feature => (
            <div key={feature.title} className="feature-card">
              <span className="feature-card-icon">{feature.icon}</span>
              <h3 className="quick-action-title">{feature.title}</h3>
              <p className="quick-action-subtitle">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="section section-alt">
        <div className="section-header">
          <p className="section-eyebrow">How it works</p>
          <h2 className="section-title">Three taps, start to finish</h2>
        </div>
        <div className="steps-grid">
          {STEPS.map(step => (
            <div key={step.step} className="step-card">
              <span className="step-number">{step.step}</span>
              <h3 className="quick-action-title">{step.title}</h3>
              <p className="quick-action-subtitle">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="roles" className="section">
        <div className="section-header">
          <p className="section-eyebrow">Who it&apos;s for</p>
          <h2 className="section-title">Built for every role in the school</h2>
          <p className="section-subtitle">
            Sign in once — you land on the dashboard built for your role.
          </p>
        </div>
        <div className="roles-grid">
          {ROLES.map(role => (
            <div key={role.title} className="role-card">
              <span className="feature-card-icon">{role.icon}</span>
              <h3 className="quick-action-title" style={{ fontSize: 18 }}>{role.title}</h3>
              <p className="quick-action-subtitle">{role.body}</p>
              <ul className="role-card-list">
                {role.items.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link to="/login" className="role-card-cta">Sign in as {role.title.slice(0, -1)} →</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-banner">
        <h2 className="section-title" style={{ color: '#fff' }}>Ready to skip the paper sign-in sheet?</h2>
        <p className="section-subtitle" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Parent, Teacher, and Admin accounts all sign in from the same place.
        </p>
        <Link to="/register" className="btn btn-block-inverse">Get Started</Link>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="topbar-brand">
            <span className="topbar-badge">🏫</span>
            <span>School Drop-off &amp; Pick-up</span>
          </div>
          <p className="footer-copy">
            © {new Date().getFullYear()} School Drop-off &amp; Pick-up. Also available as a mobile app.
          </p>
        </div>
      </footer>
    </div>
  );
}
