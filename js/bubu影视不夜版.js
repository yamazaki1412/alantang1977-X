const axios = require("axios");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");

const httpClient = axios.create({
    timeout: 15000,
    httpsAgent: new https.Agent({
        keepAlive: true,
        rejectUnauthorized: false
    }),
    httpAgent: new http.Agent({
        keepAlive: true
    })
});

const BUBUYINGSHI_HOST = "https://bubuyingshi.com";
const DEBUG_LOG_FILE = `${__dirname}/bubuyingshi_debug.log`;

const bubuyingshiConfig = {
    host: BUBUYINGSHI_HOST,
    pkg: "com.sunshine.tv",
    ver: "4",
    finger: "SF-C3B2B41F6EFFFF9869176CF68F6790E8F07506FC88632C94B4F5F0430D5498CA",
    sk: "SK-thanks",
    webSign: "f65f3a83d6d9ad6f",
    xClient: "8f3d2a1c7b6e5d4c9a0b1f2e3d4c5b6a",
    debug: false
};

function log(...args) {
    if (bubuyingshiConfig.debug) {
        const line = `[bubuyingshi] ${args.map(a => {
            if (typeof a === "string") return a;
            try { return JSON.stringify(a); } catch (_) { return String(a); }
        }).join(" ")}`;
        console.log(line);
        try {
            fs.appendFileSync(DEBUG_LOG_FILE, `${new Date().toISOString()} ${line}\n`);
        } catch (_) {}
    }
}

function logReq(req, stage, extra = {}) {
    try {
        const q = (req && req.query) || {};
        const payload = {
            stage,
            method: req && req.method,
            url: req && req.url,
            path: req && req.path,
            ac: q.ac,
            t: q.t,
            pg: q.pg,
            wd: q.wd,
            ids: q.ids,
            hasPlay: !!q.play,
            hasToken: !!q.token,
            tokenPrefix: q.token ? String(q.token).slice(0, 6) : "",
            ua: req && req.headers ? req.headers["user-agent"] : "",
            referer: req && req.headers ? (req.headers.referer || req.headers.referrer || "") : "",
            ...extra
        };
        log("REQ", payload);
    } catch (e) {
        log("logReq error:", e.message || String(e));
    }
}

function logResp(stage, data) {
    try {
        const summary = {
            stage,
            hasClass: Array.isArray(data && data.class),
            classLen: Array.isArray(data && data.class) ? data.class.length : 0,
            hasFilters: !!(data && data.filters),
            filtersKeys: data && data.filters ? Object.keys(data.filters).length : 0,
            listLen: Array.isArray(data && data.list) ? data.list.length : 0,
            page: data && data.page,
            pagecount: data && data.pagecount,
            total: data && data.total
        };
        log("RESP", summary);
    } catch (e) {
        log("logResp error:", e.message || String(e));
    }
}

function clearDebugLog() {
    try {
        fs.writeFileSync(DEBUG_LOG_FILE, "");
    } catch (_) {}
}

function createSignData() {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = `${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 90 + 10)}`;

    const signString =
        `finger=${bubuyingshiConfig.finger}` +
        `&id=${bubuyingshiConfig.pkg}` +
        `&nonce=${nonce}` +
        `&sk=${bubuyingshiConfig.sk}` +
        `&time=${timestamp}` +
        `&v=${bubuyingshiConfig.ver}`;

    const sign = crypto
        .createHash("sha256")
        .update(signString)
        .digest("hex")
        .toUpperCase();

    return { timestamp, nonce, sign };
}

function getAppHeaders() {
    const { timestamp, nonce, sign } = createSignData();
    return {
        "User-Agent": "okhttp/4.12.0",
        "Accept": "application/json",
        "x-aid": bubuyingshiConfig.pkg,
        "x-time": timestamp,
        "x-sign": sign,
        "x-nonc": nonce,
        "x-ave": bubuyingshiConfig.ver
    };
}

