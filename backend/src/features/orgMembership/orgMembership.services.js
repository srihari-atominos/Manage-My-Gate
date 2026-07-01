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

  async getPaginatedUsersForOrg(orgId, page = 1, limit = 10) {
    const { data, totalRecords } = await orgMembershipRepository.findPaginatedUsersByOrg(orgId, page, limit);
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

  async deleteMembershipsByUserId(userId, session = null) {
    return await orgMembershipRepository.deleteByUserId(userId, session);
  }

  async clearRoleFromMemberships(roleId, session = null) {
    return await orgMembershipRepository.clearRoleFromMemberships(roleId, session);
  }
}

export default new OrgMembershipService();

