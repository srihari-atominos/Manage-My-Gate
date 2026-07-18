import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function testApiFlow() {
  try {
    console.log('1. Logging in as aaravsharma_adm1@greenfield.com...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'aaravsharma_adm1@greenfield.com',
      password: 'Test@1234',
    });
    
    const token = loginRes.data.data.token;
    const orgId = loginRes.data.data.user.orgId;
    console.log('Login successful! Token retrieved. Org ID:', orgId);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-organization-id': orgId,
      'Content-Type': 'application/json'
    };

    console.log('\n2. Fetching roles...');
    const rolesRes = await axios.get(`${BASE_URL}/roles?page=1&limit=10`, { headers });
    const roles = rolesRes.data.data.data;
    const adminRole = roles.find(r => r.name === 'Community Admin');
    
    if (!adminRole) {
      throw new Error('Community Admin role not found!');
    }
    console.log(`Found role "Community Admin" with ID: ${adminRole.id}`);
    console.log('Current permissions in role:', adminRole.permissions);

    // Keep all existing non-visitor permissions, but update visitor permissions to only have 'visitor:admin'
    const newPermissions = adminRole.permissions
      .filter(p => !p.startsWith('visitor:'))
      .concat(['visitor:admin']);

    console.log('\n3. Updating role with permissions:', newPermissions.filter(p => p.startsWith('visitor:')));
    const updateRes = await axios.put(`${BASE_URL}/roles/${adminRole.id}`, {
      name: adminRole.name,
      description: adminRole.description || 'Community Admin Role',
      isTenantRole: adminRole.isTenantRole,
      permissions: newPermissions,
      integrationMappings: adminRole.integrationMappings || {}
    }, { headers });

    console.log('Update response data permissions:', updateRes.data.data.permissions.filter(p => p.startsWith('visitor:')));

    console.log('\n4. Fetching roles list again to verify persistence...');
    const refetchRes = await axios.get(`${BASE_URL}/roles?page=1&limit=10`, { headers });
    const refetchedRoles = refetchRes.data.data.data;
    const refetchedAdminRole = refetchedRoles.find(r => r.name === 'Community Admin');
    console.log('Refetched role permissions:', refetchedAdminRole.permissions.filter(p => p.startsWith('visitor:')));

    if (refetchedAdminRole.permissions.includes('visitor:admin') && 
        !refetchedAdminRole.permissions.includes('visitor:resident') && 
        !refetchedAdminRole.permissions.includes('visitor:guard')) {
      console.log('\nSUCCESS: Database updated correctly to only contain visitor:admin!');
    } else {
      console.error('\nFAILURE: Database permissions did not update correctly!', refetchedAdminRole.permissions);
    }
  } catch (err) {
    console.error('API Flow Test failed:', err.response ? err.response.data : err.message);
  }
}

testApiFlow();
