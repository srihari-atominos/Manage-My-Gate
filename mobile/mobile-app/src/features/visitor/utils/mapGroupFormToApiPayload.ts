import { GroupVisitDetailsData } from '../components/group/GroupVisitDetailsStep';
import { GroupGuestItem } from '../components/group/AddGroupGuestsStep';
import { UserAuthContext } from './mapGuestFormToApiPayload';

export interface ApiGroupVisitorPassPayload {
  orgId?: string;
  createdById?: string;
  villaId?: string;
  passType: 'GUEST';
  isGroupPass: true;
  visitorDetails: {
    name: string;
  };
  purpose?: string;
  groupGuests: Array<{
    name: string;
    phone?: string;
  }>;
  validity: {
    startDate: string;
    endDate: string;
  };
  usageLimit: {
    maxUses: number;
  };
}

export const mapGroupFormToApiPayload = (
  details: GroupVisitDetailsData,
  guests: GroupGuestItem[],
  context: UserAuthContext = {}
): ApiGroupVisitorPassPayload => {
  const now = new Date();

  let startDateObj = now;
  if (details.visitDate && details.visitDate.trim() !== '') {
    const parsedDate = new Date(details.visitDate);
    if (!isNaN(parsedDate.getTime())) {
      startDateObj = parsedDate;
    }
  }

  const startDate = new Date(startDateObj);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDateObj);
  endDate.setHours(23, 59, 59, 999);

  const formattedGuests = guests.map((g) => ({
    name: g.name.trim(),
    phone: g.phone && g.phone.trim() !== '' ? g.phone.trim() : undefined,
  }));

  const purposeNote = details.purpose
    ? `${details.purpose.trim()} (${guests.length} Approved Guests)`
    : `Group Event: ${details.eventTitle.trim()} (${guests.length} Guests)`;

  const payload: ApiGroupVisitorPassPayload = {
    passType: 'GUEST',
    isGroupPass: true,
    visitorDetails: {
      name: details.eventTitle.trim(),
    },
    purpose: purposeNote,
    groupGuests: formattedGuests,
    validity: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    usageLimit: {
      maxUses: Math.max(guests.length, 1),
    },
  };

  if (context.orgId) {
    payload.orgId = context.orgId;
  }
  if (context.createdById) {
    payload.createdById = context.createdById;
  }
  if (context.villaId) {
    payload.villaId = context.villaId;
  }

  return payload;
};
