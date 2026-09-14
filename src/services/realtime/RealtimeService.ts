/**
 * Real-time transport abstraction, ported from mobile_app so both
 * clients depend on the same interface rather than a concrete client.
 * Swap `realtimeService` in `index.ts` for a Socket.io- or Firebase-
 * backed implementation once that architecture decision is made — no
 * screen code should need to change.
 */

export type RealtimeEventMap = {
  'queue:new-request': import('../../types').QueueItem;
  'queue:request-approved': { queueItemId: string; childId: string };
  'attendance:updated': import('../../types').AttendanceRecord;
  'notice:posted': import('../../types').Notice;
};

export type RealtimeEventName = keyof RealtimeEventMap;

export interface RealtimeService {
  connect(authToken: string): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;

  on<K extends RealtimeEventName>(
    event: K,
    handler: (payload: RealtimeEventMap[K]) => void,
  ): () => void; // returns an unsubscribe function

  emit<K extends RealtimeEventName>(
    event: K,
    payload: RealtimeEventMap[K],
  ): void;
}