function getWebHeaders() {
    const { timestamp, nonce, sign } = createSignData();
    return {
        "User-Agent": "okhttp/4.12.0",
        "Accept": "application/json",
        "x-aid": bubuyingshiConfig.pkg,
        "x-time": timestamp,
        "x-sign": sign,
        "x-nonc": nonce,
        "x-ave": bubuyingshiConfig.ver,
        "web-sign": bubuyingshiConfig.webSign,
        "X-Client": bubuyingshiConfig.xClient
    };
}

function convertJsonToVods(videoList) {
    const toText = (v) => {
        if (Array.isArray(v)) return v.filter(Boolean).join("/");
        if (v === null || v === undefined) return "";
        return String(v);
    };

    return (videoList || []).map(item => ({
        vod_id: String(item.vod_id || item.id || ""),
        vod_name: item.vod_name || item.name || "",
        vod_pic: item.vod_pic || item.pic || "",
        vod_remarks: item.vod_remarks || item.vod_duration || item.remark || "",
        type_name: toText(item.vod_class || item.type_name || item.class || ""),
        vod_year: toText(item.vod_year || item.year || ""),
        vod_area: toText(item.vod_area || item.area || "")
    }));
}

function mapTypeName(typeId) {
    const typeMap = {
        "1": "电影",
        "2": "剧集",
        "3": "动漫",
        "4": "综艺",
        "电影": "电影",
        "剧集": "剧集",
        "动漫": "动漫",
        "综艺": "综艺"
    };
    return typeMap[typeId] || typeId;
}

function cleanHtmlContent(content) {
    if (!content) return "";
    return String(content)
        .replace(/<p>/gi, "")
        .replace(/<\/p>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .trim();
}

function safeSplit(str, sep) {
    if (!str && str !== "") return [];
    return String(str).split(sep);
}

function buildPlayData(vodPlayFrom, vodPlayUrl) {
    const fromList = safeSplit(vodPlayFrom || "", "$$$");
    const urlGroupList = safeSplit(vodPlayUrl || "", "$$$");

    const finalFromList = [];
    const finalUrlGroupList = [];

    const maxLen = Math.max(fromList.length, urlGroupList.length);

    for (let i = 0; i < maxLen; i++) {
        const rawFrom = (fromList[i] || `line${i + 1}`).trim();
        const groupRaw = (urlGroupList[i] || "").trim();

        if (!groupRaw) continue;

        const episodeArr = safeSplit(groupRaw, "#")
            .map(item => String(item || "").trim())
            .filter(Boolean);

        const finalEpisodeArr = [];

        for (const ep of episodeArr) {
            let title = "";
            let rawUrl = "";

            const idx = ep.indexOf("$");
            if (idx >= 0) {
                title = ep.slice(0, idx).trim();
                rawUrl = ep.slice(idx + 1).trim();
            } else {
                title = "播放";
                rawUrl = ep.trim();
            }

            if (!rawUrl) continue;
            if (!title) title = "播放";

            const packedUrl = `${rawFrom}@1@${rawUrl}`;
            finalEpisodeArr.push(`${title}$${packedUrl}`);
        }

        if (finalEpisodeArr.length > 0) {
            const showFrom = `${rawFrom}(${finalEpisodeArr.length})`;
            finalFromList.push(showFrom);
            finalUrlGroupList.push(finalEpisodeArr.join("#"));
        }
    }

    return {
        vod_play_from: finalFromList.join("$$$"),
        vod_play_url: finalUrlGroupList.join("$$$")
    };
}

async function checkSiteAvailable() {
    try {
        const response = await httpClient.get(
            `${bubuyingshiConfig.host}/api.php/app/search/index?wd=测试&page=1&limit=1`,
            {
                headers: getAppHeaders(),
                timeout: 5000
            }
        );
        return !!response.data;
    } catch (error) {
        log("site check failed:", error.message);
        return false;
    }
}

// ========== 修复点：新增首页数据获取函数 ==========
async function getHomeData() {
    try {
        const apiUrl = `${bubuyingshiConfig.host}/api.php/web/index/home`;
        log("home api:", apiUrl);

        const response = await httpClient.get(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "X-Client": bubuyingshiConfig.xClient,
                "web-sign": bubuyingshiConfig.webSign,
                "referer": "https://bubuyingshi.com/",
                "origin": "https://bubuyingshi.com",
                "accept-language": "zh-CN,zh;q=0.9"
            },
            timeout: 10000
        });

        const data = response.data || {};
        const categories = (data.data && data.data.categories) || [];

        const classList = [];
        const list = [];

        categories.forEach(cat => {
            if (cat.type_name) {
                classList.push({
                    type_id: String(cat.type_id || cat.type_name),
                    type_name: cat.type_name
                });
            }
            if (Array.isArray(cat.videos)) {
                cat.videos.forEach(v => {
                    list.push({
                        vod_id: String(v.vod_id || v.id || ""),
                        vod_name: v.vod_name || v.name || "",
                        vod_pic: v.vod_pic || v.pic || "",
                        vod_remarks: v.vod_remarks || v.vod_duration || v.remark || "",
                        type_name: v.vod_class || v.type_name || v.class || cat.type_name || "",
                        vod_year: String(v.vod_year || v.year || ""),
                        vod_area: v.vod_area || v.area || ""
                    });
                });
            }
        });

        return { classList, list };
    } catch (error) {
        log("getHomeData error:", error.message);
        return { classList: [], list: [] };
    }
}
// ===========================================

