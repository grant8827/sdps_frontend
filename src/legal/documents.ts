import dataProcessingAgreement from './data-processing-agreement.md?raw';
import dataRetention from './data-retention.md?raw';
import incidentResponse from './incident-response.md?raw';
import privacyPolicy from './privacy-policy.md?raw';
import security from './security.md?raw';
import studentDataPrivacy from './student-data-privacy.md?raw';
import subprocessors from './subprocessors.md?raw';
import termsOfService from './terms-of-service.md?raw';

/**
 * The legal/policy pages, served at /legal/<slug> and all listed for
 * schools under the admin dashboard's Legal & Policies tab. `group` sorts
 * them there ('legal' = agreements, 'trust' = security and data
 * handling); `footer` marks the few also linked from the site footer.
 * Each is a Markdown file next to this one — edit the .md file to change
 * the page (and send the same file to counsel).
 */
export const LEGAL_DOCUMENTS = [
  { slug: 'privacy-policy', group: 'legal', footer: true, title: 'Privacy Policy', source: privacyPolicy },
  { slug: 'student-data-privacy', group: 'legal', footer: false, title: 'Student Data Privacy', source: studentDataPrivacy },
  { slug: 'terms-of-service', group: 'legal', footer: true, title: 'Terms of Service', source: termsOfService },
  { slug: 'data-retention', group: 'trust', footer: false, title: 'Data Retention & Deletion', source: dataRetention },
  { slug: 'security', group: 'trust', footer: true, title: 'Security', source: security },
  { slug: 'incident-response', group: 'trust', footer: false, title: 'Incident Response', source: incidentResponse },
  { slug: 'subprocessors', group: 'trust', footer: false, title: 'Vendors & Subprocessors', source: subprocessors },
  { slug: 'data-processing-agreement', group: 'legal', footer: false, title: 'Data Processing Agreement', source: dataProcessingAgreement },
] as const;

export const COMPANY_NAME = 'GGHighTech LLC';
