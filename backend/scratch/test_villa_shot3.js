import router from '../src/features/villa/villa.router.js';

function inspectRouteStack(path, method) {
  const layer = router.stack.find(l => {
    if (!l.route) return false;
    return l.route.path === path && l.route.methods[method] === true;
  });

  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found in router!`);
  }

  const stackNames = layer.route.stack.map(s => {
    // If it's a wrapper, try to determine what middleware it is
    return s.name || 'anonymous';
  });

  return stackNames;
}

function verifySecurityChain(path, method, expectedNames) {
  const actualNames = inspectRouteStack(path, method);
  console.log(`\nRoute: ${method.toUpperCase()} ${path}`);
  console.log(`Actual stack: ${JSON.stringify(actualNames)}`);

  // Verify sequence of middlewares
  let expectedIndex = 0;
  for (const actualName of actualNames) {
    if (expectedIndex < expectedNames.length && actualName === expectedNames[expectedIndex]) {
      expectedIndex++;
    }
  }

  if (expectedIndex !== expectedNames.length) {
    throw new Error(`Security chain sequence violation on route ${method.toUpperCase()} ${path}! Expected subsequence: ${expectedNames.join(' -> ')}`);
  }
  console.log(`✓ Security chain subsequence verified successfully.`);
}

async function runTests() {
  try {
    console.log('--- Inspecting Villa Router Security Middlewares ---');

    // Expected security chain names in order:
    // correlationIdMiddleware -> isAuthenticated -> tenantContext -> authorizePermission -> validate (optional) -> controller method
    
    // 1. GET / (units list)
    verifySecurityChain('/', 'get', [
      'correlationIdMiddleware',
      'isAuthenticated',
      'tenantContext',
      '<anonymous>', // authorizePermission
      'getAll'
    ]);

    // 2. POST / (create)
    verifySecurityChain('/', 'post', [
      'correlationIdMiddleware',
      'isAuthenticated',
      'tenantContext',
      '<anonymous>', // authorizePermission
      '<anonymous>', // validate
      'create'
    ]);

    // 3. PUT /:id (update)
    verifySecurityChain('/:id', 'put', [
      'correlationIdMiddleware',
      'isAuthenticated',
      'tenantContext',
      '<anonymous>', // authorizePermission
      '<anonymous>', // validate
      'update'
    ]);

    // 4. PATCH /:id/assign (assign resident)
    verifySecurityChain('/:id/assign', 'patch', [
      'correlationIdMiddleware',
      'isAuthenticated',
      'tenantContext',
      '<anonymous>', // authorizePermission
      'assignResident'
    ]);

    // 5. DELETE /:id (delete)
    verifySecurityChain('/:id', 'delete', [
      'correlationIdMiddleware',
      'isAuthenticated',
      'tenantContext',
      '<anonymous>', // authorizePermission
      'delete'
    ]);

    console.log('\n======================================');
    console.log('ALL SHOT 3 VERIFICATIONS PASSED!');
    console.log('======================================');
    process.exit(0);
  } catch (error) {
    console.error('VERIFICATION FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
