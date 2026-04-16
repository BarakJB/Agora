export declare function getJwtSecret(): string;
export declare function hashPassword(plain: string): Promise<string>;
export declare function verifyPassword(plain: string, hash: string): Promise<boolean>;
export declare function signToken(payload: {
    agentId: string;
    sub: string;
}): string;
export declare function verifyToken(token: string): {
    agentId: string;
    sub: string;
};
//# sourceMappingURL=auth.service.d.ts.map