import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type PolicyAcknowledgment } from '../services/api';
import { POLICIES_VERSION } from '../legal/documents';

/**
 * The school's latest confirmation that it read the Legal & Policies
 * documents. `current` is true when it covers today's versions;
 * undefined while loading (or if it couldn't be loaded).
 */
export function usePolicyAcknowledgment(refreshKey?: unknown) {
  const { token } = useAuth();
  const [acknowledgment, setAcknowledgment] = useState<PolicyAcknowledgment | null | undefined>(undefined);
  const reload = useCallback(() => {
    if (!token) return;
    api.policyAcknowledgment(token).then(result => setAcknowledgment(result.acknowledgment)).catch(() => {});
  }, [token]);
  useEffect(() => { reload(); }, [reload, refreshKey]);
  const current = acknowledgment === undefined ? undefined : acknowledgment?.version === POLICIES_VERSION;
  return { acknowledgment, current, setAcknowledgment, reload };
}