async function getClassList(typeId, page = 1, ext = {}) {
    const typeName = mapTypeName(typeId);
    const validTypeNames = ["电影", "剧集", "动漫", "综艺"];

    // 某些壳子会传非常规 t（如站点名/随机id），这里兜底到首页聚合避免空列表
    if (!validTypeNames.includes(typeName)) {
        log("unknown typeId fallback:", typeId);
        const categories = ["电影", "剧集", "综艺", "动漫"];
        const results = await Promise.allSettled(
            categories.map(cat => getClassList(cat, 1, { by: "hits" }))
        );
        const list = results.flatMap(r => r.status === "fulfilled" ? (r.value.list || []) : []);
        return {
            list,
            page: 1,
            pagecount: 1
        };
    }

    const apiUrl =
        `${bubuyingshiConfig.host}/api.php/web/filter/vod` +
        `?type_name=${encodeURIComponent(typeName)}` +
        `&page=${page}` +
        `&sort=${encodeURIComponent(ext.by || "hits")}` +
        `&class=${encodeURIComponent(ext.class || "")}` +
        `&area=${encodeURIComponent(ext.area || "")}` +
        `&year=${encodeURIComponent(ext.year || "")}`;

    log("class api:", apiUrl);

    const response = await httpClient.get(apiUrl, {
        headers: getWebHeaders()
    });

    const data = response.data || {};
    let list = convertJsonToVods(data.data || []);
    let pageCount = parseInt(data.pageCount, 10) || page;

    if (!list.length && page === 1) {
        log("class empty fallback:", typeId, typeName);
        const categories = ["电影", "剧集", "综艺", "动漫"];
        const results = await Promise.allSettled(
            categories.map(cat => getClassList(cat, 1, { by: "hits" }))
        );
        list = results.flatMap(r => r.status === "fulfilled" ? (r.value.list || []) : []);
        pageCount = 1;
    }

    if (list.length >= 10 && pageCount <= page) {
        pageCount = page + 1;
    }

    return {
        list,
        page,
        pagecount: pageCount
    };
}

async function searchVod(keyword, page = 1) {
    const apiUrl =
        `${bubuyingshiConfig.host}/api.php/app/search/index` +
        `?wd=${encodeURIComponent(keyword)}` +
        `&page=${page}` +
        `&limit=15`;

    log("search api:", apiUrl);

    const response = await httpClient.get(apiUrl, {
        headers: getAppHeaders()
    });

    const data = response.data || {};

    return {
        list: convertJsonToVods(data.data || []),
        page,
        pagecount: parseInt(data.pageCount, 10) || page
    };
}

