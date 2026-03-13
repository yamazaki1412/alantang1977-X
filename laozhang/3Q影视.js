let host = 'https://qqqys.com';
let headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'accept-language': 'zh-CN,zh;q=0.9',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': "?0",
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': "empty",
    'sec-fetch-mode': "cors",
    'sec-fetch-site': "same-origin",
    'referer': host + '/', // 补充referer提升请求成功率
    'origin': host // 补充origin头
};

// 补全缺失的req请求函数（适配常见的爬虫请求逻辑）
async function req(url, options = {}) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: options.headers || headers,
            timeout: options.timeout || 30000,
            redirect: 'follow' // 跟随重定向
        });
        if (!response.ok) {
            throw new Error(`HTTP请求失败: ${response.status}`);
        }
        const content = await response.text();
        return { content, status: response.status };
    } catch (error) {
        console.error('请求异常:', error);
        // 抛出错误让上层捕获，保证错误可追溯
        throw error;
    }
}

async function init(cfg) {}

/**
 * 辅助函数：将API返回的视频列表转为标准vod格式（增强空值处理）
 */
function json2vods(arr) {
    // 处理空数组/非数组情况
    if (!Array.isArray(arr) || arr.length === 0) {
        return [];
    }
    let videos = [];
    for (const i of arr) {
        // 跳过空数据项
        if (!i || typeof i !== 'object') continue;
        let type_name = i.type_name || '';
        if (i.vod_class) {
            type_name = type_name ? `${type_name},${i.vod_class}` : i.vod_class;
        }
        // 核心字段空值兜底
        videos.push({
            'vod_id': (i.vod_id || '').toString(),
            'vod_name': i.vod_name || '未知名称',
            'vod_pic': i.vod_pic || '',
            'vod_remarks': i.vod_remarks || '',
            'type_name': type_name,
            'vod_year': i.vod_year || ''
        });
    }
    return videos;
}

/**
 * 首页数据获取（增强错误处理）
 */
async function home(filter) {
    try {
        let url = host + '/api.php/index/home';
        let resp = await req(url, { headers: headers });
        let json = JSON.parse(resp.content);
        // 兼容API返回非预期格式
        if (!json || !json.data || !Array.isArray(json.data.categories)) {
            return JSON.stringify({ class: [], list: [], filters: {} });
        }
        let categories = json.data.categories;

        let classes = [];
        let videos = [];

        for (const i of categories) {
            if (!i || !i.type_name) continue;
            classes.push({
                'type_id': i.type_name,
                'type_name': i.type_name
            });
            videos.push(...json2vods(i.videos || []));
        }

        return JSON.stringify({
            class: classes,
            list: videos,
            filters: {}
        });
    } catch (error) {
        console.error('home接口异常:', error);
        // 保证返回合法JSON结构
        return JSON.stringify({ class: [], list: [], filters: {} });
    }
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

/**
 * 分类数据获取（增强参数校验/错误处理）
 */
async function category(tid, pg, filter, extend) {
    try {
        // 参数兜底：页码默认1
        const page = pg && !isNaN(parseInt(pg)) ? parseInt(pg) : 1;
        // 分类ID空值兜底
        if (!tid) {
            return JSON.stringify({ list: [], page: 1, pagecount: 0 });
        }
        let url = `${host}/api.php/filter/vod?type_name=${encodeURIComponent(tid)}&page=${page}&sort=hits`;
        let resp = await req(url, { headers: headers });
        let json = JSON.parse(resp.content);
        // 兼容API返回格式
        const data = json.data || [];
        const pageCount = json.pageCount || 0;

        return JSON.stringify({
            list: json2vods(data),
            page: page,
            pagecount: parseInt(pageCount) || 0
        });
    } catch (error) {
        console.error('category接口异常:', error);
        return JSON.stringify({ list: [], page: 1, pagecount: 0 });
    }
}

/**
 * 搜索功能（增强参数校验/错误处理）
 */
async function search(wd, quick, pg) {
    try {
        // 参数兜底
        const page = pg && !isNaN(parseInt(pg)) ? parseInt(pg) : 1;
        const keyword = wd || '';
        if (!keyword) {
            return JSON.stringify({ list: [], page: 1, pagecount: 0 });
        }
        let url = `${host}/api.php/search/index?wd=${encodeURIComponent(keyword)}&page=${page}&limit=15`;
        let resp = await req(url, { headers: headers });
        let json = JSON.parse(resp.content);
        const data = json.data || [];
        const pageCount = json.pageCount || 0;

        return JSON.stringify({
            list: json2vods(data),
            page: page,
            pagecount: parseInt(pageCount) || 0
        });
    } catch (error) {
        console.error('search接口异常:', error);
        return JSON.stringify({ list: [], page: 1, pagecount: 0 });
    }
}

/**
 * 详情页数据（增强边界处理/空值过滤）
 */
async function detail(id) {
    try {
        // 参数校验
        if (!id || isNaN(parseInt(id))) {
            return JSON.stringify({ list: [] });
        }
        let url = `${host}/api.php/vod/get_detail?vod_id=${id}`;
        let resp = await req(url, { headers: headers });
        let json = JSON.parse(resp.content);
        // 兼容API返回格式
        if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
            return JSON.stringify({ list: [] });
        }
        let data = json.data[0];
        let vodplayer = json.vodplayer || [];

        let shows = [];
        let play_urls = [];

        // 空值处理：避免split报错
        const raw_shows = (data.vod_play_from || '').split('$$$').filter(Boolean);
        const raw_urls_list = (data.vod_play_url || '').split('$$$').filter(Boolean);

        // 处理两个数组长度不一致的情况
        const maxLen = Math.min(raw_shows.length, raw_urls_list.length);
        for (let i = 0; i < maxLen; i++) {
            let show_code = raw_shows[i];
            let urls_str = raw_urls_list[i];
            if (!show_code || !urls_str) continue;

            let need_parse = 0;
            let is_show = 0;
            let name = show_code;

            for (const player of vodplayer) {
                if (player && player.from === show_code) {
                    is_show = 1;
                    need_parse = player.decode_status || 0;
                    if (show_code.toLowerCase() !== (player.show || '').toLowerCase()) {
                        name = `${player.show || show_code} (${show_code})`;
                    }
                    break;
                }
            }

            if (is_show === 1) {
                let urls = [];
                let items = urls_str.split('#').filter(Boolean); // 过滤空项
                for (let j = 0; j < items.length; j++) {
                    const item = items[j];
                    if (item.includes('$')) {
                        let parts = item.split('$');
                        // 避免数组越界
                        let episode = parts[0] || `第${j+1}集`;
                        let m_url = parts[1] || '';
                        if (!m_url) continue; // 过滤空链接
                        // 新格式：包含 vod_id 和剧集索引，用于播放时构造解析链接
                        urls.push(`${episode}$${show_code}@${need_parse}@${data.vod_id}@${j}@${m_url}`);
                    }
                }
                if (urls.length > 0) {
                    play_urls.push(urls.join('#'));
                    shows.push(name);
                }
            }
        }

        let video = {
            'vod_id': (data.vod_id || '').toString(),
            'vod_name': data.vod_name || '未知名称',
            'vod_pic': data.vod_pic || '',
            'vod_remarks': data.vod_remarks || '',
            'vod_year': data.vod_year || '',
            'vod_area': data.vod_area || '',
            'vod_actor': data.vod_actor || '',
            'vod_director': data.vod_director || '',
            'vod_content': data.vod_content || '',
            'vod_play_from': shows.join('$$$'),
            'vod_play_url': play_urls.join('$$$'),
            'type_name': data.vod_class || ''
        };

        return JSON.stringify({ list: [video] });
    } catch (error) {
        console.error('detail接口异常:', error);
        return JSON.stringify({ list: [] });
    }
}

