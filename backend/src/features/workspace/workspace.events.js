import { EventEmitter } from 'events';

class WorkspaceEventEmitter extends EventEmitter {}

export const workspaceEvents = new WorkspaceEventEmitter();
export default workspaceEvents;