async function getVodDetail(vodId) {
    try {
        const apiUrl =
            `${bubuyingshiConfig.host}/api.php/web/vod/get_detail?vod_id=${encodeURIComponent(vodId)}`;

        log("detail api:", apiUrl);

        const response = await httpClient.get(apiUrl, {
            headers: getWebHeaders()
        });

        const data = response.data || {};
        let detail = data.data || null;

        if (Array.isArray(detail)) {
            detail = detail[0] || null;
        }

        if (!detail) {
            log("detail empty:", vodId);
            return null;
        }

        const rawPlayFrom = detail.vod_play_from || "";
        const rawPlayUrl = detail.vod_play_url || "";

        const playData = buildPlayData(rawPlayFrom, rawPlayUrl);

        return {
            vod_id: String(detail.vod_id || vodId),
            vod_name: detail.vod_name || "",
            vod_pic: detail.vod_pic || "",
            vod_remarks: detail.vod_remarks || detail.vod_duration || "",
            vod_year: detail.vod_year || "",
            vod_area: detail.vod_area || "",
            vod_actor: detail.vod_actor || "",
            vod_director: detail.vod_director || "",
            vod_content: cleanHtmlContent(detail.vod_content || ""),
            type_name: detail.vod_class || detail.type_name || "",
            vod_play_from: playData.vod_play_from,
            vod_play_url: playData.vod_play_url
        };
    } catch (error) {
        log("getVodDetail error:", error.message);
        return null;
    }
}

function extractDecodeUrl(respData) {
    if (!respData) return "";

    if (typeof respData.data === "string" && respData.data) {
        return respData.data;
    }

    if (respData.data && typeof respData.data.url === "string" && respData.data.url) {
        return respData.data.url;
    }

    if (typeof respData.url === "string" && respData.url) {
        return respData.url;
    }

    return "";
}

async function getVodPlayUrl(playInput) {
    try {
        if (!playInput) {
            return { parse: 0, jx: 0, url: "" };
        }

        let playFrom = "";
        let rawUrl = "";
        let needDecode = false;

        const m = /^([^@]+)@([01])@([\s\S]+)$/.exec(playInput);
        if (m) {
            playFrom = m[1];
            needDecode = m[2] === "1";
            rawUrl = m[3];
        } else if (/^https?:\/\//i.test(playInput)) {
            rawUrl = playInput;
            needDecode = false;
        } else {
            rawUrl = playInput;
            needDecode = true;
        }

        let finalUrl = rawUrl;

        if (needDecode && playFrom && rawUrl) {
            const decodeApi =
                `${bubuyingshiConfig.host}/api.php/app/decode/url/` +
                `?url=${encodeURIComponent(rawUrl)}` +
                `&vodFrom=${encodeURIComponent(playFrom)}`;

            log("decode api:", decodeApi);

            const response = await httpClient.get(decodeApi, {
                headers: getAppHeaders()
            });

            const decoded = extractDecodeUrl(response.data);
            if (decoded) {
                finalUrl = decoded;
            }
        }

        const needJx = /(iqiyi\.com|v\.qq\.com|youku\.com|mgtv\.com|bilibili\.com)/i.test(finalUrl) ? 1 : 0;

        return {
            parse: 0,
            jx: needJx,
            url: finalUrl,
            header: {
                "User-Agent": "okhttp/4.12.0"
            }
        };
    } catch (error) {
        log("getVodPlayUrl error:", error.message);
        return {
            parse: 0,
            jx: 0,
            url: playInput || "",
            header: {
                "User-Agent": "okhttp/4.12.0"
            }
        };
    }
}

