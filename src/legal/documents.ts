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
 * handling). They are not linked from the site footer.
 * The Data Processing Agreement is a template to be signed, so it is not
 * listed for schools (forSchools: false); the platform links to it.
 * Each is a Markdown file next to this one — edit the .md file to change
 * the page (and send the same file to counsel).
 */
export const LEGAL_DOCUMENTS = [
  { slug: 'privacy-policy', group: 'legal', title: 'Privacy Policy', source: privacyPolicy },
  { slug: 'student-data-privacy', group: 'legal', title: 'Student Data Privacy', source: studentDataPrivacy },
  { slug: 'terms-of-service', group: 'legal', title: 'Terms of Service', source: termsOfService },
  { slug: 'data-retention', group: 'trust', title: 'Data Retention & Deletion', source: dataRetention },
  { slug: 'security', group: 'trust', title: 'Security', source: security },
  { slug: 'incident-response', group: 'trust', title: 'Incident Response', source: incidentResponse },
  { slug: 'subprocessors', group: 'trust', title: 'Vendors & Subprocessors', source: subprocessors },
  { slug: 'data-processing-agreement', group: 'legal', forSchools: false, title: 'Data Processing Agreement', source: dataProcessingAgreement },
] as const;

export const COMPANY_NAME = 'GGHighTech LLC';

/** A document's "Last updated" (or "Version") date, read from its text. */
const updatedOf = (source: string) => /\*\*(?:Last updated|Version):\*\*\s*([^\n·]+)/.exec(source)?.[1].trim() ?? null;

/** What a school confirms it has read: every document with its date. */
export const SCHOOL_DOCUMENTS = LEGAL_DOCUMENTS.filter(doc => !('forSchools' in doc && doc.forSchools === false));
export const POLICY_DOCUMENTS = SCHOOL_DOCUMENTS.map(doc => ({ slug: doc.slug, title: doc.title, updated: updatedOf(doc.source) }));
/** Changes whenever a document's date changes, so schools are asked to confirm again. */
export const POLICIES_VERSION = POLICY_DOCUMENTS.map(doc => `${doc.slug}:${doc.updated ?? ''}`).join('|');
