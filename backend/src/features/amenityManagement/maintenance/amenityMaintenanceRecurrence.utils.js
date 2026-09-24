import moment from 'moment-timezone';
import HttpError from '../../../utils/httpError.utils.js';
import { computeEffectiveMaintenanceWindow } from './amenityMaintenanceBlock.model.js';

export const MAX_RECURRENCE_OCCURRENCES = parseInt(
  process.env.MAX_RECURRENCE_OCCURRENCES || '60',
  10
);

export const VALID_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'];

/**
 * Validates recurrence configuration and base maintenance window.
 * Enforces finite termination, positive interval, valid daysOfWeek, and valid IANA timezone.
 *
 * @param {Object} recurrence
 * @param {Object} baseWindow
 * @returns {Object} Normalized recurrence configuration
 */
export function validateRecurrenceConfig(recurrence, baseWindow = {}) {
  if (!recurrence || typeof recurrence !== 'object') {
    throw new HttpError(400, 'recurrence configuration object is required');
  }

  const {
    frequency,
    interval = 1,
    daysOfWeek,
    dayOfMonth,
    startDate,
    endDate,
    occurrenceCount,
    timezone = 'Asia/Kolkata',
  } = recurrence;

  // 1. Frequency validation
  if (!frequency || !VALID_FREQUENCIES.includes(frequency)) {
    throw new HttpError(
      400,
      `Invalid recurrence frequency: ${frequency}. Must be one of: ${VALID_FREQUENCIES.join(', ')}`
    );
  }

  // 2. Interval validation
  const numInterval = parseInt(interval, 10);
  if (isNaN(numInterval) || numInterval < 1) {
    throw new HttpError(400, 'Recurrence interval must be an integer >= 1');
  }

  // 3. Timezone validation
  if (!timezone || typeof timezone !== 'string' || !moment.tz.zone(timezone)) {
    throw new HttpError(400, `Invalid IANA timezone: ${timezone}`);
  }

  // 4. Start date validation
  const effectiveStartDate = startDate || baseWindow?.startDateTime;
  if (!effectiveStartDate) {
    throw new HttpError(400, 'recurrence.startDate or startDateTime is required');
  }
  const startMoment = moment.tz(effectiveStartDate, timezone);
  if (!startMoment.isValid()) {
    throw new HttpError(400, 'recurrence.startDate must be a valid ISO8601 date');
  }

  // 5. Termination validation: at least one finite termination condition required
  if (!endDate && !occurrenceCount) {
    throw new HttpError(
      400,
      'Recurrence requires a finite termination condition: provide either endDate or occurrenceCount'
    );
  }

  let endMoment = null;
  if (endDate) {
    endMoment = moment.tz(endDate, timezone);
    if (!endMoment.isValid()) {
      throw new HttpError(400, 'recurrence.endDate must be a valid ISO8601 date');
    }
    if (endMoment.isBefore(startMoment)) {
      throw new HttpError(400, 'recurrence.endDate cannot be earlier than recurrence.startDate');
    }
  }

  let numOccurrenceCount = null;
  if (occurrenceCount !== undefined && occurrenceCount !== null) {
    numOccurrenceCount = parseInt(occurrenceCount, 10);
    if (isNaN(numOccurrenceCount) || numOccurrenceCount < 1) {
      throw new HttpError(400, 'recurrence.occurrenceCount must be an integer >= 1');
    }
    if (numOccurrenceCount > MAX_RECURRENCE_OCCURRENCES) {
      throw new HttpError(400, `recurrence.occurrenceCount cannot exceed ${MAX_RECURRENCE_OCCURRENCES}`);
    }
  }

  // 6. Frequency-specific validation
  let normalizedDaysOfWeek = [];
  if (frequency === 'WEEKLY' || frequency === 'CUSTOM') {
    if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
      for (const d of daysOfWeek) {
        const numD = parseInt(d, 10);
        if (isNaN(numD) || numD < 0 || numD > 6) {
          throw new HttpError(400, `Invalid dayOfWeek: ${d}. Must be between 0 (Sunday) and 6 (Saturday)`);
        }
        normalizedDaysOfWeek.push(numD);
      }
      normalizedDaysOfWeek = [...new Set(normalizedDaysOfWeek)].sort((a, b) => a - b);
    } else {
      // Default to day of week of startDate
      normalizedDaysOfWeek = [startMoment.day()];
    }
  }

  let normalizedDayOfMonth = null;
  if (frequency === 'MONTHLY') {
    if (dayOfMonth !== undefined && dayOfMonth !== null) {
      normalizedDayOfMonth = parseInt(dayOfMonth, 10);
      if (isNaN(normalizedDayOfMonth) || normalizedDayOfMonth < 1 || normalizedDayOfMonth > 31) {
        throw new HttpError(400, 'recurrence.dayOfMonth must be between 1 and 31');
      }
    } else {
      normalizedDayOfMonth = startMoment.date();
    }
  }

  // 7. Base window validation
  const { startDateTime, endDateTime, bufferBeforeMinutes = 0, bufferAfterMinutes = 0 } = baseWindow;
  if (startDateTime && endDateTime) {
    const bStart = new Date(startDateTime);
    const bEnd = new Date(endDateTime);
    if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime()) || bStart >= bEnd) {
      throw new HttpError(400, 'Invalid base maintenance window: endDateTime must be later than startDateTime');
    }
    if (bufferBeforeMinutes < 0 || bufferAfterMinutes < 0) {
      throw new HttpError(400, 'Buffer minutes cannot be negative');
    }
  }

  return {
    frequency,
    interval: numInterval,
    daysOfWeek: normalizedDaysOfWeek,
    dayOfMonth: normalizedDayOfMonth,
    startDate: startMoment.toDate(),
    endDate: endMoment ? endMoment.toDate() : null,
    occurrenceCount: numOccurrenceCount,
    timezone,
  };
}