/**
 * 播放链接解析（增强参数解析/边界处理）
 */
async function play(flag, id, flags) {
    try {
        // 参数校验
        if (!id) {
            return JSON.stringify({ parse: 0, url: '', header: { 'User-Agent': headers['User-Agent'] } });
        }
        let parts = id.split('@');
        let play_from = '';
        let need_parse = 0;
        let raw_url = '';
        let vod_id = null;
        let index = null;

        // 判断是新格式（至少5段）还是旧格式
        if (parts.length >= 5) {
            // 新格式： play_from@need_parse@vod_id@index@raw_url
            play_from = parts[0] || '';
            need_parse = parts[1] || 0;
            vod_id = parts[2] || null;
            index = parts[3] || null;
            raw_url = parts.slice(4).join('@') || ''; // 处理链接中包含@的情况
        } else if (parts.length >= 3) {
            // 旧格式兼容
            play_from = parts[0] || '';
            need_parse = parts[1] || 0;
            raw_url = parts[2] || '';
        } else {
            // 格式不合法，直接返回原始链接
            raw_url = id;
        }

        let jx = 0;
        let final_url = raw_url || '';

        if (need_parse === '1' && play_from && raw_url) {
            if (vod_id) {
                // 新格式：返回站内播放页链接，由外部解析器处理
                final_url = `${host}/play/${vod_id}#sid=${play_from}&nid=${index || 0}`;
                jx = 1;
            } else {
                // 旧格式：尝试原有解码接口（可能已失效，保留作为降级）
                let auth_token = '';
                let decode_success = false;
                for (let i = 0; i < 2; i++) {
                    try {
                        let apiUrl = `${host}/api.php/decode/url/?url=${encodeURIComponent(raw_url)}&vodFrom=${play_from}${auth_token}`;
                        let resp = await req(apiUrl, { headers: headers, timeout: 30000 });
                        let json = JSON.parse(resp.content);
                        if (json.code === 2 && json.challenge) {
                            let token = eval(json.challenge); // 注意：eval有安全风险，保留原有逻辑
                            auth_token = `&token=${token}`;
                            continue;
                        }
                        let play_url = json.data || '';
                        if (play_url && play_url.startsWith('http')) {
                            final_url = play_url;
                            decode_success = true;
                            break;
                        }
                    } catch (e) {
                        console.error('解码重试异常:', e);
                    }
                }
                // 解码失败时兜底
                if (!decode_success) {
                    final_url = raw_url;
                    // 识别主流视频平台链接，标记需要外部解析
                    if (/(?:www\.iqiyi|v\.qq|v\.youku|www\.mgtv|www\.bilibili)\.com/.test(raw_url)) {
                        jx = 1;
                    }
                }
            }
        } else {
            // 无需解码时，识别主流平台链接需要外部解析
            if (/(?:www\.iqiyi|v\.qq|v\.youku|www\.mgtv|www\.bilibili)\.com/.test(final_url)) {
                jx = 1;
            }
        }

        return JSON.stringify({
            parse: jx,
            url: final_url,
            header: { 'User-Agent': headers['User-Agent'] }
        });
    } catch (error) {
        console.error('play接口异常:', error);
        // 异常时返回合法结构，避免播放器崩溃
        return JSON.stringify({
            parse: 0,
            url: '',
            header: { 'User-Agent': headers['User-Agent'] }
        });
    }
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        search: search,
        detail: detail,
        play: play
    };
}
