import { Firestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export type FirestoreEventMeta = {
  userId?: string | null;
  sessionId?: string | null;
  pagePath?: string;
  route?: string;
  userAgent?: string;
  eventType?: string;
  language?: string;
  source?: string;
  details?: Record<string, unknown> | null;
};

export async function logFirestoreEvent(
  firestore: Firestore,
  collectionName: string,
  eventData: Record<string, unknown>
) {
  try {
    await addDoc(collection(firestore, collectionName), {
      ...eventData,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Avoid crashing the user flow when analytics/logging fails.
    console.error(`Failed to write Firestore log to ${collectionName}:`, error);
  }
}

export function buildClientLogMeta(
  userId: string | null | undefined,
  pagePath: string,
  route: string,
  userAgent: string,
  sessionId?: string | null
): FirestoreEventMeta {
  return {
    userId: userId ?? null,
    sessionId: sessionId ?? userId ?? null,
    pagePath,
    route,
    userAgent,
  };
}
