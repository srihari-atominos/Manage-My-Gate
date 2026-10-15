import React, { useState, useCallback } from 'react';
import { SuccessToast } from '@/components/feedback/SuccessToast';

/** Short "saved / removed" confirmation shown over the top of a staff screen. */
export function useStaffToast() {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((text: string) => setMessage(text), []);
  const dismiss = useCallback(() => setMessage(null), []);

  const toastNode = message ? (
    <SuccessToast
      message={message}
      onDismiss={dismiss}
      className="absolute top-2 left-4 right-4 z-50"
    />
  ) : null;

  return { showToast, toastNode };
}

export default useStaffToast;
