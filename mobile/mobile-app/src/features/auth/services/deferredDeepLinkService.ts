import { Platform } from 'react-native';
import * as Application from 'expo-application';
import storage from '../../../utils/storage';

const PROCESSED_STORAGE_KEY = 'nahom_deferred_referrer_processed';

/**
 * Parses raw install referrer string to extract invitation token.
 * Supports:
 * - token=12345
 * - referrer=token%3D12345
 * - utm_source=invite&token=12345
 * - inviteToken=12345
 */
export function parseTokenFromReferrer(referrer: string): string | null {
  if (!referrer || typeof referrer !== 'string') return null;

  try {
    let decoded = referrer;
    // Decode if URL-encoded
    if (decoded.includes('%')) {
      try {
        decoded = decodeURIComponent(decoded);
      } catch (e) {
        // Continue with original if decodeURIComponent fails
      }
    }

    // Direct regex matches for token=... or inviteToken=...
    const directMatch = decoded.match(/(?:token|inviteToken|invite_token)=([a-zA-Z0-9_-]+)/i);
    if (directMatch && directMatch[1]) {
      return directMatch[1];
    }

    // Try parsing as query string
    const searchString = decoded.includes('?') ? decoded.split('?')[1] : decoded;
    const searchParams = new URLSearchParams(searchString);
    const token = searchParams.get('token') || searchParams.get('inviteToken') || searchParams.get('invite_token');
    if (token) return token;

    // Handle nested referrer=... parameter if present
    const nestedReferrer = searchParams.get('referrer');
    if (nestedReferrer) {
      return parseTokenFromReferrer(nestedReferrer);
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[DeferredDeepLink] Failed to parse referrer string:', err);
    }
  }

  return null;
}

/**
 * Parses raw install referrer string to extract mobile handoff identifier.
 * Supports:
 * - handoffId=12345
 * - referrer=handoffId%3D12345
 * - utm_source=invite&handoffId=12345
 * - handoff_id=12345
 */
export function parseHandoffIdFromReferrer(referrer: string): string | null {
  if (!referrer || typeof referrer !== 'string') return null;

  try {
    let decoded = referrer;
    if (decoded.includes('%')) {
      try {
        decoded = decodeURIComponent(decoded);
      } catch (e) {}
    }

    const directMatch = decoded.match(/(?:handoffId|handoff_id|handoff)=([a-zA-Z0-9_-]+)/i);
    if (directMatch && directMatch[1]) {
      return directMatch[1];
    }

    const searchString = decoded.includes('?') ? decoded.split('?')[1] : decoded;
    const searchParams = new URLSearchParams(searchString);
    const handoff = searchParams.get('handoffId') || searchParams.get('handoff_id') || searchParams.get('handoff');
    if (handoff) return handoff;

    const nestedReferrer = searchParams.get('referrer');
    if (nestedReferrer) {
      return parseHandoffIdFromReferrer(nestedReferrer);
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[DeferredDeepLink] Failed to parse handoffId from referrer:', err);
    }
  }

  return null;
}

/**
 * Checks Google Play Install Referrer on first app launch after installation.
 * Prioritizes handoff tickets (Phase 4 authenticated user recovery) over raw invitation tokens.
 * Enforces single execution via storage flag.
 */
export async function getDeferredHandoffContext(): Promise<{ type: 'handoff' | 'token'; value: string } | null> {
  // Only supported on Android
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    const alreadyProcessed = await storage.getItem(PROCESSED_STORAGE_KEY);
    if (alreadyProcessed === 'true') {
      return null;
    }

    await storage.setItem(PROCESSED_STORAGE_KEY, 'true');

    // Enforce 750ms safety timeout to prevent cold-launch blocking on sideloaded AAB or slow Play Store responses
    const rawReferrer = await Promise.race([
      Application.getInstallReferrerAsync(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 750)),
    ]);
    if (__DEV__) {
      console.log('[DeferredDeepLink] Raw Install Referrer:', rawReferrer);
    }

    if (!rawReferrer) {
      return null;
    }

    // 1. Check for Phase 4 handoff ticket first
    const handoffId = parseHandoffIdFromReferrer(rawReferrer);
    if (handoffId) {
      if (__DEV__) {
        console.log('[DeferredDeepLink] Recovered deferred handoff ID:', handoffId);
      }
      return { type: 'handoff', value: handoffId };
    }

    // 2. Check for invitation token fallback
    const token = parseTokenFromReferrer(rawReferrer);
    if (token) {
      if (__DEV__) {
        console.log('[DeferredDeepLink] Recovered deferred invitation token:', token);
      }
      return { type: 'token', value: token };
    }
  } catch (err: any) {
    if (__DEV__) {
      console.log('[DeferredDeepLink] Install Referrer query completed or skipped:', err?.message || err);
    }
  }

  return null;
}

/**
 * Checks Google Play Install Referrer on first app launch after installation.
 * Enforces single execution via storage flag.
 */
export async function getDeferredInvitationToken(): Promise<string | null> {
  const context = await getDeferredHandoffContext();
  return context?.value || null;
}

export default {
  parseTokenFromReferrer,
  parseHandoffIdFromReferrer,
  getDeferredHandoffContext,
  getDeferredInvitationToken,
};

