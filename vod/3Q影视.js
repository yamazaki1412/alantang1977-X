/**
 * 3Q影视 爬虫
 * 作者：deepseek
 * 版本：3.0
 * 最后更新：2026-03-13
 * 发布页 https://qqqys.com
 * 
 * @config
 * debug: false
 */

function qqqSpider() {
    const baseUrl = 'https://qqqys.com';
    const apiBase = 'https://c.qqqys.com'; // 统计脚本域名，可能也是API域名
    
    /**
     * 通用请求函数，支持重试和多个备选API
     */
    async function requestWithRetry(urls, options = {}) {
        const urlsArray = Array.isArray(urls) ? urls : [urls];
        
        for (const url of urlsArray) {
            try {
                console.log('尝试请求:', url);
                const res = await Java.req(url, {
                    headers: {
                        'Referer': baseUrl,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        ...options.headers
                    },
                    timeout: options.timeout || 15
                });
                
                if (!res.error && res.body) {
                    // 尝试解析JSON
                    try {
                        const data = JSON.parse(res.body);
                        if (data && (data.code === 200 || data.code === 1 || data.data || data.list)) {
                            console.log('请求成功:', url);
                            return data;
                        }
                    } catch (e) {
                        // 如果不是JSON，返回原始body
                        console.log('返回非JSON数据');
                        return res.body;
                    }
                }
            } catch (e) {
                console.log('请求失败:', url, e);
            }
        }
        
        return null;
    }

    return {
        /**
         * 初始化配置
         */
        async init(cfg) {
            return {
                webview: {
                    debug: true,
                    showWebView: false,
                    widthPercent: 80,
                    heightPercent: 60,
                    keyword: '',
                    returnType: 'dom',
                    timeout: 30,
                    blockImages: true,
                    enableJavaScript: true,
                    header: {
                        'Referer': baseUrl,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                }
            };
        },

        /**
         * 首页分类（从API动态获取，失败则用静态配置）
         */
        async homeContent(filter) {
            try {
                // 尝试从API获取真实分类
                const apiUrls = [
                    `${baseUrl}/api.php/web/index/class`,
                    `${baseUrl}/api/class/list`,
                    `${apiBase}/api/class/list`
                ];
                
                const data = await requestWithRetry(apiUrls);
                
                if (data && data.data && Array.isArray(data.data)) {
                    const classList = data.data.map(item => ({
                        type_id: item.type_id || item.id || item.name,
                        type_name: item.type_name || item.name
                    }));
                    
                    if (classList.length > 0) {
                        return {
                            class: classList,
                            filters: {} // 筛选条件需要另外获取
                        };
                    }
                }
            } catch (e) {
                console.log('获取动态分类失败，使用静态配置');
            }
            
            // 静态分类配置（备用）
            return {
                class: [
                    { type_id: "dianying", type_name: "电影" },
                    { type_id: "juji", type_name: "剧集" },
                    { type_id: "dongman", type_name: "动漫" },
                    { type_id: "zongyi", type_name: "综艺" }
                ],
                filters: {
                    "dianying": [
                        { key: "class", name: "类型", value: [ {n:"全部",v:""}, {n:"动作",v:"动作"}, {n:"喜剧",v:"喜剧"}, {n:"爱情",v:"爱情"} ] },
                        { key: "year", name: "年份", value: [ {n:"全部",v:""}, {n:"2026",v:"2026"}, {n:"2025",v:"2025"}, {n:"2024",v:"2024"} ] },
                        { key: "sort", name: "排序", value: [ {n:"人气",v:"hits"}, {n:"最新",v:"time"}, {n:"评分",v:"score"} ] }
                    ],
                    "juji": [
                        { key: "class", name: "类型", value: [ {n:"全部",v:""}, {n:"古装",v:"古装"}, {n:"爱情",v:"爱情"}, {n:"悬疑",v:"悬疑"} ] },
                        { key: "year", name: "年份", value: [ {n:"全部",v:""}, {n:"2026",v:"2026"}, {n:"2025",v:"2025"}, {n:"2024",v:"2024"} ] },
                        { key: "sort", name: "排序", value: [ {n:"人气",v:"hits"}, {n:"最新",v:"time"}, {n:"评分",v:"score"} ] }
                    ]
                }
            };
        },

        /**
         * 首页推荐视频（从多个数据源聚合）
         */
        async homeVideoContent() {
            const allVideos = [];
            
            // 尝试多个API端点获取首页数据
            const apiUrls = [
                `${baseUrl}/api.php/web/index/home`,
                `${baseUrl}/api/home`,
                `${baseUrl}/api/recommend`,
                `${apiBase}/api/home`,
                `${baseUrl}/index/api/recommend`
            ];
            
            const data = await requestWithRetry(apiUrls);
            
            if (data) {
                // 处理各种可能的数据结构
                let videos = [];
                
                if (data.data && data.data.categories) {
                    // 原始结构：分类包含视频
                    data.data.categories.forEach(cat => {
                        if (cat.videos && Array.isArray(cat.videos)) {
                            videos.push(...cat.videos);
                        }
                    });
                } else if (data.data && Array.isArray(data.data)) {
                    // 直接数组结构
                    videos = data.data;
                } else if (data.list && Array.isArray(data.list)) {
                    videos = data.list;
                } else if (data.recommend && Array.isArray(data.recommend)) {
                    videos = data.recommend;
                } else if (data.videos && Array.isArray(data.videos)) {
                    videos = data.videos;
                }
                
                // 标准化视频数据
                videos.forEach(vod => {
                    allVideos.push({
                        vod_id: vod.vod_id ? vod.vod_id.toString() : vod.id ? vod.id.toString() : '',
                        vod_name: vod.vod_name || vod.name || vod.title || '',
                        vod_pic: vod.vod_pic || vod.pic || vod.cover || '',
                        vod_remarks: vod.vod_remarks || vod.remarks || vod.status || vod.update || ''
                    });
                });
            }
            
            // 如果API没数据，尝试从首页HTML提取（SPA可能提取不到）
            if (allVideos.length === 0) {
                try {
                    const document = await Java.wvOpen(baseUrl);
                    // 尝试找到视频元素
                    const items = document.querySelectorAll('.video-item, .vod-item, .list-item');
                    items.forEach(item => {
                        const link = item.querySelector('a');
                        const img = item.querySelector('img');
                        const title = item.querySelector('.title, .name');
                        const remark = item.querySelector('.remark, .status, .update');
                        
                        allVideos.push({
                            vod_id: link?.getAttribute('href') || '',
                            vod_name: title?.textContent?.trim() || link?.textContent?.trim() || '',
                            vod_pic: img?.src || img?.getAttribute('data-src') || '',
                            vod_remarks: remark?.textContent?.trim() || ''
                        });
                    });
                } catch (e) {
                    console.log('HTML提取失败:', e);
                }
            }
            
            return { list: allVideos.slice(0, 30) }; // 限制数量
        },

        /**
         * 分类内容
         */
        async categoryContent(tid, pg, filter, extend) {
            try {
                const area = extend.area || '';
                const year = extend.year || '';
                const cat = extend.class || '';
                const sort = extend.sort || 'hits';
                const page = parseInt(pg) || 1;
                
                // 构建多个可能的API URL
                const apiUrls = [
                    // 原始API
                    `${baseUrl}/api.php/web/filter/vod?type_name=${encodeURIComponent(tid)}&page=${page}&sort=${sort}${cat ? '&class='+encodeURIComponent(cat) : ''}${area ? '&area='+encodeURIComponent(area) : ''}${year ? '&year='+encodeURIComponent(year) : ''}`,
                    
                    // 备用API 1
                    `${baseUrl}/api/vod/list?type=${encodeURIComponent(tid)}&page=${page}&sort=${sort}${cat ? '&class='+encodeURIComponent(cat) : ''}`,
                    
                    // 备用API 2
                    `${apiBase}/api/vod/filter?category=${encodeURIComponent(tid)}&page=${page}`,
                    
                    // 备用API 3
                    `${baseUrl}/index/api/list?tid=${encodeURIComponent(tid)}&pg=${page}`
                ];
                
                const data = await requestWithRetry(apiUrls);
                
                if (!data) {
                    return {
                        code: 1,
                        msg: "暂无数据",
                        list: [],
                        page: page,
                        pagecount: 1,
                        limit: 24,
                        total: 0
                    };
                }
                
                // 处理返回数据
                let videoList = [];
                let total = 0;
                let pageCount = 1;
                
                // 提取视频列表
                if (data.data && Array.isArray(data.data)) {
                    videoList = data.data;
                    total = data.total || data.data.length;
                    pageCount = data.pageCount || data.page_count || Math.ceil(total / 24);
                } else if (data.list && Array.isArray(data.list)) {
                    videoList = data.list;
                    total = data.total || data.list.length;
                    pageCount = data.pageCount || data.page_count || Math.ceil(total / 24);
                } else if (data.videos && Array.isArray(data.videos)) {
                    videoList = data.videos;
                    total = data.total || data.videos.length;
                    pageCount = data.pageCount || data.page_count || Math.ceil(total / 24);
                } else if (Array.isArray(data)) {
                    videoList = data;
                    total = data.length;
                    pageCount = Math.ceil(total / 24);
                }
                
                // 标准化视频数据
                const list = videoList.map(vod => ({
                    vod_id: vod.vod_id ? vod.vod_id.toString() : vod.id ? vod.id.toString() : '',
                    vod_name: vod.vod_name || vod.name || vod.title || '',
                    vod_pic: vod.vod_pic || vod.pic || vod.cover || '',
                    vod_remarks: vod.vod_remarks || vod.remarks || vod.status || vod.update || ''
                }));
                
                return {
                    code: 1,
                    msg: "数据列表",
                    list: list,
                    page: page,
                    pagecount: pageCount || 1,
                    limit: 24,
                    total: total || list.length
                };
                
            } catch (error) {
                console.log('分类获取失败:', error);
                return {
                    code: 1,
                    msg: "获取失败",
                    list: [],
                    page: parseInt(pg) || 1,
                    pagecount: 1,
                    limit: 24,
                    total: 0
                };
            }
        },

        /**
         * 详情页
         */
        async detailContent(ids) {
            try {
                const vod_id = ids[0];
                
                // 多个详情API
                const apiUrls = [
                    `${baseUrl}/api.php/web/vod/get_detail?vod_id=${vod_id}`,
                    `${baseUrl}/api/vod/detail?id=${vod_id}`,
                    `${baseUrl}/vod/detail/${vod_id}`,
                    `${apiBase}/api/vod/info?id=${vod_id}`,
                    `${baseUrl}/index/api/detail?vid=${vod_id}`
                ];
                
                const data = await requestWithRetry(apiUrls);
                
                if (!data) {
                    // 如果API失败，尝试从页面抓取
                    return await this._extractDetailFromHtml(vod_id);
                }
                
                // 提取视频数据
                let vodData = null;
                let vodplayer = [];
                
                if (data.data) {
                    if (Array.isArray(data.data) && data.data.length > 0) {
                        vodData = data.data[0];
                    } else if (typeof data.data === 'object') {
                        vodData = data.data;
                    }
                } else if (data.vod) {
                    vodData = data.vod;
                } else if (data.info) {
                    vodData = data.info;
                }
                
                if (data.vodplayer) {
                    vodplayer = data.vodplayer;
                }
                
                if (!vodData) {
                    return await this._extractDetailFromHtml(vod_id);
                }
                
                // 处理播放列表
                const playFromList = [];
                const playUrlList = [];
                
                // 检查是否有播放数据
                if (vodData.vod_play_from && vodData.vod_play_url) {
                    const fromList = vodData.vod_play_from.split('$$$');
                    const urlList = vodData.vod_play_url.split('$$$');
                    
                    for (let i = 0; i < fromList.length; i++) {
                        const from = fromList[i];
                        const urls = urlList[i] || '';
                        
                        // 查找播放器名称
                        let playerName = from;
                        if (vodplayer && Array.isArray(vodplayer)) {
                            const player = vodplayer.find(p => p.from === from);
                            if (player && player.show) {
                                playerName = player.show;
                            }
                        }
                        
                        // 处理剧集
                        const episodes = [];
                        const items = urls.split('#');
                        
                        for (let j = 0; j < items.length; j++) {
                            if (items[j] && items[j].includes('$')) {
                                const [name, url] = items[j].split('$');
                                // 构造特殊ID，方便播放器处理
                                const playId = `${playerName}@@${from}@@qqqparse@@${vod_id}@@${j + 1}@@${url}`;
                                episodes.push(`${name}$${playId}`);
                            }
                        }
                        
                        if (episodes.length > 0) {
                            playFromList.push(playerName);
                            playUrlList.push(episodes.join('#'));
                        }
                    }
                }
                
                // 如果上面的播放列表为空，尝试从vod_play_list提取
                if (playFromList.length === 0 && vodData.vod_play_list) {
                    try {
                        const playList = typeof vodData.vod_play_list === 'string' 
                            ? JSON.parse(vodData.vod_play_list) 
                            : vodData.vod_play_list;
                        
                        if (Array.isArray(playList)) {
                            playList.forEach((player, index) => {
                                const playerName = player.player_name || `线路${index + 1}`;
                                const episodes = [];
                                
                                if (player.urls && Array.isArray(player.urls)) {
                                    player.urls.forEach((url, idx) => {
                                        const name = url.name || `第${idx + 1}集`;
                                        const urlVal = url.url;
                                        const playId = `${playerName}@@player${index}@@qqqparse@@${vod_id}@@${idx + 1}@@${urlVal}`;
                                        episodes.push(`${name}$${playId}`);
                                    });
                                }
                                
                                if (episodes.length > 0) {
                                    playFromList.push(playerName);
                                    playUrlList.push(episodes.join('#'));
                                }
                            });
                        }
                    } catch (e) {
                        console.log('解析vod_play_list失败:', e);
                    }
                }
                
                return {
                    code: 1,
                    msg: "数据列表",
                    page: 1,
                    pagecount: 1,
                    limit: 1,
                    total: 1,
                    list: [{
                        vod_id: vod_id,
                        vod_name: vodData.vod_name || vodData.name || vodData.title || '',
                        vod_pic: vodData.vod_pic || vodData.pic || vodData.cover || '',
                        vod_content: vodData.vod_content || vodData.content || vodData.description || vodData.vod_blurb || '',
                        vod_director: vodData.vod_director || vodData.director || '',
                        vod_actor: vodData.vod_actor || vodData.actor || '',
                        vod_year: vodData.vod_year || vodData.year || '',
                        vod_area: vodData.vod_area || vodData.area || '',
                        vod_class: vodData.vod_class || vodData.class || vodData.type_name || '',
                        vod_remarks: vodData.vod_remarks || vodData.remarks || vodData.status || '',
                        vod_play_from: playFromList.join('$$$'),
                        vod_play_url: playUrlList.join('$$$')
                    }]
                };
                
            } catch (error) {
                console.log('详情获取失败:', error);
                return await this._extractDetailFromHtml(ids[0]);
            }
        },
        
        /**
         * 从HTML提取详情（备用方法）
         */
        async _extractDetailFromHtml(vod_id) {
            try {
                const document = await Java.wvOpen(`${baseUrl}/detail/${vod_id}`);
                
                // 提取基本信息
                const title = document.querySelector('h1')?.textContent || 
                             document.querySelector('.title')?.textContent || '';
                
                const imgEl = document.querySelector('.cover img, .poster img, .vod-pic img, .thumb img');
                const vod_pic = imgEl?.src || imgEl?.getAttribute('data-src') || '';
                
                // 提取简介
                const descEl = document.querySelector('.desc, .summary, .content, .intro');
                const vod_content = descEl?.textContent?.trim() || '';
                
                // 提取导演、演员等
                const extractInfo = (label) => {
                    const elements = document.querySelectorAll('.info-item, .meta-item, .detail-item');
                    for (const el of elements) {
                        if (el.textContent.includes(label)) {
                            return el.textContent.replace(label, '').replace('：', '').trim();
                        }
                    }
                    return '';
                };
                
                // 提取播放列表
                const playFromList = [];
                const playUrlList = [];
                
                const playTabs = document.querySelectorAll('.play-tab, .play-source, .play-list-tab');
                playTabs.forEach((tab, index) => {
                    const tabName = tab.textContent?.trim() || `线路${index + 1}`;
                    const contentId = tab.getAttribute('data-id') || tab.getAttribute('id');
                    
                    // 查找对应的播放列表
                    let playlist = null;
                    if (contentId) {
                        playlist = document.querySelector(`#${contentId} .playlist, [data-source="${contentId}"] .playlist`);
                    }
                    
                    if (!playlist) {
                        // 尝试查找相邻的播放列表
                        const parent = tab.parentElement;
                        playlist = parent?.querySelector('.playlist, .episode-list, .play-url-list');
                    }
                    
                    if (playlist) {
                        const episodes = [];
                        const links = playlist.querySelectorAll('a');
                        
                        links.forEach((link, idx) => {
                            const name = link.textContent?.trim() || `第${idx + 1}集`;
                            const href = link.getAttribute('href');
                            if (href) {
                                const playId = `${tabName}@@source${index}@@qqqparse@@${vod_id}@@${idx + 1}@@${href}`;
                                episodes.push(`${name}$${playId}`);
                            }
                        });
                        
                        if (episodes.length > 0) {
                            playFromList.push(tabName);
                            playUrlList.push(episodes.join('#'));
                        }
                    }
                });
                
                return {
                    code: 1,
                    msg: "数据列表",
                    page: 1,
                    pagecount: 1,
                    limit: 1,
                    total: 1,
                    list: [{
                        vod_id: vod_id,
                        vod_name: title,
                        vod_pic: vod_pic,
                        vod_content: vod_content,
                        vod_director: extractInfo('导演'),
                        vod_actor: extractInfo('主演'),
                        vod_year: extractInfo('年份'),
                        vod_area: extractInfo('地区'),
                        vod_class: extractInfo('类型'),
                        vod_remarks: extractInfo('更新') || extractInfo('状态'),
                        vod_play_from: playFromList.join('$$$') || '默认线路',
                        vod_play_url: playUrlList.join('$$$') || ''
                    }]
                };
                
            } catch (e) {
                console.log('HTML详情提取失败:', e);
                return { list: [] };
            }
        },

        /**
         * 搜索
         */
        async searchContent(key, quick, pg) {
            try {
                const page = parseInt(pg) || 1;
                
                // 多个搜索API
                const apiUrls = [
                    `${baseUrl}/api.php/web/search/index?wd=${encodeURIComponent(key)}&page=${page}`,
                    `${baseUrl}/api/search?keyword=${encodeURIComponent(key)}&page=${page}`,
                    `${baseUrl}/search/api?q=${encodeURIComponent(key)}&p=${page}`,
                    `${apiBase}/api/search?wd=${encodeURIComponent(key)}&page=${page}`,
                    `${baseUrl}/index/api/search?wd=${encodeURIComponent(key)}&pg=${page}`
                ];
                
                const data = await requestWithRetry(apiUrls);
                
                if (!data) {
                    return { list: [] };
                }
                
                // 提取搜索结果
                let videoList = [];
                let total = 0;
                let pageCount = 1;
                
                if (data.data && Array.isArray(data.data)) {
                    videoList = data.data;
                    total = data.total || data.data.length;
                    pageCount = data.pageCount || data.page_count || Math.ceil(total / 15);
                } else if (data.list && Array.isArray(data.list)) {
                    videoList = data.list;
                    total = data.total || data.list.length;
                    pageCount = data.pageCount || data.page_count || Math.ceil(total / 15);
                } else if (Array.isArray(data)) {
                    videoList = data;
                    total = data.length;
                    pageCount = Math.ceil(total / 15);
                }
                
                const list = videoList.map(vod => ({
                    vod_id: vod.vod_id ? vod.vod_id.toString() : vod.id ? vod.id.toString() : '',
                    vod_name: vod.vod_name || vod.name || vod.title || '',
                    vod_pic: vod.vod_pic || vod.pic || vod.cover || '',
                    vod_remarks: vod.vod_remarks || vod.remarks || vod.status || vod.update || ''
                }));
                
                return {
                    code: 1,
                    msg: "数据列表",
                    list: list,
                    page: page,
                    pagecount: pageCount || 1,
                    limit: 15,
                    total: total || list.length
                };
                
            } catch (error) {
                console.log('搜索失败:', error);
                return { list: [] };
            }
        },

        /**
         * 播放器
         */
        async playerContent(flag, id, vipFlags) {
            console.log('播放请求:', { flag, id });
            
            try {
                // 解析自定义ID格式
                if (id.includes('@@')) {
                    const parts = id.split('@@');
                    
                    if (parts.length >= 6) {
                        const lineName = parts[0];
                        const siteId = parts[1];
                        const mode = parts[2];
                        const mediaId = parts[3];
                        const nid = parts[4];
                        const rawUrl = parts[5];
                        
                        // 直接播放模式
                        if (mode === 'direct') {
                            console.log('直接播放:', rawUrl);
                            return { url: rawUrl, parse: 0 };
                        }
                        
                        // 需要解析的模式
                        if (mode === 'qqqparse' || mode === '360parse') {
                            // 构建播放页URL
                            const playPageUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
                            
                            console.log('尝试解析播放页:', playPageUrl);
                            
                            // 方法1: 尝试直接请求获取真实地址
                            try {
                                const res = await Java.req(playPageUrl, {
                                    headers: {
                                        'Referer': baseUrl,
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                                    }
                                });
                                
                                if (!res.error && res.body) {
                                    const body = res.body;
                                    
                                    // 匹配各种视频URL格式
                                    const patterns = [
                                        /(https?:\/\/[^"'\s]+\.(m3u8|mp4|flv|mkv|avi)[^"'\s]*)/gi,
                                        /videoUrl['"]?\s*[:=]\s*['"]([^'"]+)['"]/i,
                                        /url['"]?\s*[:=]\s*['"]([^'"]+\.(m3u8|mp4))['"]/i,
                                        /playUrl['"]?\s*[:=]\s*['"]([^'"]+)['"]/i,
                                        /src=['"]([^'"]+\.(m3u8|mp4))['"]/i,
                                        /data-url=['"]([^'"]+)['"]/i
                                    ];
                                    
                                    for (const pattern of patterns) {
                                        const matches = body.match(pattern);
                                        if (matches) {
                                            // 对于第一种模式，取第一个捕获组或整个匹配
                                            if (pattern.toString().includes('g')) {
                                                // 全局匹配，取第一个结果
                                                const match = pattern.exec(body);
                                                if (match && match[1]) {
                                                    console.log('找到视频地址:', match[1]);
                                                    return { url: match[1], parse: 0 };
                                                }
                                            } else {
                                                // 非全局匹配，取第一个捕获组
                                                if (matches[1]) {
                                                    console.log('找到视频地址:', matches[1]);
                                                    return { url: matches[1], parse: 0 };
                                                }
                                            }
                                        }
                                    }
                                    
                                    // 尝试提取JSON数据
                                    const jsonMatches = body.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
                                    for (const script of jsonMatches || []) {
                                        if (script.includes('player') || script.includes('video')) {
                                            const jsonMatch = script.match(/\{[\s\S]*"url"[\s\S]*\}/);
                                            if (jsonMatch) {
                                                try {
                                                    const jsonData = JSON.parse(jsonMatch[0]);
                                                    if (jsonData.url) {
                                                        return { url: jsonData.url, parse: 0 };
                                                    }
                                                } catch (e) {}
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                console.log('获取真实地址失败:', e);
                            }
                            
                            // 方法2: 尝试构造可能的直接地址
                            const possibleDirectUrls = [
                                `https://vod.qqqys.com/${mediaId}/${nid}.m3u8`,
                                `https://play.qqqys.com/${mediaId}/${nid}.mp4`,
                                `https://cdn.qqqys.com/${mediaId}/index.m3u8`,
                                `${baseUrl}/video/${mediaId}/${nid}.m3u8`
                            ];
                            
                            // 方法3: 返回播放页，使用解析器
                            return {
                                parse: 1,
                                url: playPageUrl,
                                header: {
                                    'Referer': baseUrl,
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                                }
                            };
                        }
                    }
                }
                
                // 处理直接URL
                if (id.startsWith('http')) {
                    return { url: id, parse: 0 };
                }
                
                // 默认返回原ID，使用解析器
                return { url: id, parse: 1 };
                
            } catch (error) {
                console.log('播放器处理失败:', error);
                return { url: id, parse: 1 };
            }
        },

        /**
         * 自定义动作 - 用于调试和测试
         */
        async action(actionStr) {
            try {
                const params = JSON.parse(actionStr);
                console.log('action params:', params);
                
                switch (params.action) {
                    case 'testApis':
                        // 测试所有API端点
                        const testUrls = [
                            `${baseUrl}/api.php/web/index/home`,
                            `${baseUrl}/api/home`,
                            `${apiBase}/api/home`,
                            `${baseUrl}/index/api/home`
                        ];
                        
                        const results = [];
                        for (const url of testUrls) {
                            try {
                                const res = await Java.req(url);
                                results.push({
                                    url,
                                    success: !res.error,
                                    status: res.status,
                                    hasData: res.body ? res.body.length > 0 : false
                                });
                            } catch (e) {
                                results.push({ url, success: false, error: e.message });
                            }
                        }
                        
                        return {
                            list: results,
                            message: 'API测试完成'
                        };
                        
                    case 'getConfig':
                        return {
                            baseUrl,
                            apiBase,
                            version: '3.0'
                        };
                        
                    default:
                        return { list: [] };
                }
                
            } catch (e) {
                console.log('action解析失败');
                return { list: [] };
            }
        }
    };
}

const spider = qqqSpider();
spider;
