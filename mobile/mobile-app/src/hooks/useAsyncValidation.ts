import { useState, useRef, useCallback, useEffect } from 'react';
import { ValidationStatus, ValidationResult } from '../utils/validation';

export interface UseAsyncValidationOptions<T = any> {
  validateFn: (value: string, signal?: { aborted: boolean }) => Promise<ValidationResult>;
  debounceMs?: number;
  minChars?: number;
  initialValue?: string;
  onSuccess?: (result: ValidationResult) => void;
  onError?: (error: any) => void;
}

export function useAsyncValidation<T = any>({
  validateFn,
  debounceMs = 400,
  minChars = 3,
  initialValue = '',
}: UseAsyncValidationOptions<T>) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const timerRef = useRef<any>(null);
  const sequenceRef = useRef<number>(0);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    sequenceRef.current += 1;
    setValue('');
    setStatus('idle');
    setMessage(undefined);
    setIsValid(false);
    setIsChecking(false);
  }, []);

  const runValidation = useCallback(
    async (inputValue: string, currentSeq: number) => {
      const signal = { aborted: false };
      setIsChecking(true);
      setStatus('validating');
      setMessage('Checking availability...');

      try {
        const result = await validateFn(inputValue, signal);

        // Guard against race conditions: Ignore response if a newer keystroke has occurred
        if (currentSeq !== sequenceRef.current) {
          return;
        }

        setStatus(result.status);
        setMessage(result.message);
        setIsValid(result.isValid);
      } catch (err: any) {
        if (currentSeq !== sequenceRef.current) return;
        setStatus('invalid');
        setMessage(err?.message || 'Verification failed. Please try again.');
        setIsValid(false);
      } finally {
        if (currentSeq === sequenceRef.current) {
          setIsChecking(false);
        }
      }
    },
    [validateFn]
  );

  const triggerValidation = useCallback(
    (nextValue: string, localSyncCheck?: () => ValidationResult | null) => {
      setValue(nextValue);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const seq = ++sequenceRef.current;

      if (!nextValue || !nextValue.trim()) {
        setStatus('idle');
        setMessage(undefined);
        setIsValid(false);
        setIsChecking(false);
        return;
      }

      // If local sync check provided (e.g. check incomplete email format before hitting API)
      if (localSyncCheck) {
        const syncRes = localSyncCheck();
        if (syncRes) {
          if (!syncRes.isValid) {
            setStatus(syncRes.status);
            setMessage(syncRes.message);
            setIsValid(false);
            setIsChecking(false);
            return;
          }
        }
      }

      if (nextValue.trim().length < minChars) {
        setStatus('incomplete');
        setMessage(undefined);
        setIsValid(false);
        setIsChecking(false);
        return;
      }

      // Schedule debounced async validation
      setIsChecking(true);
      setStatus('validating');
      setMessage('Checking...');

      timerRef.current = setTimeout(() => {
        runValidation(nextValue.trim(), seq);
      }, debounceMs);
    },
    [debounceMs, minChars, runValidation]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    value,
    setValue,
    status,
    message,
    isValid,
    isChecking,
    triggerValidation,
    reset,
    setStatus,
    setMessage,
    setIsValid,
  };
}
