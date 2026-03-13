let HOSTS = [
    'https://www.qqqys.com',
    'https://qqqys.com'
]

let host = HOSTS[0]

let headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': host,
    'Origin': host,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9'
}

async function init(cfg) {
}

/* 自动请求（带域名容错） */
async function request(path) {

    for (let h of HOSTS) {

        try {

            let url = h + path

            let resp = await req(url, {
                headers: {
                    ...headers,
                    Referer: h,
                    Origin: h
                },
                timeout: 10000
            })

            if (resp && resp.content) {

                host = h
                return resp.content

            }

        } catch (e) {
        }
    }

    return '{}'
}

/* 转换视频数据 */
function json2vods(arr) {

    let videos = []

    if (!arr) return videos

    for (const i of arr) {

        let type_name = i.type_name || ''

        if (i.vod_class) type_name += ',' + i.vod_class

        videos.push({
            vod_id: String(i.vod_id),
            vod_name: i.vod_name,
            vod_pic: i.vod_pic,
            vod_remarks: i.vod_remarks,
            vod_year: i.vod_year,
            type_name: type_name
        })
    }

    return videos
}

/* 首页 */
async function home(filter) {

    let content = await request('/api.php/index/home')

    let json = JSON.parse(content || '{}')

    let categories = json?.data?.categories || []

    let classes = []
    let videos = []

    for (const i of categories) {

        classes.push({
            type_id: i.type_name,
            type_name: i.type_name
        })

        videos.push(...json2vods(i.videos))
    }

    return JSON.stringify({
        class: classes,
        list: videos,
        filters: {}
    })
}

/* 首页推荐 */
async function homeVod() {
    return JSON.stringify({ list: [] })
}

/* 分类 */
async function category(tid, pg, filter, extend) {

    let path = `/api.php/filter/vod?type_name=${encodeURIComponent(tid)}&page=${pg}&sort=hits`

    let content = await request(path)

    let json = JSON.parse(content || '{}')

    return JSON.stringify({
        list: json2vods(json?.data),
        page: parseInt(pg),
        pagecount: json?.pageCount || 1
    })
}

/* 搜索 */
async function search(wd, quick, pg) {

    let path = `/api.php/search/index?wd=${encodeURIComponent(wd)}&page=${pg}&limit=15`

    let content = await request(path)

    let json = JSON.parse(content || '{}')

    return JSON.stringify({
        list: json2vods(json?.data),
        page: parseInt(pg),
        pagecount: json?.pageCount || 1
    })
}

/* 详情 */
async function detail(id) {

    let content = await request(`/api.php/vod/get_detail?vod_id=${id}`)

    let json = JSON.parse(content || '{}')

    let data = json?.data?.[0] || {}

    let shows = []
    let play_urls = []

    let raw_shows = (data.vod_play_from || '').split('$$$')

    let raw_urls = (data.vod_play_url || '').split('$$$')

    for (let i = 0; i < raw_shows.length; i++) {

        let show = raw_shows[i]

        let urls = raw_urls[i] || ''

        let items = urls.split('#')

        let eps = []

        for (let j = 0; j < items.length; j++) {

            let item = items[j]

            if (!item.includes('$')) continue

            let parts = item.split('$')

            let ep = parts[0]

            eps.push(`${ep}$${data.vod_id}@${j}`)
        }

        if (eps.length > 0) {

            shows.push(show)

            play_urls.push(eps.join('#'))
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
    }

    return JSON.stringify({ list: [video] })
}

/* 播放解析 */
async function play(flag, id, flags) {

    let parts = id.split('@')

    let vod_id = parts[0]

    let index = parts[1] || 0

    let playPage = `${host}/play/${vod_id}#nid=${index}`

    return JSON.stringify({
        parse: 1,
        url: playPage,
        header: {
            'User-Agent': headers['User-Agent'],
            'Referer': host
        }
    })
}

/* 动作接口 */
async function action(actionStr) {

    try {

        let params = JSON.parse(actionStr)

        if (params.action === 'test') {

            return {
                msg: 'Spider OK',
                host: host
            }
        }

    } catch (e) {
    }

    return { list: [] }
}

export function __jsEvalReturn() {

    return {

        init: init,

        home: home,

        homeVod: homeVod,

        category: category,

        search: search,

        detail: detail,

        play: play,

        action: action
    }
}
