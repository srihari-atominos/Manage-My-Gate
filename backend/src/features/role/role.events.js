import { EventEmitter } from 'node:events';

// Centralized event emitter for Role feature
// Emits 'rolePermissionsUpdated' with payload { roleId, permissionIds }
const roleEvents = new EventEmitter();
export default roleEvents;