/**
 * Deterministically generates occurrences based on recurrence definition and base window.
 * Preserves local wall-clock times across occurrences and handles DST/timezones safely.
 * Bounded by termination condition and MAX_RECURRENCE_OCCURRENCES.
 *
 * @param {Object} params
 * @param {Object} params.recurrence
 * @param {Date|string} params.startDateTime
 * @param {Date|string} params.endDateTime
 * @param {number} [params.bufferBeforeMinutes=0]
 * @param {number} [params.bufferAfterMinutes=0]
 * @param {number} [params.maxLimit=MAX_RECURRENCE_OCCURRENCES]
 * @returns {Array<Object>} Generated occurrences
 */
export function generateOccurrences({
  recurrence,
  startDateTime,
  endDateTime,
  bufferBeforeMinutes = 0,
  bufferAfterMinutes = 0,
  maxLimit = MAX_RECURRENCE_OCCURRENCES,
}) {
  const normRecurrence = validateRecurrenceConfig(recurrence, {
    startDateTime,
    endDateTime,
    bufferBeforeMinutes,
    bufferAfterMinutes,
  });

  const {
    frequency,
    interval,
    daysOfWeek,
    dayOfMonth,
    startDate,
    endDate,
    occurrenceCount,
    timezone,
  } = normRecurrence;

  const baseStart = new Date(startDateTime);
  const baseEnd = new Date(endDateTime);
  const durationMs = baseEnd.getTime() - baseStart.getTime();

  // Extract wall-clock hour, minute, second in target timezone
  const baseM = moment(baseStart).tz(timezone);
  const startHour = baseM.hour();
  const startMinute = baseM.minute();
  const startSecond = baseM.second();

  const maxCount = occurrenceCount
    ? Math.min(occurrenceCount, maxLimit)
    : maxLimit;

  const endMoment = endDate ? moment(endDate).tz(timezone).endOf('day') : null;
  const startMoment = moment(startDate).tz(timezone).startOf('day');

  const occurrences = [];
  let safetyCounter = 0;
  const maxIterations = maxLimit * 120; // Safe loop bound

  if (frequency === 'DAILY') {
    let curr = startMoment.clone();
    while (occurrences.length < maxCount && safetyCounter++ < maxIterations) {
      const candidateStart = curr
        .clone()
        .hour(startHour)
        .minute(startMinute)
        .second(startSecond)
        .millisecond(0);

      if (endMoment && candidateStart.isAfter(endMoment)) {
        break;
      }

      const occStart = candidateStart.toDate();
      const occEnd = new Date(occStart.getTime() + durationMs);
      const { effectiveStart, effectiveEnd } = computeEffectiveMaintenanceWindow(
        occStart,
        occEnd,
        bufferBeforeMinutes,
        bufferAfterMinutes
      );

      occurrences.push({
        occurrenceIndex: occurrences.length,
        startDateTime: occStart,
        endDateTime: occEnd,
        effectiveStartDateTime: effectiveStart,
        effectiveEndDateTime: effectiveEnd,
      });

      curr.add(interval, 'days');
    }
  } else if (frequency === 'WEEKLY' || frequency === 'CUSTOM') {
    // Determine week start of startDate
    let currWeekStart = startMoment.clone().startOf('week'); // Sunday in moment
    const targetDays = daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : [startMoment.day()];

    while (occurrences.length < maxCount && safetyCounter++ < maxIterations) {
      for (const day of targetDays) {
        if (occurrences.length >= maxCount) break;

        const candidateDate = currWeekStart.clone().day(day);

        // Skip candidate days that are strictly before startDate
        if (candidateDate.isBefore(startMoment, 'day')) {
          continue;
        }

        const candidateStart = candidateDate
          .clone()
          .hour(startHour)
          .minute(startMinute)
          .second(startSecond)
          .millisecond(0);

        if (endMoment && candidateStart.isAfter(endMoment)) {
          break;
        }

        const occStart = candidateStart.toDate();
        const occEnd = new Date(occStart.getTime() + durationMs);
        const { effectiveStart, effectiveEnd } = computeEffectiveMaintenanceWindow(
          occStart,
          occEnd,
          bufferBeforeMinutes,
          bufferAfterMinutes
        );

        occurrences.push({
          occurrenceIndex: occurrences.length,
          startDateTime: occStart,
          endDateTime: occEnd,
          effectiveStartDateTime: effectiveStart,
          effectiveEndDateTime: effectiveEnd,
        });
      }

      if (endMoment && currWeekStart.clone().add(interval, 'weeks').startOf('week').isAfter(endMoment)) {
        break;
      }

      currWeekStart.add(interval, 'weeks');
    }
  } else if (frequency === 'MONTHLY') {
    let currMonth = startMoment.clone().startOf('month');
    const targetDay = dayOfMonth || startMoment.date();

    while (occurrences.length < maxCount && safetyCounter++ < maxIterations) {
      const daysInCurrMonth = currMonth.daysInMonth();
      const actualDay = Math.min(targetDay, daysInCurrMonth);
      const candidateDate = currMonth.clone().date(actualDay);

      if (!candidateDate.isBefore(startMoment, 'day')) {
        const candidateStart = candidateDate
          .clone()
          .hour(startHour)
          .minute(startMinute)
          .second(startSecond)
          .millisecond(0);

        if (endMoment && candidateStart.isAfter(endMoment)) {
          break;
        }

        const occStart = candidateStart.toDate();
        const occEnd = new Date(occStart.getTime() + durationMs);
        const { effectiveStart, effectiveEnd } = computeEffectiveMaintenanceWindow(
          occStart,
          occEnd,
          bufferBeforeMinutes,
          bufferAfterMinutes
        );

        occurrences.push({
          occurrenceIndex: occurrences.length,
          startDateTime: occStart,
          endDateTime: occEnd,
          effectiveStartDateTime: effectiveStart,
          effectiveEndDateTime: effectiveEnd,
        });
      }

      currMonth.add(interval, 'months');
    }
  } else if (frequency === 'YEARLY') {
    let currYear = startMoment.clone();
    const targetMonth = startMoment.month();
    const targetDay = startMoment.date();

    while (occurrences.length < maxCount && safetyCounter++ < maxIterations) {
      // Clamps Feb 29 for non-leap years automatically via moment
      const candidateDate = currYear.clone().month(targetMonth).date(targetDay);

      if (!candidateDate.isBefore(startMoment, 'day')) {
        const candidateStart = candidateDate
          .clone()
          .hour(startHour)
          .minute(startMinute)
          .second(startSecond)
          .millisecond(0);

        if (endMoment && candidateStart.isAfter(endMoment)) {
          break;
        }

        const occStart = candidateStart.toDate();
        const occEnd = new Date(occStart.getTime() + durationMs);
        const { effectiveStart, effectiveEnd } = computeEffectiveMaintenanceWindow(
          occStart,
          occEnd,
          bufferBeforeMinutes,
          bufferAfterMinutes
        );

        occurrences.push({
          occurrenceIndex: occurrences.length,
          startDateTime: occStart,
          endDateTime: occEnd,
          effectiveStartDateTime: effectiveStart,
          effectiveEndDateTime: effectiveEnd,
        });
      }

      currYear.add(interval, 'years');
    }
  }

  return occurrences;
}
