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
 * - Invoice / receipt (INVOICE)
 */

export type AppBarcodeType =
  | 'GUEST'
  | 'GROUP'
  | 'CAB'
  | 'DELIVERY'
  | 'SERVICE'
  | 'VISITOR'
  | 'RESIDENT'
  | 'AMENITY'
  | 'INVOICE';

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
  INVOICE: { label: 'Invoice / Receipt', icon: 'Receipt', badgeVariant: 'info' },
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
 *   1. All MMG invitation & invoice types: GUEST, GROUP, CAB, DELIVERY, SERVICE, AMENITY, RESIDENT, INVOICE.
 *   2. JSON payload: {"app":"ManageMyGate", "type":"...", "code":"...", ...}
 *   3. Direct pass code, invoice number, or booking reference fallback.
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
  if (/^MMG[:\-_]/i.test(raw)) {
    const withoutPrefix = raw.replace(/^MMG[:\-_]/i, '');
    const parts = withoutPrefix.split(':');
    if (parts.length >= 2) {
      let rawType = parts[0].toUpperCase().trim();
      if (rawType === 'VIS' || rawType === 'VISITOR') rawType = 'GUEST';
      if (rawType === 'STAFF') rawType = 'SERVICE';
      if (rawType === 'AUTO' || rawType === 'TAXI') rawType = 'CAB';
      if (rawType === 'RES') rawType = 'RESIDENT';
      if (rawType === 'INV' || rawType === 'BILL' || rawType === 'BILLING') rawType = 'INVOICE';

      const code = parts[1]?.trim();
      const rawId = parts[2]?.trim();
      const passId = rawId && /^[0-9a-fA-F]{24}$/.test(rawId) ? rawId : undefined;
      const rawName = parts.length > 3 ? parts.slice(3).join(' ').replace(/_/g, ' ').trim() : undefined;
      const meta = PASS_TYPE_META[rawType] || PASS_TYPE_META.GUEST;

      return {
        isValid: true,
        type: rawType as AppBarcodeType,
        typeLabel: meta?.label || 'Gate Pass',
        code,
        passId,
        visitorName: rawName,
      };
    }
  }

  // 2. JSON payload: {"app":"ManageMyGate", ...} or {"invoiceNumber": "...", ...}
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed.app === 'ManageMyGate' ||
        parsed.app === 'MMG' ||
        parsed.signature === 'MMG' ||
        parsed.appId === 'manage-my-gate' ||
        parsed.invoiceNumber ||
        parsed.invoiceId ||
        parsed.code ||
        parsed.passCode ||
        parsed.passId
      ) {
        let typeStr = (parsed.type || parsed.passType || (parsed.invoiceNumber ? 'INVOICE' : 'GUEST')).toUpperCase().trim();
        if (typeStr === 'VIS' || typeStr === 'VISITOR') typeStr = 'GUEST';
        if (typeStr === 'STAFF') typeStr = 'SERVICE';
        if (typeStr === 'AUTO' || typeStr === 'TAXI') typeStr = 'CAB';
        if (typeStr === 'INV' || typeStr === 'BILL' || typeStr === 'BILLING') typeStr = 'INVOICE';

        const code = String(
          parsed.invoiceNumber || parsed.invoiceNo || parsed.code || parsed.passCode || parsed.bookingId || ''
        );
        const parsedId = String(parsed.invoiceId || parsed.passId || parsed._id || parsed.id || '');
        const passId = /^[0-9a-fA-F]{24}$/.test(parsedId) ? parsedId : undefined;
        const visitorName = parsed.visitorName || parsed.residentName || parsed.name || undefined;
        const meta = PASS_TYPE_META[typeStr] || (typeStr === 'INVOICE' ? PASS_TYPE_META.INVOICE : PASS_TYPE_META.GUEST);

        return {
          isValid: true,
          type: typeStr as AppBarcodeType,
          typeLabel: meta?.label || 'Gate Pass',
          code: code || parsedId,
          passId,
          visitorName,
        };
      }
    } catch {
      // Invalid JSON format
    }
  }

  // 3. Direct pass code, invoice number, or booking reference (with or without #)
  // e.g. "849201", "PASS-849201", "INV-2026-0001", "#INV-2026-0001", "68b123456789012345678901", UUID
  const unhashed = raw.replace(/^#+/, '').trim();
  const isInvoiceFormat = /^INV[-_]?[a-zA-Z0-9_\-]+$/i.test(unhashed) || /^BILL[-_]?[a-zA-Z0-9_\-]+$/i.test(unhashed);
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(unhashed);
  const isPassFormat = /^(?:PASS[-_]?)?[a-zA-Z0-9]{4,36}$/i.test(unhashed);

  if (isInvoiceFormat || isUUID || isPassFormat) {
    const cleanCode = unhashed.replace(/^PASS[-_]?/i, '').trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanCode);
    const type: AppBarcodeType = isInvoiceFormat ? 'INVOICE' : 'GUEST';
    const typeLabel = isInvoiceFormat ? 'Invoice / Receipt' : 'Visitor Pass';

    return {
      isValid: true,
      type,
      typeLabel,
      code: cleanCode,
      passId: isObjectId ? cleanCode : undefined,
    };
  }

  // 4. URL format containing pass code or ID query parameter
  if (raw.includes('?') || raw.includes('/')) {
    let extracted = '';
    const match = raw.match(/[?&](?:code|token|passId|invoiceNumber|invoiceId|id)=([^&#]+)/i);
    if (match && match[1]) {
      extracted = decodeURIComponent(match[1]).trim();
    } else {
      const parts = raw.split('/');
      extracted = parts[parts.length - 1]?.split('?')[0] || '';
    }
    extracted = extracted.replace(/^[#]/, '').replace(/^PASS[-_]?/i, '').trim();
    if (extracted && /^[a-zA-Z0-9_\-]{4,36}$/.test(extracted)) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(extracted);
      const isInvoiceUrl = raw.toLowerCase().includes('invoice') || raw.toLowerCase().includes('billing') || /^INV[-_]?/i.test(extracted);
      const type: AppBarcodeType = isInvoiceUrl ? 'INVOICE' : 'GUEST';
      const typeLabel = isInvoiceUrl ? 'Invoice / Receipt' : 'Visitor Pass';

      return {
        isValid: true,
        type,
        typeLabel,
        code: extracted,
        passId: isObjectId ? extracted : undefined,
      };
    }
  }

  // 5. Strict Rejection of Foreign / External Barcodes
  return {
    isValid: false,
    errorMessage:
      'Unrecognized Barcode: Only passes generated by Manage-My-Gate are accepted.',
  };
}
