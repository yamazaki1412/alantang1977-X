let HOST = 'https://www.qqqys.com'

let headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': HOST
}

async function request(url){

    let res = await req(url,{headers:headers})

    return res.content
}

/* 首页 */
async function home(){

    return JSON.stringify({
        class:[
            {type_id:1,type_name:'电影'},
            {type_id:2,type_name:'电视剧'},
            {type_id:3,type_name:'动漫'},
            {type_id:4,type_name:'综艺'}
        ]
    })
}

/* 分类 */
async function category(tid,pg){

    let html = await request(`${HOST}/type/${tid}-${pg}.html`)

    let list=[]

    let reg = /href="\/vod\/(\d+)"[\s\S]*?data-src="(.*?)"[\s\S]*?title="(.*?)"/g

    let m

    while((m=reg.exec(html))!=null){

        list.push({
            vod_id:m[1],
            vod_name:m[3],
            vod_pic:m[2]
        })
    }

    return JSON.stringify({
        list:list,
        page:pg
    })
}

/* 搜索 */
async function search(wd){

    let html = await request(`${HOST}/search/${encodeURIComponent(wd)}`)

    let list=[]

    let reg=/href="\/vod\/(\d+)"[\s\S]*?title="(.*?)"[\s\S]*?data-src="(.*?)"/g

    let m

    while((m=reg.exec(html))!=null){

        list.push({
            vod_id:m[1],
            vod_name:m[2],
            vod_pic:m[3]
        })
    }

    return JSON.stringify({list:list})
}

/* 详情 */
async function detail(id){

    let html = await request(`${HOST}/vod/${id}.html`)

    let title = html.match(/<h1.*?>(.*?)<\/h1>/)?.[1]||''

    let pic = html.match(/class="lazy".*?data-src="(.*?)"/)?.[1]||''

    let desc = html.match(/剧情简介[\s\S]*?<p>([\s\S]*?)<\/p>/)?.[1]||''

    let play=[]

    let reg=/href="\/play\/(\d+)"/g

    let m

    while((m=reg.exec(html))!=null){

        play.push(`播放$${m[1]}`)
    }

    let vod={

        vod_id:id,

        vod_name:title,

        vod_pic:pic,

        vod_content:desc,

        vod_play_from:'3Q',

        vod_play_url:play.join('#')
    }

    return JSON.stringify({list:[vod]})
}

/* 播放 */
async function play(flag,id){

    let html = await request(`${HOST}/play/${id}`)

    let m3u8 = html.match(/(https?:\/\/.*?\.m3u8)/)

    if(m3u8){

        return JSON.stringify({
            parse:0,
            url:m3u8[1]
        })
    }

    return JSON.stringify({
        parse:1,
        url:`${HOST}/play/${id}`
    })
}

export function __jsEvalReturn(){

    return{
        home:home,
        category:category,
        search:search,
        detail:detail,
        play:play
    }
}
