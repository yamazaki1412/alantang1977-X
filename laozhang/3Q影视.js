/**
 * 3Q影视(3qys.com)爬虫
 * 作者：deepseek
 * 版本：2.0（重写版）
 * 最后更新：2025-12-20
 * 发布页 https://www.3qys.com/
 * 重写说明：保留原有所有功能，融合低端影视/爱追剧/新韩剧网爬虫的优秀设计
 */

function threeQSpider() {
    const baseUrl = 'https://qqqys.com';
    
    // 延时函数（通用工具）
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * 提取视频列表数据（私有方法，封装复用）
     * @param {Document} document - DOM文档对象
     * @param {string} selector - 选择器，默认'.vod-item'
     * @returns {Array} 标准化的视频数据数组
     */
    const extractVideos = (document, selector = '.vod-item') => {
        return Array.from(document.querySelectorAll(selector)).map(item => {
            // 核心元素提取
            const titleEl = item.querySelector('.vod-title a');
            const picEl = item.querySelector('.vod-pic img');
            const tagEl = item.querySelector('.vod-tag');
            
            // 处理视频ID（确保完整URL）
            let vodId = titleEl?.getAttribute('href') || '';
            if (vodId && !vodId.startsWith('http')) {
                vodId = baseUrl + (vodId.startsWith('/') ? '' : '/') + vodId;
            }
            
            // 处理封面图片（兼容多种图片地址格式）
            let vodPic = picEl?.src || picEl?.getAttribute('data-original') || '';
            if (vodPic && !vodPic.startsWith('http')) {
                vodPic = vodPic.startsWith('//') ? 'https:' + vodPic : 
                         (vodPic.startsWith('/') ? baseUrl + vodPic : baseUrl + '/' + vodPic);
            }

            return {
                vod_name: titleEl?.textContent?.trim() || '',
                vod_pic: vodPic,
                vod_remarks: tagEl?.textContent?.trim() || '',
                vod_id: vodId,
                vod_actor: '' // 保留原有空字段，保持兼容性
            };
        }).filter(vod => vod.vod_name); // 过滤空标题数据
    };

    /**
     * 解析详情页数据（私有方法）
     * @param {Document} document - DOM文档对象
     * @param {string} vodId - 视频ID（详情页URL）
     * @returns {Object} 标准化的详情数据
     */
    const parseDetailPage = (document, vodId) => {
        // 基础信息提取
        const title = document.querySelector('.detail-title')?.textContent?.trim() || '';
        const picEl = document.querySelector('.detail-pic img');
        let vodPic = picEl?.src || picEl?.getAttribute('data-original') || '';
        
        // 图片地址标准化
        if (vodPic && !vodPic.startsWith('http')) {
            vodPic = vodPic.startsWith('//') ? 'https:' + vodPic : 
                     (vodPic.startsWith('/') ? baseUrl + vodPic : baseUrl + '/' + vodPic);
        }

        // 详情字段提取
        let vod_area = '', vod_year = '', vod_actor = '', vod_director = '', vod_remarks = '';
        const infoItems = document.querySelectorAll('.detail-info li');
        infoItems.forEach(li => {
            const text = li.textContent?.trim() || '';
            if (text.includes('地区：')) vod_area = text.replace('地区：', '').trim();
            if (text.includes('年份：')) vod_year = text.replace('年份：', '').trim();
            if (text.includes('主演：')) vod_actor = text.replace('主演：', '').trim();
            if (text.includes('导演：')) vod_director = text.replace('导演：', '').trim();
            if (text.includes('状态：')) vod_remarks = text.replace('状态：', '').trim();
        });

        // 剧情简介
        const vod_content = document.querySelector('.detail-desc')?.textContent?.trim() || '';

        // 播放列表提取
        const playlists = [];
        const playItems = document.querySelectorAll('.play-list a');
        if (playItems.length > 0) {
            const episodes = Array.from(playItems).map(item => 
                `${item.textContent?.trim() || ''}$${baseUrl + (item.getAttribute('href')?.startsWith('/') ? '' : '/') + item.getAttribute('href') || ''}`
            ).filter(ep => ep.split('$')[0] && ep.split('$')[1]); // 过滤空播放集
            
            playlists.push({
                title: '3Q播放源',
                episodes: episodes
            });
        }

        // 构造标准化返回结构
        return {
            vod_id: vodId,
            vod_name: title,
            vod_pic: vodPic,
            vod_remarks: vod_remarks,
            vod_year: vod_year,
            vod_actor: vod_actor,
            vod_director: vod_director,
            vod_area: vod_area,
            vod_content: vod_content,
            vod_play_from: playlists.map(p => p.title).join('$$$') || '3Q播放源',
            vod_play_url: playlists.map(p => p.episodes.join('#')).join('$$$') || ''
        };
    };

    return {
        /**
         * 初始化配置（保留原有配置+增强）
         */
        async init(cfg) {
            return {
                webview: {
                    debug: true,                // 开启调试（参考hanju.js）
                    showWebView: false,         // 保留原有默认值
                    widthPercent: 80,           // 优化窗口比例（参考参考文件）
                    heightPercent: 60,          // 优化窗口比例
                    keyword: '',                // 保留原有
                    returnType: 'dom',          // 保留原有
                    timeout: 30,                // 延长超时（提升稳定性）
                    blockImages: true,          // 禁止加载图片（加快速度，参考爱追剧.js）
                    enableJavaScript: true,     // 保留原有
                    header: {                   // 增强请求头（参考hanju.js）
                        'Referer': baseUrl,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    blockList: [                // 拦截非必要资源（参考爱追剧.js）
                        "*.ico*",
                        "*.png*",
                        "*.jpg*",
                        "*.jpeg*",
                        "*.gif*",
                        "*.webp*",
                        "*.css*"
                    ]
                }
            };
        },
        
        /**
         * 首页分类（保留原有分类结构+标准化字段）
         */
        async homeContent(filter) {
            console.log("3Q影视 - homeContent 执行, filter:", filter);

            return {
                class: [
                    { type_id: "movie", type_name: "电影" },
                    { type_id: "tv", type_name: "电视剧" },
                    { type_id: "cartoon", type_name: "动漫" },
                    { type_id: "zongyi", type_name: "综艺" }
                ],
                filters: { // 新增过滤配置（参考爱追剧.js，保留原有功能不影响）
                    "movie": [
                        { key: "area", name: "地区", value: [{n:"全部",v:""}, {n:"大陆",v:"大陆"}, {n:"欧美",v:"欧美"}, {n:"日韩",v:"日韩"}, {n:"港台",v:"港台"}] },
                        { key: "year", name: "年份", value: [{n:"全部",v:""}, {n:"2025",v:"2025"}, {n:"2024",v:"2024"}, {n:"2023",v:"2023"}, {n:"2022",v:"2022"}] },
                        { key: "sort", name: "排序", value: [{n:"最新",v:"time"}, {n:"最热",v:"hits"}] }
                    ],
                    "tv": [
                        { key: "area", name: "地区", value: [{n:"全部",v:""}, {n:"大陆",v:"大陆"}, {n:"欧美",v:"欧美"}, {n:"日韩",v:"日韩"}, {n:"港台",v:"港台"}] },
                        { key: "year", name: "年份", value: [{n:"全部",v:""}, {n:"2025",v:"2025"}, {n:"2024",v:"2024"}, {n:"2023",v:"2023"}] },
                        { key: "sort", name: "排序", value: [{n:"最新",v:"time"}, {n:"最热",v:"hits"}] }
                    ]
                }
            };
        },
        
        /**
         * 首页视频内容（保留原有逻辑+封装优化）
         */
        async homeVideoContent() {
            console.log("3Q影视 - homeVideoContent 执行");
            try {
                const document = await Java.wvOpen(baseUrl + '/');
                const videos = extractVideos(document);
                console.log("3Q影视 - 首页视频数量:", videos.length);
                return { list: videos };
            } catch (error) {
                console.error("3Q影视 - 首页视频提取失败:", error);
                return { list: [] };
            }
        },
        
        /**
         * 分类视频内容（保留原有逻辑+精准分页+错误处理）
         */
        async categoryContent(tid, pg, filter, extend) {
            console.log("3Q影视 - categoryContent 执行, 参数:", { tid, pg, filter, extend });
            try {
                // 构造分类URL（兼容原有分页逻辑）
                const pageNum = pg || 1;
                const url = `${baseUrl}/category/${tid}/${pageNum}.html`;
                const document = await Java.wvOpen(url);
                
                // 提取视频列表
                const videos = extractVideos(document);
                
                // 精准提取分页信息（参考xiuluo.js）
                let currentPage = pageNum, totalPages = 1;
                const pageCurrentEl = document.querySelector('.page-current');
                const pageTotalEl = document.querySelector('.page-total');
                
                if (pageCurrentEl) currentPage = parseInt(pageCurrentEl.textContent) || pageNum;
                if (pageTotalEl) {
                    totalPages = parseInt(pageTotalEl.textContent.replace(/[^0-9]/g, '')) || 1;
                } else {
                    // 兼容原有分页逻辑（默认10页）
                    totalPages = 10;
                }

                const returnData = {
                    code: 1,
                    msg: "数据列表",
                    list: videos,
                    page: currentPage,
                    pagecount: totalPages,
                    limit: 20, // 保留原有每页数量
                    total: totalPages * 20
                };
                console.log("3Q影视 - 分类返回数据:", returnData);
                return returnData;
            } catch (error) {
                console.error("3Q影视 - 分类内容提取失败:", error);
                return {
                    code: 0,
                    msg: "获取失败",
                    list: [],
                    page: pg || 1,
                    pagecount: 1,
                    limit: 20,
                    total: 0
                };
            }
        },
        
        /**
         * 详情页内容（保留原有功能+增强字段提取）
         */
        async detailContent(ids) {
            console.log("3Q影视 - detailContent 执行, 视频ID:", ids[0]);
            try {
                const vodId = ids[0];
                if (!vodId) throw new Error("视频ID为空");
                
                const document = await Java.wvOpen(vodId);
                const detailData = parseDetailPage(document, vodId);
                
                return {
                    code: 1,
                    msg: "数据列表",
                    page: 1,
                    pagecount: 1,
                    limit: 1,
                    total: 1,
                    list: [detailData]
                };
            } catch (error) {
                console.error("3Q影视 - 详情提取失败:", error);
                return {
                    code: 0,
                    msg: "获取详情失败",
                    page: 1,
                    pagecount: 1,
                    limit: 1,
                    total: 1,
                    list: []
                };
            }
        },
        
        /**
         * 搜索功能（保留原有逻辑+优化错误处理）
         */
        async searchContent(key, quick, pg) {
            console.log("3Q影视 - searchContent 执行, 参数:", { key, quick, pg });
            try {
                const pageNum = pg || 1;
                const searchUrl = `${baseUrl}/search/?key=${encodeURIComponent(key)}&page=${pageNum}`;
                const document = await Java.wvOpen(searchUrl);
                
                const videos = extractVideos(document);
                
                // 兼容原有分页逻辑
                return {
                    list: videos,
                    page: pageNum,
                    pagecount: 5, // 保留原有默认值
                    limit: 20,
                    total: 100 // 保留原有默认值
                };
            } catch (error) {
                console.error("3Q影视 - 搜索失败:", error);
                return {
                    list: [],
                    page: pg || 1,
                    pagecount: 1,
                    limit: 20,
                    total: 0
                };
            }
        },
        
        /**
         * 播放地址解析（保留原有功能+增强请求头）
         */
        async playerContent(flag, id, vipFlags) {
            console.log("3Q影视 - playerContent 执行, 参数:", { flag, id, vipFlags });
            try {
                if (!id) throw new Error("播放ID为空");
                
                // 保留原有直接返回逻辑，增强请求头
                return {
                    url: id,
                    parse: 1, // 需要解析
                    header: {
                        'Referer': baseUrl,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                };
            } catch (error) {
                console.error("3Q影视 - 播放地址解析失败:", error);
                // 备用解析方案（参考hanju.js）
                return {
                    url: `https://jx.bozrc.com:4433/player/?url=${encodeURIComponent(id)}`,
                    parse: 1,
                    header: {
                        'Referer': baseUrl,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                };
            }
        },
        
        /**
         * 自定义动作（保留原有功能+增强日志）
         */
        async action(actionStr) {
            console.log("3Q影视 - action 执行, 参数:", actionStr);
            try {
                const params = JSON.parse(actionStr);
                console.log("3Q影视 - action 解析参数:", params);
                // 可扩展自定义动作逻辑
                return { list: [] };
            } catch (e) {
                console.log("3Q影视 - action 参数非JSON格式:", e.message);
                return { list: [] };
            }
        }
    };
}

// 导出爬虫实例（保留原有导出方式）
const spider = threeQSpider();
spider;
