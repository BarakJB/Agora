export declare function createOTP(agentId: string): Promise<{
    otp: string;
    expiresAt: Date;
}>;
export declare function findValidOTPByEmail(email: string, otp: string): Promise<{
    id: string;
    agentId: string;
} | null>;
export declare function markUsed(id: string): Promise<void>;
//# sourceMappingURL=passwordReset.repository.d.ts.map