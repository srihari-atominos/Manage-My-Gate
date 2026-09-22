import apiClient from '../../../services/apiClient';
import {
  CommunityEngagementFormData,
  PreviewRecipientProjection,
} from '../types/communityEngagement.types';

/**
 * Builds the network payload (FormData for Notice with images, or JSON/FormData for Poll).
 */
export const buildEngagementPayload = (
  data: CommunityEngagementFormData,
  statusOverride?: 'Draft' | 'Published' | 'Scheduled'
): FormData | Record<string, any> => {
  const isNotice = data.contentType === 'NOTICE';

  // Determine publication status
  let finalStatus = statusOverride;
  if (!finalStatus) {
    if (data.publishNow) {
      finalStatus = isNotice ? 'Published' : 'Published';
    } else {
      finalStatus = 'Scheduled';
    }
  }

  // Build targetAudience object
  let targetAudience: Record<string, any> = { targetType: data.targetType || 'ALL' };
  if (data.targetType === 'OWNERS_ONLY') {
    targetAudience = {
      targetType: 'RESIDENCY_TYPES',
      targetResidencyTypes: ['Owner', 'Resident Owner', 'Non-Resident Owner'],
    };
  } else if (data.targetType === 'STAFF_ONLY') {
    targetAudience = {
      targetType: 'RESIDENCY_TYPES',
      targetResidencyTypes: ['Staff', 'Security', 'Guard'],
    };
  } else if (data.targetType === 'SPECIFIC_ROLE' && data.selectedRoleId) {
    targetAudience = {
      targetType: 'ROLES',
      targetRoles: [data.selectedRoleId],
    };
  } else if (data.targetType === 'SPECIFIC_RESIDENT' && data.selectedUserId) {
    targetAudience = {
      targetType: 'CUSTOM',
      targetUsers: [data.selectedUserId],
    };
  } else if (data.targetType === 'BLOCKS' && data.selectedBlocks?.length) {
    targetAudience = {
      targetType: 'BLOCKS',
      blocks: data.selectedBlocks,
    };
  } else if (data.targetType === 'UNITS' && data.selectedUnits?.length) {
    targetAudience = {
      targetType: 'UNITS',
      units: data.selectedUnits,
    };
  }

  if (isNotice) {
    const formData = new FormData();
    formData.append('contentType', 'NOTICE');
    formData.append('title', data.title.trim());
    formData.append('description', data.description.trim());
    formData.append('category', data.category);
    formData.append('priority', data.priority);
    formData.append('status', finalStatus);
    formData.append('isPinned', data.isPinned ? 'true' : 'false');
    formData.append('allowComments', data.allowComments ? 'true' : 'false');
    formData.append('allowReactions', data.allowReactions ? 'true' : 'false');
    formData.append('isCritical', data.isCritical ? 'true' : 'false');
    formData.append(
      'requiresAcknowledgement',
      data.requiresAcknowledgement ? 'true' : 'false'
    );
    formData.append('expiryDate', data.expiryDate);

    if (!data.publishNow && data.scheduleDate) {
      formData.append('scheduleDate', data.scheduleDate);
    }

    formData.append('targetAudience', JSON.stringify(targetAudience));

    // Handle attachments
    if (data.images && data.images.length > 0) {
      data.images.forEach((img) => {
        if (!img.isRemote) {
          if (img.file) {
            formData.append('images', img.file);
          } else {
            formData.append('images', {
              uri: img.uri,
              name: img.name || `photo_${Date.now()}.jpg`,
              type: img.type || 'image/jpeg',
            } as any);
          }
        }
      });
    }

    return formData;
  } else {
    // Poll Payload
    const validOptions = data.options
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0)
      .map((text) => ({ text }));

    const pollBody: Record<string, any> = {
      contentType: 'POLL',
      question: data.title.trim(),
      description: data.description.trim() || undefined,
      options: validOptions,
      choiceType: data.choiceType,
      maxChoices:
        data.choiceType === 'MULTIPLE_CHOICE' ? Number(data.maxChoices) || 2 : 1,
      votingMode: data.votingMode,
      resultsVisibility: data.resultsVisibility,
      isAnonymous: Boolean(data.isAnonymous),
      quorumPercentage: Number(data.quorumPercentage) || 0,
      status: finalStatus === 'Draft' ? 'Draft' : 'Active',
      endDate: data.expiryDate,
      targetAudience,
    };

    if (!data.publishNow && data.scheduleDate) {
      pollBody.scheduleDate = data.scheduleDate;
    }

    return pollBody;
  }
};

/**
 * Creates Notice or Poll content via the unified Community Engagement gateway.
 */
export const createEngagementContent = async (
  payload: FormData | Record<string, any>
) => {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const config = isFormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined;

  const response = await apiClient.post('/community-engagement/content', payload, config);
  return response.data;
};

/**
 * Generates a side-effect-free preview and recipient calculation from backend.
 */
export const previewEngagementContent = async (
  payload: FormData | Record<string, any>
): Promise<PreviewRecipientProjection> => {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const config = isFormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined;

  const response = await apiClient.post('/community-engagement/preview', payload, config);
  return response.data?.data || response.data;
};

export default {
  buildEngagementPayload,
  createEngagementContent,
  previewEngagementContent,
};
