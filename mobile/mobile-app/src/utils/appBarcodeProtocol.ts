/**
 * Manage-My-Gate Application Barcode Protocol.
 * Encodes passes with a unique application signature and strictly validates
 * scanned barcodes across all invitation types:
 * - Guest pass (GUEST)
 * - Group visit (GROUP)
 * - Cab / Auto (CAB)
 * - Delivery (DELIVERY)
 * - Service / staff (SERVICE)
 * - Amenity booking (AMENITY)
 * - Resident pass (RESIDENT)
 */

export type AppBarcodeType =
  | 'GUEST'
  | 'GROUP'
  | 'CAB'
  | 'DELIVERY'
  | 'SERVICE'
  | 'VISITOR'
  | 'RESIDENT'
  | 'AMENITY';

export interface ValidatedAppBarcode {
  isValid: boolean;
  type?: AppBarcodeType;
  typeLabel?: string;
  code?: string;
  passId?: string;
  visitorName?: string;
  errorMessage?: string;
}

export const PASS_TYPE_META: Record<
  string,
  { label: string; icon: string; badgeVariant: 'default' | 'success' | 'warning' | 'info' | 'neutral' }
> = {
  GUEST: { label: 'Guest Pass', icon: 'UserCheck', badgeVariant: 'success' },
  GROUP: { label: 'Group Visit', icon: 'Users', badgeVariant: 'info' },
  CAB: { label: 'Cab / Auto', icon: 'Car', badgeVariant: 'warning' },
  DELIVERY: { label: 'Delivery', icon: 'Package', badgeVariant: 'default' },
  SERVICE: { label: 'Service / Staff', icon: 'Wrench', badgeVariant: 'neutral' },
  VISITOR: { label: 'Visitor Pass', icon: 'UserCheck', badgeVariant: 'success' },
  RESIDENT: { label: 'Resident Pass', icon: 'BadgeCheck', badgeVariant: 'info' },
  AMENITY: { label: 'Amenity Access', icon: 'Building2', badgeVariant: 'success' },
};

/**
 * Generates an application-standard barcode string for any pass type.
 * Format: MMG:{TYPE}:{CODE}[:{PASS_ID}][:{VISITOR_NAME}]
 */
export function encodeAppBarcode(
  type: AppBarcodeType | string,
  code: string,
  passId?: string,
  visitorName?: string
): string {
  const cleanType = (type || 'GUEST').toString().toUpperCase().trim();
  const cleanCode = (code || '').trim();
  const cleanId = (passId || '').trim();
  const cleanName = (visitorName || '').trim().replace(/\s+/g, '_');

  if (cleanName && cleanId) {
    return `MMG:${cleanType}:${cleanCode}:${cleanId}:${cleanName}`;
  }
  if (cleanName) {
    return `MMG:${cleanType}:${cleanCode}:${cleanCode}:${cleanName}`;
  }
  if (cleanId && cleanId !== cleanCode) {
    return `MMG:${cleanType}:${cleanCode}:${cleanId}`;
  }
  return `MMG:${cleanType}:${cleanCode}`;
}

/**
 * Validates whether a scanned barcode string originated from Manage-My-Gate.
 * Accepts:
 *   1. All MMG invitation types: GUEST, GROUP, CAB, DELIVERY, SERVICE, AMENITY, RESIDENT.
 *   2. JSON payload: {"app":"ManageMyGate", "type":"...", "visitorName":"...", ...}
 *   3. Manual 6-digit numeric PIN fallback entered into the manual bar.
 * Rejects:
 *   Any external/foreign barcode (supermarket EAN/UPC, URLs, random QR codes).
 */
export function parseAndValidateAppBarcode(scannedText: string): ValidatedAppBarcode {
  if (!scannedText || typeof scannedText !== 'string') {
    return {
      isValid: false,
      errorMessage: 'Empty or unreadable barcode.',
    };
  }

  const raw = scannedText.trim();

  // 1. Compact MMG protocol: MMG:{TYPE}:{CODE}[:{PASS_ID}][:{VISITOR_NAME}]
  const prefixMatch = raw.match(
    /^MMG[:\-_](GUEST|GROUP|CAB|DELIVERY|SERVICE|STAFF|AUTO|TAXI|VISITOR|RESIDENT|AMENITY|VIS|RES)[:\-_]([a-zA-Z0-9_\-]+)(?:[:\-_]([a-zA-Z0-9_\-]+))?(?:[:\-_]([a-zA-Z0-9_\-.]+))?$/i
  );
  if (prefixMatch) {
    let rawType = prefixMatch[1].toUpperCase();
    if (rawType === 'VIS' || rawType === 'VISITOR') rawType = 'GUEST';
    if (rawType === 'STAFF') rawType = 'SERVICE';
    if (rawType === 'AUTO' || rawType === 'TAXI') rawType = 'CAB';
    if (rawType === 'RES') rawType = 'RESIDENT';

    const code = prefixMatch[2];
    const passId = prefixMatch[3] || code;
    const rawName = prefixMatch[4] ? prefixMatch[4].replace(/_/g, ' ') : undefined;
    const meta = PASS_TYPE_META[rawType] || PASS_TYPE_META.GUEST;

    return {
      isValid: true,
      type: rawType as AppBarcodeType,
      typeLabel: meta.label,
      code,
      passId,
      visitorName: rawName,
    };
  }

  // 2. JSON payload: {"app":"ManageMyGate", ...}
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed.app === 'ManageMyGate' ||
        parsed.app === 'MMG' ||
        parsed.signature === 'MMG' ||
        parsed.appId === 'manage-my-gate'
      ) {
        let typeStr = (parsed.type || parsed.passType || 'GUEST').toUpperCase();
        if (typeStr === 'VIS' || typeStr === 'VISITOR') typeStr = 'GUEST';
        if (typeStr === 'STAFF') typeStr = 'SERVICE';
        if (typeStr === 'AUTO' || typeStr === 'TAXI') typeStr = 'CAB';

        const code = String(
          parsed.code || parsed.bookingId || parsed.passId || parsed._id || parsed.id || ''
        );
        const passId = String(parsed.passId || parsed.bookingId || parsed._id || code);
        const visitorName = parsed.visitorName || parsed.residentName || parsed.name || undefined;
        const meta = PASS_TYPE_META[typeStr] || PASS_TYPE_META.GUEST;

        return {
          isValid: true,
          type: typeStr as AppBarcodeType,
          typeLabel: meta.label,
          code,
          passId,
          visitorName,
        };
      }
    } catch {
      // Invalid JSON format
    }
  }

  // 3. Manual 6-digit numeric pass code fallback (e.g. guard types PIN)
  if (/^\d{6}$/.test(raw)) {
    return {
      isValid: true,
      type: 'GUEST',
      typeLabel: 'Guest Pass',
      code: raw,
      passId: raw,
    };
  }

  // 4. Strict Rejection of Foreign / External Barcodes
  return {
    isValid: false,
    errorMessage:
      'Unrecognized Barcode: Only passes generated by Manage-My-Gate are accepted.',
  };
}
