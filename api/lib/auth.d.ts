type JsonValue = null | boolean | number | string | JsonValue[] | {
    [key: string]: JsonValue;
};
type TokenPayload = {
    [key: string]: JsonValue;
    iat: number;
    exp: number;
    typ: string;
};
export declare function createToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'typ'> & {
    typ: string;
}, secret: string, expiresInSeconds: number): string;
export declare function verifyToken(token: string, secret: string): TokenPayload | null;
export declare function createRandomState(): string;
export {};
