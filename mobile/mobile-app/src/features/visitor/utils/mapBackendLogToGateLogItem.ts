import type { AdminGateLogItem } from '../components/admin/AdminGateLogCard';

/**
 * Maps a visitor-log history row (GET /visitor-log/org/:orgId) to an audit-log card item.
 * Times, guard and gate come from the gate event itself, not from the pass's validity window.
 */
export const mapBackendLogToGateLogItem = (log: any): AdminGateLogItem => {
  const pass = log?.passId && log.passId._id ? log.passId : null;
  const rawVilla = log?.villa;
  let villaDisplay: string | undefined;
  if (typeof rawVilla === 'object' && rawVilla !== null) {
    const unit = rawVilla.unitNumber || rawVilla.villaNumber || '';
    const block = rawVilla.blockOrBuilding || rawVilla.block || '';
    if (unit && block) {
      villaDisplay = `${unit} (${block})`;
    } else if (unit || block) {
      villaDisplay = unit || block;
    }
  } else if (typeof rawVilla === 'string' && rawVilla.trim()) {
    villaDisplay = rawVilla.trim();
  } else if (pass?.villaId) {
    if (typeof pass.villaId === 'object' && pass.villaId !== null) {
      const unit = pass.villaId.unitNumber || pass.villaId.villaNumber || '';
      const block = pass.villaId.blockOrBuilding || pass.villaId.block || '';
      if (unit && block) {
        villaDisplay = `${unit} (${block})`;
      } else if (unit || block) {
        villaDisplay = unit || block;
      }
    } else if (typeof pass.villaId === 'string' && pass.villaId.trim()) {
      villaDisplay = pass.villaId.trim();
    }
  }

  const guardName = log?.guardId?.name || log?.guardId?.username;
  const passType = pass?.passType || (log?.entryType === 'WALK_IN' ? 'WALK_IN' : 'GUEST');

  return {
    _id: log?._id,
    visitorName: log?.snapshot?.visitorName || pass?.visitorDetails?.name || 'Visitor',
    phone: log?.snapshot?.phone || pass?.visitorDetails?.phone,
    passType,
    category: passType,
    vehicleNo: log?.snapshot?.vehicleNumber || pass?.vehicleDetails?.number,
    villaNumber: villaDisplay,
    guardName,
    gateName: log?.gateName,
    entryTime: log?.checkInTime,
    exitTime: log?.checkOutTime,
    // INSIDE | COMPLETED | PENDING | REJECTED — the card treats INSIDE as on-premises.
    status: log?.logStatus,
    rawPass: pass ? { ...pass, visitorName: pass.visitorDetails?.name } : undefined,
  };
};

export default mapBackendLogToGateLogItem;
