/**
 * Gaze 影视 — https://gaze.run/
 *
 * 纯 WebView DOM 模式：通过浏览器渲染页面后直接解析 DOM 获取数据，
 * 不调用后端 API，所有数据均从页面元素中提取。
 *
 * @config
 * debug: true
 * returnType: dom
 * timeout: 30
 * blockImages: true
 * blockList: *google*|*facebook*|*analytics*|*beacon*|*advertisement*
 */
var BASE = 'https://gaze.run';


/* ---------------- 路由定义(quickjs执行) ---------------- */
var routes = {
	homeContent: function () { return BASE + '/filter'; },
	detailContent: function (ids) {
		var mid = Array.isArray(ids) ? ids[0] || '' : ids || '';
		return BASE + '/play/' + mid;
	}
}


/* ---------------- 爬虫方法 ---------------- */
function init(cfg) {
    return {};
}

/**
 * 首页分类
 */
async function homeContent(filter) {
	const commonFilters = [
		{ key: "tag", name: "类型", value: [{n:"全部",v:""},{n:"剧情",v:"1"},{n:"动作",v:"2"},{n:"喜剧",v:"3"},{n:"爱情",v:"4"},{n:"科幻",v:"5"},{n:"悬疑",v:"6"},{n:"惊悚",v:"7"},{n:"恐怖",v:"8"},{n:"犯罪",v:"9"},{n:"音乐",v:"10"},{n:"冒险",v:"11"},{n:"历史",v:"12"},{n:"战争",v:"13"},{n:"奇幻",v:"14"},{n:"黑帮",v:"15"},{n:"文艺",v:"16"},{n:"传记",v:"17"},{n:"运动",v:"18"},{n:"同性",v:"19"},{n:"情色",v:"20"}] },
		{ key: "mcountry", name: "地区", value: [{n:"全部",v:""},{n:"中国大陆",v:"1"},{n:"中国台湾",v:"2"},{n:"中国香港",v:"3"},{n:"韩国",v:"4"},{n:"俄罗斯",v:"5"},{n:"美国",v:"6"},{n:"日本",v:"7"},{n:"印度",v:"8"},{n:"英国",v:"9"},{n:"德国",v:"10"},{n:"法国",v:"11"},{n:"意大利",v:"12"},{n:"泰国",v:"13"},{n:"爱沙尼亚",v:"14"},{n:"哈萨克斯坦",v:"15"},{n:"西班牙",v:"16"},{n:"黎巴嫩",v:"17"},{n:"巴西",v:"18"},{n:"澳大利亚",v:"19"},{n:"丹麦",v:"20"},{n:"瑞典",v:"21"},{n:"以色列",v:"22"},{n:"荷兰",v:"23"},{n:"伊朗",v:"24"},{n:"墨西哥",v:"25"},{n:"奥地利",v:"26"},{n:"智利",v:"27"},{n:"马来西亚",v:"28"},{n:"哥伦比亚",v:"29"},{n:"挪威",v:"30"},{n:"爱尔兰",v:"31"},{n:"罗马尼亚",v:"32"},{n:"比利时",v:"33"},{n:"瑞士",v:"34"},{n:"加拿大",v:"35"}] },
		{ key: "year", name: "年份", value: [{n:"全部",v:""},{n:"2026",v:"2026"},{n:"2025",v:"2025"},{n:"2024",v:"2024"},{n:"2023",v:"2023"},{n:"2022",v:"2022"},{n:"2021",v:"2021"},{n:"2020",v:"2020"},{n:"2019",v:"2019"},{n:"2018",v:"2018"},{n:"2017",v:"2017"},{n:"2016",v:"2016"},{n:"2015",v:"2015"},{n:"2014",v:"2014"},{n:"2013",v:"2013"},{n:"2012",v:"2012"},{n:"2011",v:"2011"},{n:"2010",v:"2010"},{n:"2009",v:"2009"},{n:"2008",v:"2008"},{n:"2007",v:"2007"},{n:"2006",v:"2006"},{n:"2005",v:"2005"},{n:"2004",v:"2004"},{n:"2003",v:"2003"},{n:"2002",v:"2002"},{n:"2001",v:"2001"},{n:"2000",v:"2000"},{n:"1999",v:"1999"},{n:"1998",v:"1998"},{n:"1997",v:"1997"},{n:"1996",v:"1996"},{n:"1995",v:"1995"},{n:"1994",v:"1994"},{n:"1993",v:"1993"},{n:"1992",v:"1992"},{n:"1991",v:"1991"},{n:"1990",v:"1990"},{n:"1989",v:"1989"},{n:"1988",v:"1988"},{n:"1987",v:"1987"},{n:"1986",v:"1986"},{n:"1985",v:"1985"},{n:"1984",v:"1984"},{n:"1983",v:"1983"},{n:"1982",v:"1982"},{n:"1981",v:"1981"},{n:"1980",v:"1980"},{n:"1979",v:"1979"},{n:"1978",v:"1978"},{n:"1977",v:"1977"},{n:"1976",v:"1976"},{n:"1975",v:"1975"},{n:"1974",v:"1974"},{n:"1973",v:"1973"}] },
		{ key: "sort", name: "排序", value: [{n:"默认排序",v:"default"},{n:"评分排序",v:"grade"},{n:"名称排序",v:"name"},{n:"添加时间排序",v:"createtime"},{n:"修改时间排序",v:"updatetime"}] }
	];

	const filterConfig = {
		class: [
			{ type_id: "56,55,58,200,261,292,264,340,168,398,214,87,216,22,199,47,202,89,280,60,120,397,119,201,283,254,217,57,165,301,289,203,353,276,215,63,59,356,224,198,277,205,67,195,109,4,35,162,187,40,38,313,241,333,291,61,395,256,324,30,62,426,18,6,16,66,284,64,365,118", type_name: "豆瓣TOP250" },
			{ type_id: "1", type_name: "电影" },
			{ type_id: "2", type_name: "电视剧" },
			{ type_id: "bangumi", type_name: "番剧" },
			{ type_id: "chinese_cartoon", type_name: "国漫" }
		],
		filters: {
			"1": commonFilters,
			"2": commonFilters,
			"bangumi": commonFilters,
			"chinese_cartoon": commonFilters
		}
	};
	return filterConfig;
}

