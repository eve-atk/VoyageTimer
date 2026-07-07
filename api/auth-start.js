import { createRandomState, createToken } from './lib/auth';
function send(res, statusCode, message) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(message);
}
function getAllowedFrontendOrigins() {
    var _a;
    return ((_a = process.env.ALLOWED_ORIGINS) !== null && _a !== void 0 ? _a : '')
        .split(',')
        .map(function (item) { return item.trim(); })
        .filter(function (item) { return item.length > 0; });
}
export default function handler(req, res) {
    var _a;
    var clientId = process.env.GITHUB_CLIENT_ID;
    var callbackUrl = process.env.AUTH_REDIRECT_URI;
    var tokenSecret = process.env.AUTH_JWT_SECRET;
    if (!clientId || !callbackUrl || !tokenSecret) {
        send(res, 503, 'OAuth 環境変数が不足しています。');
        return;
    }
    var requestUrl = new URL((_a = req.url) !== null && _a !== void 0 ? _a : '/', 'https://placeholder.local');
    var redirect = requestUrl.searchParams.get('redirect');
    if (!redirect) {
        send(res, 400, 'redirect パラメータが必要です。');
        return;
    }
    var redirectUrl;
    try {
        redirectUrl = new URL(redirect);
    }
    catch (_b) {
        send(res, 400, 'redirect URL が不正です。');
        return;
    }
    var allowedOrigins = getAllowedFrontendOrigins();
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(redirectUrl.origin)) {
        send(res, 403, '許可されていない redirect URL です。');
        return;
    }
    var state = createToken({
        typ: 'oauth_state',
        redirect: redirectUrl.toString(),
        nonce: createRandomState(),
    }, tokenSecret, 300);
    var authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', callbackUrl);
    authorizeUrl.searchParams.set('scope', 'read:user');
    authorizeUrl.searchParams.set('state', state);
    res.statusCode = 302;
    res.setHeader('Location', authorizeUrl.toString());
    res.end();
}
