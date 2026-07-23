import orgMembershipRepository from './orgMembership.repository.js';

export class OrgMembershipService {
  async createMembership(membershipData, session) {
    return await orgMembershipRepository.create(membershipData, session);
  }

  async getMembership(userId, orgId, session = null) {
    return await orgMembershipRepository.findByUserIdAndOrgId(userId, orgId, session);
  }

  async getFirstMembership(userId, session = null) {
    return await orgMembershipRepository.findFirstByUserId(userId, session);
  }

  async getUserMemberships(userId, session = null) {
    return await orgMembershipRepository.findByUserIdWithPopulate(userId, session);
  }

  async getPaginatedUsersForOrg(orgId, page = 1, limit = 10, filters = {}) {
    const { data, totalRecords } = await orgMembershipRepository.findPaginatedUsersByOrg(orgId, page, limit, filters);
    const totalPages = Math.ceil(totalRecords / limit);
    return {
      data,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: totalPages || 1,
        limit,
      },
    };
  }

  async updateMembershipRole(userId, orgId, roleIds, session = null) {
    return await orgMembershipRepository.updateRoles(userId, orgId, roleIds, session);
  }

  async updateStatus(userId, orgId, status, session = null) {
    return await orgMembershipRepository.updateStatus(userId, orgId, status, session);
  }

  async deleteMembershipsByUserId(userId, session = null) {
    return await orgMembershipRepository.deleteByUserId(userId, session);
  }

  async deleteMembership(userId, orgId, session = null) {
    return await orgMembershipRepository.deleteByUserIdAndOrgId(userId, orgId, session);
  }

  async clearRoleFromMemberships(roleId, session = null) {
    return await orgMembershipRepository.clearRoleFromMemberships(roleId, session);
  }

  async getResidentsForVilla(villaId, session = null) {
    return await orgMembershipRepository.findResidentsByVillaId(villaId, session);
  }

  async getMembershipWithVilla(userId, orgId, session = null) {
    return await orgMembershipRepository.findByUserIdAndOrgIdWithPopulate(userId, orgId, session);
  }
}

export default new OrgMembershipService();