/**
 * 首页推荐列表
 */
async function homeVideoContent() {
	const res = parseVideoList();
	return { list: res.vods}
}

/**
 * 分类筛选列表
 */
async function categoryContent(tid, pg, filter, extend) {
	var ext = extend || {};
	var isAlbum = tid && tid.includes(',');
	var params = isAlbum ? {
		mform: 'all',
		mcountry: 'all',
		tag_arr: 'all',
		page: pg,
		years: 'all',
		album: tid
	} : {
		mform: tid || 'all',
		mcountry: ext.area || 'all',
		tag_arr: ext.tag || 'all',
		page: pg,
		sort: ext.sort || 'updatetime',
		years: ext.year || 'all'
	};
	
	const res = await parseVideoList(params);
	return {
		code: 1,
		msg: '数据列表',
		list: res.vods,
		page: pg,
		pagecount: res.pages,
		limit: res.vods.length,
		total: res.total
	};
}

/**
 * 详情页
 */
async function detailContent(ids) {
    const vod_name = document.querySelector('.grade')?.textContent?.trim() || '';
    const vod_pic = document.querySelector('.pimgs')?.getAttribute('src') || '';
    
    const badges = Array.from(document.querySelectorAll('.badge-mts')).map(el => el.textContent.trim());
    const vod_remarks = badges.join('/');

    const gradeEl = document.querySelector('.grade:last-child');
    const contentEl = document.querySelector('.p-2 p');

    const vod_content = contentEl?.textContent?.trim() || '';

    const playButtons = document.querySelectorAll('.playbtn');
    const episodes = Array.from(playButtons).map(btn => {
        const epText = btn.textContent.trim();
        const dataId = btn.getAttribute('data-id');
        return `${epText}$${ids[0]}:${dataId}`;
    });

    const vod_play_from = 'Gaze';
    const vod_play_url = episodes.join('#');
    return {
        list: [{
			vod_id: ids[0],
			vod_name: vod_name,
			vod_pic: vod_pic,
			vod_remarks: vod_remarks,
			vod_content: vod_content,
			vod_play_from: vod_play_from,
			vod_play_url: vod_play_url
		}]
    };
}

/**
 * 搜索
 */
async function searchContent(key, quick, pg) {
    const res = await parseVideoList({ page: pg, title: key });
    return {
		code: 1,
		msg: '数据列表',
		list: res.vods,
		page: pg,
		pagecount: res.pages,
		limit: res.vods.length,
		total: res.total
	};
}

/**
 * 播放
 */
async function playerContent(flag, id, vipFlags) {
    Java.showToast('请稍后..页面加载中~');
    const ids = id.split(':');
    const clickScript = `(function(){var n=0;function t(){var b=document.querySelector('button[data-id="${ids[1]}"]');if(b){b.click();return}if(++n<15)setTimeout(t,300)}setTimeout(t,300)})();`;
    return {
        type: 'wvplayer',
        url: BASE + '/play/' + ids[0],
        script: clickScript
    };
}


/* ---------------- 工具函数 ---------------- */

/**
 * 提取视频列表
 */
async function parseVideoList(params = {}) {
    const vods = [];
    const hArray = document.documentElement.outerHTML.match(/filter_movielist[\s\S]{0,200}?'([a-f0-9]{16})':\s*'([a-f0-9]{32})'/);

    const defaultParams = { mform: 'all', mcountry: 'all', tag_arr: 'all', page: '1', sort: 'default', album: 'all', title: '', years: 'all' };
    const mergedParams = { ...defaultParams, ...params };
    const bodyString = Object.entries(mergedParams).map(([key, value]) => {
		return (key === 'tag_arr') ? `tag_arr%5B%5D=${encodeURIComponent(value)}` : `${key}=${encodeURIComponent(value)}`;
	}).join('&');
    
    const res = await fetch("https://gaze.run/filter_movielist", {
        method: 'POST',
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            [hArray[1]]: hArray[2],
            "origin": "https://gaze.run",
        },
        body: bodyString
    });
    
    const data = await res.json();
    if (data.mlist && Array.isArray(data.mlist)) {
        vods.push(...data.mlist.map(item => ({
            vod_id: item.mid,
            vod_name: item.title,
            vod_pic: item.cover_img,
            vod_remarks: item.grade ? `豆瓣${item.grade}` : '',
            vod_year: item.definition,
            vod_definition: item.definition
        })));
    }

    return { vods, total: data.total, pages: data.pages };
}