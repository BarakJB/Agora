import type { Agent, Policy, Commission, UploadRecord } from '../types/index.js';
declare class MemoryStore {
    agents: Map<string, Agent>;
    policies: Map<string, Policy>;
    commissions: Map<string, Commission>;
    uploads: Map<string, UploadRecord>;
    constructor();
    private seed;
}
export declare const store: MemoryStore;
export {};
//# sourceMappingURL=memory.store.d.ts.map