// ========== 修复点：完善动态年份及分类筛选逻辑 ==========
const generateYears = (typeName) => {
    const currentYear = new Date().getFullYear();
    const years = [{ "n": "全部", "v": "" }];
    if (typeName === '电影') {
        for (let y = currentYear; y >= 2016; y--) years.push({ "n": String(y), "v": String(y) });
        ['2015-2011', '2010-2000', '90年代', '80年代', '更早'].forEach(i => years.push({ "n": i, "v": i }));
    } else if (typeName === '剧集') {
        for (let y = currentYear; y >= 2021; y--) years.push({ "n": String(y), "v": String(y) });
        ['2020-2016', '2015-2011', '2010-2000', '更早'].forEach(i => years.push({ "n": i, "v": i }));
    } else {
        for (let y = currentYear; y >= 2011; y--) years.push({ "n": String(y), "v": String(y) });
        years.push({ "n": "更早", "v": "更早" });
    }
    return years;
};

const FILTER_CONFIG = {
    "电影": [
        { key: "class", name: "类型", value: [{ n: "全部", v: "" }, ...["动作", "喜剧", "爱情", "科幻", "恐怖", "悬疑", "犯罪", "战争", "动画", "冒险", "历史", "灾难", "纪录", "剧情"].map(i => ({ n: i, v: i }))] },
        { key: "area", name: "地区", value: [{ n: "全部", v: "" }, ...["大陆", "香港", "台湾", "美国", "日本", "韩国", "泰国", "印度", "英国", "法国", "德国", "加拿大", "西班牙", "意大利", "澳大利亚"].map(i => ({ n: i, v: i }))] },
        { key: "year", name: "年份", value: generateYears('电影') },
        { key: "by", name: "排序", value: [{ n: "最热", v: "hits" }, { n: "最新", v: "time" }, { n: "评分", v: "score" }] }
    ],
    "剧集": [
        { key: "class", name: "类型", value: [{ n: "全部", v: "" }, ...["爱情", "古装", "武侠", "历史", "家庭", "喜剧", "悬疑", "犯罪", "战争", "奇幻", "科幻", "恐怖"].map(i => ({ n: i, v: i }))] },
        { key: "area", name: "地区", value: [{ n: "全部", v: "" }, ...["大陆", "香港", "台湾", "美国", "日本", "韩国", "泰国", "英国"].map(i => ({ n: i, v: i }))] },
        { key: "year", name: "年份", value: generateYears('剧集') },
        { key: "by", name: "排序", value: [{ n: "最热", v: "hits" }, { n: "最新", v: "time" }, { n: "评分", v: "score" }] }
    ],
    "动漫": [
        { key: "class", name: "类型", value: [{ n: "全部", v: "" }, ...["冒险", "奇幻", "科幻", "武侠", "悬疑"].map(i => ({ n: i, v: i }))] },
        { key: "area", name: "地区", value: [{ n: "全部", v: "" }, ...["大陆", "日本", "欧美"].map(i => ({ n: i, v: i }))] },
        { key: "year", name: "年份", value: generateYears('动漫') },
        { key: "by", name: "排序", value: [{ n: "最热", v: "hits" }, { n: "最新", v: "time" }, { n: "评分", v: "score" }] }
    ],
    "综艺": [
        { key: "class", name: "类型", value: [{ n: "全部", v: "" }, ...["真人秀", "音乐", "脱口秀", "歌舞", "爱情"].map(i => ({ n: i, v: i }))] },
        { key: "area", name: "地区", value: [{ n: "全部", v: "" }, ...["大陆", "香港", "台湾", "美国", "日本", "韩国"].map(i => ({ n: i, v: i }))] },
        { key: "year", name: "年份", value: generateYears('综艺') },
        { key: "by", name: "排序", value: [{ n: "最热", v: "hits" }, { n: "最新", v: "time" }, { n: "评分", v: "score" }] }
    ]
};
// ===========================================

