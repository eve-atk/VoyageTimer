var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
function encodeBase64Url(input) {
    return Buffer.from(input, 'utf-8').toString('base64url');
}
function decodeBase64Url(input) {
    return Buffer.from(input, 'base64url').toString('utf-8');
}
function sign(input, secret) {
    return createHmac('sha256', secret).update(input).digest('base64url');
}
export function createToken(payload, secret, expiresInSeconds) {
    var issuedAt = Math.floor(Date.now() / 1000);
    var header = { alg: 'HS256', typ: 'JWT' };
    var body = __assign(__assign({}, payload), { iat: issuedAt, exp: issuedAt + expiresInSeconds });
    var encodedHeader = encodeBase64Url(JSON.stringify(header));
    var encodedPayload = encodeBase64Url(JSON.stringify(body));
    var signingInput = "".concat(encodedHeader, ".").concat(encodedPayload);
    var signature = sign(signingInput, secret);
    return "".concat(signingInput, ".").concat(signature);
}
export function verifyToken(token, secret) {
    var parts = token.split('.');
    if (parts.length !== 3) {
        return null;
    }
    var encodedHeader = parts[0], encodedPayload = parts[1], providedSignature = parts[2];
    var signingInput = "".concat(encodedHeader, ".").concat(encodedPayload);
    var expectedSignature = sign(signingInput, secret);
    var provided = Buffer.from(providedSignature);
    var expected = Buffer.from(expectedSignature);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
        return null;
    }
    try {
        var decoded = JSON.parse(decodeBase64Url(encodedPayload));
        var now = Math.floor(Date.now() / 1000);
        if (!decoded.exp || now >= decoded.exp) {
            return null;
        }
        return decoded;
    }
    catch (_a) {
        return null;
    }
}
export function createRandomState() {
    return randomBytes(16).toString('hex');
}
