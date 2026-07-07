var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
function send(res, statusCode, body) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify(body));
}
function readBody(req) {
    return __awaiter(this, void 0, void 0, function () {
        var chunks, chunk, e_1_1;
        var _a, req_1, req_1_1;
        var _b, e_1, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    chunks = [];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 6, 7, 12]);
                    _a = true, req_1 = __asyncValues(req);
                    _e.label = 2;
                case 2: return [4 /*yield*/, req_1.next()];
                case 3:
                    if (!(req_1_1 = _e.sent(), _b = req_1_1.done, !_b)) return [3 /*break*/, 5];
                    _d = req_1_1.value;
                    _a = false;
                    chunk = _d;
                    chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
                    _e.label = 4;
                case 4:
                    _a = true;
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 12];
                case 6:
                    e_1_1 = _e.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 12];
                case 7:
                    _e.trys.push([7, , 10, 11]);
                    if (!(!_a && !_b && (_c = req_1.return))) return [3 /*break*/, 9];
                    return [4 /*yield*/, _c.call(req_1)];
                case 8:
                    _e.sent();
                    _e.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 11: return [7 /*endfinally*/];
                case 12: return [2 /*return*/, Buffer.concat(chunks).toString('utf-8')];
            }
        });
    });
}
export default function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var token, owner, repo, branch, rawBody, parsed, files, _i, files_1, file, metadataResponse, sha, metadata, updateResponse, payload, _a;
        var _b, _c, _d, _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    if (req.method === 'OPTIONS') {
                        res.statusCode = 204;
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature');
                        res.end();
                        return [2 /*return*/];
                    }
                    if (req.method !== 'POST') {
                        send(res, 405, { message: 'POST のみ受け付けます。' });
                        return [2 /*return*/];
                    }
                    token = process.env.GITHUB_TOKEN;
                    owner = process.env.GITHUB_OWNER;
                    repo = process.env.GITHUB_REPO;
                    branch = (_b = process.env.GITHUB_BRANCH) !== null && _b !== void 0 ? _b : 'main';
                    if (!token || !owner || !repo) {
                        send(res, 503, {
                            message: 'Vercel 環境変数が未設定です。GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO を設定してください。',
                        });
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, readBody(req)];
                case 1:
                    rawBody = _j.sent();
                    try {
                        parsed = JSON.parse(rawBody);
                    }
                    catch (_k) {
                        send(res, 400, { message: 'JSON の形式が不正です。' });
                        return [2 /*return*/];
                    }
                    files = [
                        { path: 'data/ship-data.json', content: JSON.stringify((_c = parsed.ships) !== null && _c !== void 0 ? _c : [], null, 2) },
                        { path: 'data/voyage-data.json', content: JSON.stringify((_d = parsed.voyages) !== null && _d !== void 0 ? _d : [], null, 2) },
                        { path: 'data/part-master.json', content: JSON.stringify((_e = parsed.parts) !== null && _e !== void 0 ? _e : [], null, 2) },
                        { path: 'data/route-master.json', content: JSON.stringify((_f = parsed.routes) !== null && _f !== void 0 ? _f : [], null, 2) },
                        { path: 'data/rank-bonus.json', content: JSON.stringify((_g = parsed.rankBonus) !== null && _g !== void 0 ? _g : {}, null, 2) },
                    ];
                    _j.label = 2;
                case 2:
                    _j.trys.push([2, 11, , 12]);
                    _i = 0, files_1 = files;
                    _j.label = 3;
                case 3:
                    if (!(_i < files_1.length)) return [3 /*break*/, 10];
                    file = files_1[_i];
                    return [4 /*yield*/, fetch("https://api.github.com/repos/".concat(owner, "/").concat(repo, "/contents/").concat(file.path, "?ref=").concat(branch), {
                            headers: {
                                Authorization: "Bearer ".concat(token),
                                Accept: 'application/vnd.github+json',
                                'X-GitHub-Api-Version': '2022-11-28',
                            },
                        })];
                case 4:
                    metadataResponse = _j.sent();
                    sha = void 0;
                    if (!metadataResponse.ok) return [3 /*break*/, 6];
                    return [4 /*yield*/, metadataResponse.json()];
                case 5:
                    metadata = (_j.sent());
                    sha = metadata.sha;
                    _j.label = 6;
                case 6: return [4 /*yield*/, fetch("https://api.github.com/repos/".concat(owner, "/").concat(repo, "/contents/").concat(file.path), {
                        method: 'PUT',
                        headers: {
                            Authorization: "Bearer ".concat(token),
                            Accept: 'application/vnd.github+json',
                            'X-GitHub-Api-Version': '2022-11-28',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: "Update ".concat(file.path, " from FF14 submarine manager"),
                            content: Buffer.from(file.content, 'utf-8').toString('base64'),
                            sha: sha,
                            branch: branch,
                        }),
                    })];
                case 7:
                    updateResponse = _j.sent();
                    if (!!updateResponse.ok) return [3 /*break*/, 9];
                    return [4 /*yield*/, updateResponse.json().catch(function () { return null; })];
                case 8:
                    payload = (_j.sent());
                    send(res, updateResponse.status === 409 ? 409 : 502, {
                        message: (_h = payload === null || payload === void 0 ? void 0 : payload.message) !== null && _h !== void 0 ? _h : "".concat(file.path, " \u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002"),
                    });
                    return [2 /*return*/];
                case 9:
                    _i++;
                    return [3 /*break*/, 3];
                case 10:
                    send(res, 200, { message: 'GitHub リポジトリへ保存しました。' });
                    return [3 /*break*/, 12];
                case 11:
                    _a = _j.sent();
                    send(res, 500, { message: 'GitHub API 呼び出し中にエラーが発生しました。' });
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