async function handleBubuyingshiRequest(req) {
    const query = req.query || {};
    const ac = query.ac;
    const t = query.t;
    const ids = query.ids;
    const play = query.play;
    const wd = query.wd;
    const pg = Math.max(parseInt(query.pg, 10) || 1, 1);

    log("incoming query:", JSON.stringify({
        ac,
        t,
        wd,
        ids,
        hasPlay: !!play,
        pg,
        hasToken: !!query.token
    }));

    const ext = {
        class: query.class || "",
        area: query.area || "",
        year: query.year || "",
        by: query.by || "hits"
    };

    if (play) {
        return await getVodPlayUrl(play);
    }

    if (ids) {
        const detail = await getVodDetail(ids);
        return {
            list: detail ? [detail] : []
        };
    }

    if (wd) {
        return await searchVod(wd, pg);
    }

    if (t && String(t) !== "0") {
        return await getClassList(t, pg, ext);
    }

    // ========== 修复点：正确处理首页加载逻辑 ==========
    if (!ac || ac === "class" || ac === "list" || ac === "home") {
        const homeData = await getHomeData();
        let classes = homeData.classList;

        if (!classes || classes.length === 0) {
            classes = [
                { type_id: "1", type_name: "电影" },
                { type_id: "2", type_name: "剧集" },
                { type_id: "3", type_name: "动漫" },
                { type_id: "4", type_name: "综艺" }
            ];
        }

        let homeList = homeData.list || [];
        if (!homeList.length) {
            const categories = ["电影", "剧集", "综艺", "动漫"];
            const results = await Promise.allSettled(
                categories.map(cat => getClassList(cat, 1, { by: "hits" }))
            );
            homeList = results.flatMap(r => r.status === "fulfilled" ? (r.value.list || []) : []);
        }

        return {
            class: classes,
            filters: FILTER_CONFIG,
            list: homeList,
            page: 1,
            pagecount: 1,
            limit: homeList.length,
            total: homeList.length
        };
    }

    if (ac === "videolist") {
        const homeData = await getHomeData();
        let list = homeData.list || [];

        if (!list.length) {
            const categories = ["电影", "剧集", "综艺", "动漫"];
            const results = await Promise.allSettled(
                categories.map(cat => getClassList(cat, 1, { by: "hits" }))
            );
            list = results.flatMap(r => r.status === "fulfilled" ? (r.value.list || []) : []);
        }

        let classes = homeData.classList;
        if (!classes || classes.length === 0) {
            classes = [
                { type_id: "1", type_name: "电影" },
                { type_id: "2", type_name: "剧集" },
                { type_id: "3", type_name: "动漫" },
                { type_id: "4", type_name: "综艺" }
            ];
        }

        return {
            class: classes,
            filters: FILTER_CONFIG,
            list,
            page: 1,
            pagecount: 1,
            limit: list.length,
            total: list.length
        };
    }

    return { list: [] };
}

module.exports = async (app, opt) => {
    const ok = await checkSiteAvailable();

    if (!ok) {
        log("site is not reachable or headers may be invalid:", bubuyingshiConfig.host);
    }

    const apiPath = "/video/bubuyingshi";
    const apiAliasPath = "/video/影视";
    const apiAliasPathEn = "/video/yingshi";

    const handler = async (req, reply) => {
        try {
            if (req && req.query && String(req.query.debug_clear || "") === "1") {
                clearDebugLog();
                logReq(req, "debug_clear");
                const out = { ok: true, message: "debug log cleared", logFile: DEBUG_LOG_FILE };
                logResp("debug_clear", out);
                return out;
            }

            logReq(req, "handler_enter");
            const out = await handleBubuyingshiRequest(req);
            logResp("handler_exit", out || {});
            return out;
        } catch (error) {
            logReq(req, "handler_error", { error: error.message || String(error) });
            log("request error:", error.message);
            return { list: [] };
        }
    };

    app.get(apiPath, handler);
    app.get(apiAliasPath, handler);
    app.get(apiAliasPathEn, handler);

    opt.sites.push({
        key: "bubuyingshi_node_v6",
        name: "布布影视[优]",
        type: 4,
        api: apiPath,
        searchable: 1,
        filterable: 1,
        ext: ""
    });
};