/**
 * Amenity Management v2 - API Service
 * Encapsulates all HTTP operations for the frozen Phase 5 backend (/api/v2/amenity-management/*).
 * Routes to /api/v2 cleanly without /api/v1 duplication and preserves all global apiClient interceptors.
 */

import apiClient, { getApiBaseUrl } from '../../../services/apiClient';
import {
  ApiResponse,
  ApiPaginatedResponse,
  ApiAmenityFacility,
  ApiAmenityResource,
  ApiAvailabilityResponse,
  ApiPricingSnapshot,
  ApiCreateHoldResponse,
  ApiAmenityHold,
  ApiAmenityReservation,
  ApiAmenityAccessPass,
  ApiAmenityMaintenanceBlock,
  CreateHoldApiPayload,
  ConfirmReservationApiPayload,
  CalculatePricingApiPayload,
  CancelReservationApiPayload,
  ReviewReservationApiPayload,
  RescheduleReservationApiPayload,
  ScheduleMaintenanceApiPayload,
} from '../types/amenityApi.types';
import * as Crypto from 'expo-crypto';

/**
 * RFC 4122 v4 UUID generator for client idempotency keys.
 * Leverages native Expo Crypto / Web Crypto randomUUID() when available.
 */
export const generateUUID = (): string => {
  try {
    if (typeof Crypto !== 'undefined' && typeof Crypto.randomUUID === 'function') {
      return Crypto.randomUUID();
    }
  } catch {
    // Fall through if native module is not ready in test environments
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Feature-local URL resolver for Amenity Management v2.
 * Derives the host dynamically from the active runtime configuration and guarantees
 * an absolute URL starting with http(s):// to prevent Axios from prepending /api/v1.
 */
export const getAmenityV2Url = (endpointPath: string): string => {
  const rawBase = (typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : '') || apiClient.defaults.baseURL || '';
  const cleanHost = rawBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${cleanHost}/api/v2/amenity-management${cleanPath}`;
};

export const amenityManagementService = {
  // ==========================================
  // 1. Facilities (/facilities)
  // ==========================================
  async getFacilities(params: {
    page?: number;
    limit?: number;
    archetype?: string;
    search?: string;
    status?: string;
  } = {}): Promise<ApiResponse<ApiPaginatedResponse<ApiAmenityFacility>>> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.archetype) query.append('archetype', params.archetype);
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);

    const queryString = query.toString();
    const url = getAmenityV2Url(`/facilities${queryString ? `?${queryString}` : ''}`);
    const response = await apiClient.get<ApiResponse<ApiPaginatedResponse<ApiAmenityFacility>>>(url);
    return response.data;
  },

  async getFacilityById(id: string): Promise<ApiResponse<ApiAmenityFacility>> {
    const url = getAmenityV2Url(`/facilities/${id}`);
    const response = await apiClient.get<ApiResponse<ApiAmenityFacility>>(url);
    return response.data;
  },

  async createFacility(payload: Partial<ApiAmenityFacility>): Promise<ApiResponse<ApiAmenityFacility>> {
    const url = getAmenityV2Url('/facilities');
    const response = await apiClient.post<ApiResponse<ApiAmenityFacility>>(url, payload);
    return response.data;
  },

  async updateFacility(id: string, payload: Partial<ApiAmenityFacility>): Promise<ApiResponse<ApiAmenityFacility>> {
    const url = getAmenityV2Url(`/facilities/${id}`);
    const response = await apiClient.put<ApiResponse<ApiAmenityFacility>>(url, payload);
    return response.data;
  },

  async updateFacilityStatus(id: string, status: string): Promise<ApiResponse<ApiAmenityFacility>> {
    const url = getAmenityV2Url(`/facilities/${id}/status`);
    const response = await apiClient.patch<ApiResponse<ApiAmenityFacility>>(url, { status });
    return response.data;
  },

  // ==========================================
  // 2. Resources (/resources)
  // ==========================================
  async getResources(params: {
    facilityId: string;
    page?: number;
    limit?: number;
    assetState?: string;
  }): Promise<ApiResponse<ApiPaginatedResponse<ApiAmenityResource>>> {
    const query = new URLSearchParams();
    query.append('facilityId', params.facilityId);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.assetState) query.append('assetState', params.assetState);

    const queryString = query.toString();
    const url = getAmenityV2Url(`/resources?${queryString}`);
    const response = await apiClient.get<ApiResponse<ApiPaginatedResponse<ApiAmenityResource>>>(url);
    return response.data;
  },

  async getResourceById(id: string): Promise<ApiResponse<ApiAmenityResource>> {
    const url = getAmenityV2Url(`/resources/${id}`);
    const response = await apiClient.get<ApiResponse<ApiAmenityResource>>(url);
    return response.data;
  },

  async createResource(payload: Partial<ApiAmenityResource>): Promise<ApiResponse<ApiAmenityResource>> {
    const url = getAmenityV2Url('/resources');
    const response = await apiClient.post<ApiResponse<ApiAmenityResource>>(url, payload);
    return response.data;
  },

  async updateResourceState(id: string, assetState: string): Promise<ApiResponse<ApiAmenityResource>> {
    const url = getAmenityV2Url(`/resources/${id}/state`);
    const response = await apiClient.patch<ApiResponse<ApiAmenityResource>>(url, { assetState });
    return response.data;
  },

  // ==========================================
  // 3. Availability Evaluation (/availability)
  // ==========================================
  async checkAvailability(params: {
    facilityId: string;
    resourceId?: string;
    startDateTime: string;
    endDateTime: string;
    requestedQuantity?: number;
  }): Promise<ApiResponse<ApiAvailabilityResponse>> {
    const query = new URLSearchParams();
    query.append('facilityId', params.facilityId);
    query.append('startDateTime', params.startDateTime);
    query.append('endDateTime', params.endDateTime);
    if (params.resourceId) query.append('resourceId', params.resourceId);
    if (params.requestedQuantity) query.append('requestedQuantity', String(params.requestedQuantity));

    const url = getAmenityV2Url(`/availability?${query.toString()}`);
    const response = await apiClient.get<ApiResponse<ApiAvailabilityResponse>>(url);
    return response.data;
  },

  // ==========================================
  // 4. Pricing Calculation (/pricing)
  // ==========================================
  async calculatePricing(payload: CalculatePricingApiPayload): Promise<ApiResponse<ApiPricingSnapshot>> {
    const url = getAmenityV2Url('/pricing/calculate');
    const response = await apiClient.post<ApiResponse<ApiPricingSnapshot>>(url, payload);
    return response.data;
  },

  // ==========================================
  // 5. Reservation Holds (/holds)
  // ==========================================
  async createHold(
    payload: CreateHoldApiPayload,
    idempotencyKey?: string
  ): Promise<ApiResponse<ApiCreateHoldResponse>> {
    const key = idempotencyKey || generateUUID();
    const url = getAmenityV2Url('/holds');
    const response = await apiClient.post<ApiResponse<ApiCreateHoldResponse>>(url, payload, {
      headers: {
        'x-idempotency-key': key,
      },
    });
    return response.data;
  },

  async getHoldById(id: string): Promise<ApiResponse<ApiAmenityHold>> {
    const url = getAmenityV2Url(`/holds/${id}`);
    const response = await apiClient.get<ApiResponse<ApiAmenityHold>>(url);
    return response.data;
  },

  async releaseHold(id: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const url = getAmenityV2Url(`/holds/${id}/release`);
    const response = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>(url);
    return response.data;
  },

  // ==========================================
  // 6. Reservations (/reservations)
  // ==========================================
  async confirmReservation(
    payload: ConfirmReservationApiPayload,
    idempotencyKey?: string
  ): Promise<ApiResponse<ApiAmenityReservation>> {
    // Deterministic idempotency key derived from hold ID unless explicitly provided
    const key = idempotencyKey || `confirm_hold_${payload.holdId}`;
    const url = getAmenityV2Url('/reservations/confirm');
    const response = await apiClient.post<ApiResponse<ApiAmenityReservation>>(url, payload, {
      headers: {
        'x-idempotency-key': key,
      },
    });
    return response.data;
  },

  async getReservations(params: {
    page?: number;
    limit?: number;
    facilityId?: string;
    bookingStatus?: string;
    paymentStatus?: string;
    unitId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ApiResponse<ApiPaginatedResponse<ApiAmenityReservation>>> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.facilityId) query.append('facilityId', params.facilityId);
    if (params.bookingStatus) query.append('bookingStatus', params.bookingStatus);
    if (params.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params.unitId) query.append('unitId', params.unitId);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString();
    const url = getAmenityV2Url(`/reservations${queryString ? `?${queryString}` : ''}`);
    const response = await apiClient.get<ApiResponse<ApiPaginatedResponse<ApiAmenityReservation>>>(url);
    return response.data;
  },

  async getReservationById(id: string): Promise<ApiResponse<ApiAmenityReservation>> {
    const url = getAmenityV2Url(`/reservations/${id}`);
    const response = await apiClient.get<ApiResponse<ApiAmenityReservation>>(url);
    return response.data;
  },

  async cancelReservation(
    id: string,
    payload?: CancelReservationApiPayload
  ): Promise<ApiResponse<ApiAmenityReservation>> {
    const url = getAmenityV2Url(`/reservations/${id}/cancel`);
    const response = await apiClient.post<ApiResponse<ApiAmenityReservation>>(url, payload || {});
    return response.data;
  },

  async reviewReservation(
    id: string,
    payload: ReviewReservationApiPayload
  ): Promise<ApiResponse<ApiAmenityReservation>> {
    const url = getAmenityV2Url(`/reservations/${id}/review`);
    const response = await apiClient.post<ApiResponse<ApiAmenityReservation>>(url, payload);
    return response.data;
  },

  async rescheduleReservation(
    id: string,
    payload: RescheduleReservationApiPayload
  ): Promise<ApiResponse<ApiAmenityReservation>> {
    const url = getAmenityV2Url(`/reservations/${id}/reschedule`);
    const response = await apiClient.post<ApiResponse<ApiAmenityReservation>>(url, payload);
    return response.data;
  },

  // ==========================================
  // 7. Access Passes (/passes)
  // ==========================================
  async getPassesByReservation(reservationId: string): Promise<ApiResponse<ApiAmenityAccessPass[]>> {
    const url = getAmenityV2Url(`/passes/reservation/${reservationId}`);
    const response = await apiClient.get<ApiResponse<ApiAmenityAccessPass[]>>(url);
    return response.data;
  },

  // ==========================================
  // 8. Maintenance Blocks (/maintenance)
  // ==========================================
  async getOverlappingMaintenance(params: {
    facilityId: string;
    startDateTime: string;
    endDateTime: string;
  }): Promise<ApiResponse<ApiAmenityMaintenanceBlock[]>> {
    const query = new URLSearchParams();
    query.append('facilityId', params.facilityId);
    query.append('startDateTime', params.startDateTime);
    query.append('endDateTime', params.endDateTime);

    const url = getAmenityV2Url(`/maintenance/overlapping?${query.toString()}`);
    const response = await apiClient.get<ApiResponse<ApiAmenityMaintenanceBlock[]>>(url);
    return response.data;
  },

  async getMaintenanceById(blockId: string): Promise<ApiResponse<ApiAmenityMaintenanceBlock>> {
    const url = getAmenityV2Url(`/maintenance/${blockId}`);
    const response = await apiClient.get<ApiResponse<ApiAmenityMaintenanceBlock>>(url);
    return response.data;
  },

  async scheduleMaintenance(
    payload: ScheduleMaintenanceApiPayload
  ): Promise<ApiResponse<ApiAmenityMaintenanceBlock>> {
    const url = getAmenityV2Url('/maintenance');
    const response = await apiClient.post<ApiResponse<ApiAmenityMaintenanceBlock>>(url, payload);
    return response.data;
  },

  async updateMaintenanceStatus(
    blockId: string,
    status: string
  ): Promise<ApiResponse<ApiAmenityMaintenanceBlock>> {
    const url = getAmenityV2Url(`/maintenance/${blockId}/status`);
    const response = await apiClient.patch<ApiResponse<ApiAmenityMaintenanceBlock>>(url, { status });
    return response.data;
  },
};

export default amenityManagementService;
