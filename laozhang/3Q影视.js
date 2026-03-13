let host = 'https://www.qqqys.com';

let headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': host,
    'accept-language': 'zh-CN,zh;q=0.9'
};

async function init(cfg) {}

/* 转换视频列表 */
function json2vods(arr) {

    let videos = [];

    if (!arr) return videos;

    for (const i of arr) {

        let type_name = i.type_name || '';

        if (i.vod_class) {
            type_name += ',' + i.vod_class;
        }

        videos.push({
            vod_id: String(i.vod_id),
            vod_name: i.vod_name,
            vod_pic: i.vod_pic,
            vod_remarks: i.vod_remarks,
            vod_year: i.vod_year,
            type_name: type_name
        });
    }

    return videos;
}

/* 首页 */
async function home(filter) {

    let url = host + '/api.php/index/home';

    let resp = await req(url, { headers: headers });

    let json = JSON.parse(resp.content || '{}');

    let categories = json?.data?.categories || [];

    let classes = [];
    let videos = [];

    for (const i of categories) {

        classes.push({
            type_id: i.type_name,
            type_name: i.type_name
        });

        videos.push(...json2vods(i.videos));
    }

    return JSON.stringify({
        class: classes,
        list: videos,
        filters: {}
    });
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

/* 分类 */
async function category(tid, pg, filter, extend) {

    let url = `${host}/api.php/filter/vod?type_name=${encodeURIComponent(tid)}&page=${pg}&sort=hits`;

    let resp = await req(url, { headers: headers });

    let json = JSON.parse(resp.content || '{}');

    return JSON.stringify({
        list: json2vods(json?.data),
        page: parseInt(pg),
        pagecount: json?.pageCount || 1
    });
}

/* 搜索 */
async function search(wd, quick, pg) {

    let url = `${host}/api.php/search/index?wd=${encodeURIComponent(wd)}&page=${pg}&limit=15`;

    let resp = await req(url, { headers: headers });

    let json = JSON.parse(resp.content || '{}');

    return JSON.stringify({
        list: json2vods(json?.data),
        page: parseInt(pg),
        pagecount: json?.pageCount || 1
    });
}

/* 详情 */
async function detail(id) {

    let url = `${host}/api.php/vod/get_detail?vod_id=${id}`;

    let resp = await req(url, { headers: headers });

    let json = JSON.parse(resp.content || '{}');

    let data = json?.data?.[0] || {};

    let vodplayer = json?.vodplayer || [];

    let shows = [];
    let play_urls = [];

    let raw_shows = (data.vod_play_from || '').split('$$$');

    let raw_urls_list = (data.vod_play_url || '').split('$$$');

    for (let i = 0; i < raw_shows.length; i++) {

        let show_code = raw_shows[i];

        let urls_str = raw_urls_list[i] || '';

        let need_parse = 0;
        let is_show = 0;
        let name = show_code;

        for (const player of vodplayer) {

            if (player.from === show_code) {

                is_show = 1;

                need_parse = player.decode_status;

                if (show_code.toLowerCase() !== player.show.toLowerCase()) {
                    name = `${player.show} (${show_code})`;
                }

                break;
            }
        }

        if (is_show === 1) {

            let urls = [];

            let items = urls_str.split('#');

            for (let j = 0; j < items.length; j++) {

                let item = items[j];

                if (!item.includes('$')) continue;

                let parts = item.split('$');

                let episode = parts[0];

                let m_url = parts[1];

                urls.push(`${episode}$${show_code}@${need_parse}@${data.vod_id}@${j}@${m_url}`);
            }

            if (urls.length > 0) {

                play_urls.push(urls.join('#'));

                shows.push(name);
            }
        }
    }

    let video = {

        vod_id: String(data.vod_id),

        vod_name: data.vod_name,

        vod_pic: data.vod_pic,

        vod_remarks: data.vod_remarks,

        vod_year: data.vod_year,

        vod_area: data.vod_area,

        vod_actor: data.vod_actor,

        vod_director: data.vod_director,

        vod_content: data.vod_content,

        vod_play_from: shows.join('$$$'),

        vod_play_url: play_urls.join('$$$'),

        type_name: data.vod_class
    };

    return JSON.stringify({ list: [video] });
}

/* 播放 */
async function play(flag, id, flags) {

    let parts = id.split('@');

    let play_from = parts[0];

    let need_parse = parts[1];

    let vod_id = parts[2];

    let index = parts[3];

    let raw_url = parts.slice(4).join('@');

    let final_url = raw_url;

    let jx = 0;

    if (need_parse === '1') {

        final_url = `${host}/play/${vod_id}#sid=${play_from}&nid=${index}`;

        jx = 1;
    }

    if (/(iqiyi|qq|youku|mgtv|bilibili)/.test(final_url)) {
        jx = 1;
    }

    return JSON.stringify({
        parse: jx,
        url: final_url,
        header: {
            'User-Agent': headers['User-Agent'],
            'Referer': host
        }
    });
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
