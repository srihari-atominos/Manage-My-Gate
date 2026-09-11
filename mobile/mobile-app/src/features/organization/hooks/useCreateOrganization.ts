import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { AppDispatch, RootState } from '../../../store/store';
import { organizationApi } from '../services/organizationApi';
import { createOrganization, clearCreateOrganizationState } from '../store/organizationSlice';
import { useTranslation } from '../../../utils/i18n';

/**
 * Module-level cache — survives component remounts (React Strict Mode, HMR, navigation).
 * Maps trimmed name → { available: boolean } so we never re-request a name we already checked.
 */
const _nameAvailabilityCache = new Map<string, boolean>();

/**
 * Module-level 429 cooldown — timestamp (ms) after which we're allowed to retry.
 * Set to now + retryAfterMs when a 429 is received. Resets naturally as time passes.
 */
let _rateLimitCooldownUntil = 0;


export const ORGANIZATION_TYPES = [
  { value: 'Residential', labelKey: 'residential', fallback: 'Residential' },
  { value: 'Commercial', labelKey: 'commercial', fallback: 'Commercial' },
  { value: 'Mixed', labelKey: 'mixed', fallback: 'Mixed' },
] as const;

export type OrganizationTypeValue = 'Residential' | 'Commercial' | 'Mixed';

export const createOrganizationSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .required('organization_name_required')
    .min(3, 'name_min_length')
    .max(100, 'name_max_length'),
  timezone: yup.string().default('Asia/Kolkata'),
});

export type CreateOrganizationFormValues = yup.InferType<typeof createOrganizationSchema>;

export type NameAvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export interface UseCreateOrganizationOptions {
  onSuccess?: (createdOrg: any) => void;
  redirectToFeatures?: boolean;
}

export const useCreateOrganization = (options?: UseCreateOrganizationOptions) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { t } = useTranslation();

  const { createLoading, createError, currentCreatedOrganization } = useSelector(
    (state: RootState) => state.organization || { createLoading: false, createError: null, currentCreatedOrganization: null }
  );

  const [availability, setAvailability] = useState<NameAvailabilityStatus>('idle');
  const [availabilityMessage, setAvailabilityMessage] = useState<string>('');

  const form = useForm<CreateOrganizationFormValues>({
    resolver: yupResolver(createOrganizationSchema) as any,
    defaultValues: {
      name: '',
      timezone: 'Asia/Kolkata',
    },
    mode: 'onChange',
  });

  const watchedName = form.watch('name');

  // Reset slice errors when component mounts/unmounts
  useEffect(() => {
    dispatch(clearCreateOrganizationState());
    return () => {
      dispatch(clearCreateOrganizationState());
    };
  }, [dispatch]);

  // 800ms debounced name availability check with module-level cache (survives remounts)
  useEffect(() => {
    const trimmed = (watchedName || '').trim();

    if (!trimmed || trimmed.length < 3) {
      setAvailability('idle');
      setAvailabilityMessage('');
      return;
    }

    // Serve from module-level cache if we already have a result for this name
    if (_nameAvailabilityCache.has(trimmed)) {
      const cached = _nameAvailabilityCache.get(trimmed)!;
      setAvailability(cached ? 'available' : 'taken');
      setAvailabilityMessage(
        cached
          ? t('name_available', 'Name is available')
          : t('name_unavailable', 'Organization name is already taken')
      );
      return;
    }

    // Block new requests while we're in a 429 cooldown window
    if (Date.now() < _rateLimitCooldownUntil) {
      setAvailability('idle');
      setAvailabilityMessage(t('too_many_requests', 'Too many requests. Please wait a moment.'));
      return;
    }

    setAvailability('checking');
    setAvailabilityMessage(t('checking_availability', 'Checking availability...'));

    const timer = setTimeout(async () => {
      // Re-check cache & cooldown inside the timer (debounce may have run while state changed)
      if (_nameAvailabilityCache.has(trimmed)) {
        const cached = _nameAvailabilityCache.get(trimmed)!;
        setAvailability(cached ? 'available' : 'taken');
        setAvailabilityMessage(
          cached
            ? t('name_available', 'Name is available')
            : t('name_unavailable', 'Organization name is already taken')
        );
        return;
      }
      if (Date.now() < _rateLimitCooldownUntil) {
        setAvailability('idle');
        setAvailabilityMessage(t('too_many_requests', 'Too many requests. Please wait a moment.'));
        return;
      }

      try {
        const response = await organizationApi.checkOrganizationName(trimmed);
        // response is the backend envelope: { success, message, data: { available } }
        const available = response?.data?.available ?? response?.available ?? false;

        // Cache the result at module level so remounts don't re-request
        _nameAvailabilityCache.set(trimmed, available);

        if (available) {
          setAvailability('available');
          setAvailabilityMessage(t('name_available', 'Name is available'));
        } else {
          setAvailability('taken');
          setAvailabilityMessage(t('name_unavailable', 'Organization name is already taken'));
        }
      } catch (err: any) {
        const status = err.response?.status;
        if (status === 429) {
          // Read Retry-After header (seconds) from backend, default 60s
          const retryAfter = parseInt(err.response?.headers?.['retry-after'] ?? '60', 10);
          _rateLimitCooldownUntil = Date.now() + retryAfter * 1000;
          // Stay idle — no state change that would re-trigger the effect
          setAvailability('idle');
          setAvailabilityMessage(t('too_many_requests', 'Too many requests. Please wait a moment.'));
        } else if (status === 400) {
          setAvailability('error');
          setAvailabilityMessage(err.response?.data?.message || t('invalid_name', 'Invalid organization name'));
        } else {
          // Network error, timeout, or any other failure — clear silently
          setAvailability('idle');
          setAvailabilityMessage('');
        }
      }
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedName]);

  const organizationTypeOptions = useMemo(() => {
    return ORGANIZATION_TYPES.map((type) => ({
      value: type.value,
      label: t(type.labelKey, type.fallback),
    }));
  }, [t]);

  const onSubmit = useCallback(
    async (values: CreateOrganizationFormValues) => {
      const trimmedName = values.name.trim();

      const resultAction = await dispatch(
        createOrganization({
          name: trimmedName,
          organizationType: 'Residential',
          timezone: values.timezone || 'Asia/Kolkata',
        })
      );

      if (createOrganization.fulfilled.match(resultAction)) {
        const createdOrg = resultAction.payload.organization;

        if (options?.onSuccess) {
          options.onSuccess(createdOrg);
          return;
        }

        // Standard onboarding flow: continue to feature configuration
        const targetOrgId = createdOrg?.id || createdOrg?._id;
        router.push({
          pathname: '/(auth)/select-features',
          params: {
            orgId: targetOrgId ? String(targetOrgId) : undefined,
            orgName: trimmedName,
            organizationType: 'Residential',
            timezone: values.timezone || 'Asia/Kolkata',
            intent: 'create-org',
          },
        });
      }
    },
    [dispatch, router, options]
  );

  const isSubmitDisabled =
    createLoading ||
    availability === 'checking' ||
    availability === 'taken' ||
    !watchedName ||
    watchedName.trim().length < 3 ||
    Object.keys(form.formState.errors).length > 0;

  return {
    form,
    availability,
    availabilityMessage,
    createLoading,
    createError,
    currentCreatedOrganization,
    organizationTypeOptions,
    isSubmitDisabled,
    onSubmit: form.handleSubmit(onSubmit),
  };
};

export default useCreateOrganization;
