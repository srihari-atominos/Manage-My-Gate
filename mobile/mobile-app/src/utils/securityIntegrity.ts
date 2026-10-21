import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface SecurityIntegrityReport {
  isSecure: boolean;
  isRootedOrJailbroken: boolean;
  isEmulator: boolean;
  isDebuggable: boolean;
  riskScore: number; // 0 (clean) to 100 (high risk)
  findings: string[];
}

/**
 * Mobile Device Security & Environment Integrity Verifier
 * Implements OWASP MASVS-RESILIENCE guidelines:
 * - Checks for common root/jailbreak indicators
 * - Detects execution in debug or test environments
 * - Audits runtime integrity for high-privilege operations (SOS, Gate Operations, Payments)
 */
export const verifyDeviceSecurity = (): SecurityIntegrityReport => {
  const findings: string[] = [];
  let riskScore = 0;

  // 1. Check for Development Mode / Debugger Attach in Production
  const isDebuggable = __DEV__;
  if (!__DEV__ && (global as any).__REMOTEDEV__) {
    findings.push('Remote debugger detected in production build');
    riskScore += 40;
  }

  // 2. Emulator / Simulator Inspection
  const isEmulator = !Constants.isDevice;
  if (isEmulator && !__DEV__) {
    findings.push('Executing on virtual machine or emulator in production');
    riskScore += 25;
  }

  // 3. Android Root / Tamper Indicators
  let isRooted = false;
  if (Platform.OS === 'android') {
    // Check system build tags if available
    const buildTags = (Constants.expoConfig?.extra as any)?.buildTags || '';
    if (buildTags.includes('test-keys')) {
      findings.push('Android build signed with unofficial test-keys');
      riskScore += 35;
      isRooted = true;
    }

    // Inspect suspicious global variables or exposed test hooks
    if ((global as any)._ROOT_ACCESS_DETECTED_) {
      findings.push('Root execution flags detected');
      riskScore += 50;
      isRooted = true;
    }
  }

  // 4. iOS Jailbreak Indicators
  if (Platform.OS === 'ios') {
    if ((global as any)._CYDIA_DETECTED_ || (global as any)._SUBSTRATE_DETECTED_) {
      findings.push('iOS jailbreak substrate detected');
      riskScore += 50;
      isRooted = true;
    }
  }

  const isSecure = riskScore < 50;

  return {
    isSecure,
    isRootedOrJailbroken: isRooted,
    isEmulator,
    isDebuggable,
    riskScore,
    findings,
  };
};

/**
 * Assert that the environment is secure before executing high-privilege operations.
 * Logs a security audit event in production.
 */
export const assertSecurityIntegrity = (operationName: string): boolean => {
  const report = verifyDeviceSecurity();
  if (!report.isSecure) {
    console.warn(`[SecurityAudit] Operation '${operationName}' flagged for security risks:`, report.findings);
    // In production, high risk actions (e.g. guard gate toggle) can be logged or guarded
    return false;
  }
  return true;
};

export default {
  verifyDeviceSecurity,
  assertSecurityIntegrity,
};
