import dataProcessingAgreement from './data-processing-agreement.md?raw';
import dataRetention from './data-retention.md?raw';
import incidentResponse from './incident-response.md?raw';
import privacyPolicy from './privacy-policy.md?raw';
import security from './security.md?raw';
import studentDataPrivacy from './student-data-privacy.md?raw';
import subprocessors from './subprocessors.md?raw';
import termsOfService from './terms-of-service.md?raw';

/**
 * The legal/policy pages linked from the site footer, served at
 * /legal/<slug>. Each is a Markdown file next to this one — edit the
 * .md file to change the page (and send the same file to counsel).
 */
export const LEGAL_DOCUMENTS = [
  { slug: 'privacy-policy', title: 'Privacy Policy', source: privacyPolicy },
  { slug: 'student-data-privacy', title: 'Student Data Privacy', source: studentDataPrivacy },
  { slug: 'terms-of-service', title: 'Terms of Service', source: termsOfService },
  { slug: 'data-retention', title: 'Data Retention & Deletion', source: dataRetention },
  { slug: 'security', title: 'Security', source: security },
  { slug: 'incident-response', title: 'Incident Response', source: incidentResponse },
  { slug: 'subprocessors', title: 'Vendors & Subprocessors', source: subprocessors },
  { slug: 'data-processing-agreement', title: 'Data Processing Agreement', source: dataProcessingAgreement },
] as const;

export const COMPANY_NAME = 'GGHighTech LLC';
