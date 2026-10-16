import * as React from 'react';
import { Linking } from 'react-native';
import storage from '../utils/storage';
import apiClient from './apiClient';

const STORAGE_KEY = 'support_contact_email';

let supportEmail = '';
let loaded = false;
let inflight: Promise<string> | null = null;
const listeners = new Set<() => void>();

const setEmail = (value: string) => {
  const next = (value || '').trim();
  if (next === supportEmail) return;
  supportEmail = next;
  listeners.forEach((l) => l());
};

/**
 * Support contact address, managed by the platform admin (never hardcoded in the app).
 * Reads the last known value from storage first so it still works offline, then refreshes from the server.
 */
export const loadSupportEmail = (force = false): Promise<string> => {
  if (inflight) return inflight;
  if (loaded && !force) return Promise.resolve(supportEmail);
  inflight = (async () => {
    try {
      const cached = await storage.getItem(STORAGE_KEY);
      if (cached) setEmail(cached);
    } catch {}
    try {
      const res: any = await apiClient.get('/public/app/config');
      const config = res?.data || res || {};
      const fresh = typeof config.supportEmail === 'string' ? config.supportEmail : '';
      setEmail(fresh);
      try {
        if (fresh) await storage.setItem(STORAGE_KEY, fresh);
        else await storage.removeItem(STORAGE_KEY);
      } catch {}
    } catch {
      // Offline or server down: keep whatever we already had
    }
    loaded = true;
    return supportEmail;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
};

export const getSupportEmail = () => supportEmail;

/** Current support email ('' when the platform admin has not set one). Triggers a load on first use. */
export const useSupportEmail = () => {
  const email = React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSupportEmail,
    getSupportEmail
  );
  React.useEffect(() => {
    void loadSupportEmail();
  }, []);
  return email;
};

/** Opens the user's mail app addressed to the configured support email. Returns false if none is set. */
export const openSupportMail = async (subject: string, body: string): Promise<boolean> => {
  const to = supportEmail || (await loadSupportEmail());
  if (!to) return false;
  await Linking.openURL(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  return true;
};
