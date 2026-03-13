const axios = require('axios');
const cheerio = require('cheerio');

// 修复点1：更新请求头中的Referer为正确域名
const requestHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Referer': 'https://qqqys.com/', // 修正为正确域名
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
};

// 核心功能：获取3Q影视指定分类的影视列表（适配正确域名）
async function get3QMovieList(category = 'movie', page = 1) {
  try {
    // 修复点2：目标URL替换为正确域名
    const targetUrl = `https://qqqys.com/${category}/list-${page}.html`;
    
    const response = await axios.get(targetUrl, {
      headers: requestHeaders,
      timeout: 10000,
      maxRedirects: 5,
      // 若网站需要Cookie验证，在此补充（示例：）
      // headers: { ...requestHeaders, 'Cookie': 'xxx=xxx; yyy=yyy' }
    });

    if (response.status !== 200) {
      throw new Error(`请求失败，状态码：${response.status}`);
    }

    const html = response.data;
    const $ = cheerio.load(html);
    const movieList = [];

    // 【关键】需根据 https://qqqys.com 真实DOM结构调整选择器
    // 示例选择器（请替换为网站真实的影视列表容器选择器）
    $('.movie-item').each((index, element) => {
      const title = $(element).find('.title a').text().trim();
      const cover = $(element).find('.cover img').attr('src') || '';
      const link = $(element).find('.title a').attr('href') || '';
      const score = $(element).find('.score').text().trim() || '暂无评分';
      
      if (title) {
        movieList.push({
          title,
          // 修复点3：补全封面相对路径时使用正确域名
          cover: cover.startsWith('//') ? `https:${cover}` : cover,
          // 修复点4：拼接详情链接时使用正确域名
          link: link.startsWith('/') ? `https://qqqys.com${link}` : link,
          score,
          category,
          page
        });
      }
    });

    if (movieList.length === 0) {
      console.warn(`第${page}页未获取到${category}类影视数据，请检查：
      1. 目标网站${targetUrl}是否可正常访问；
      2. 影视列表的DOM选择器（如.movie-item）是否匹配网站真实结构；
      3. 网站是否有反爬机制（如IP封禁、验证码）。`);
    }

    return movieList;
  } catch (error) {
    console.error(`获取影视列表失败：`, error.message);
    // 补充反爬/网络问题提示
    if (error.message.includes('timeout')) {
      console.error('提示：请求超时，可能是网站屏蔽了当前IP，或网络不稳定');
    } else if (error.message.includes('403')) {
      console.error('提示：403禁止访问，网站可能检测到爬虫，需调整请求头/添加Cookie');
    }
    return [];
  }
}

// 核心功能：获取单部影视的详情信息（适配正确域名）
async function get3QMovieDetail(movieLink) {
  try {
    const response = await axios.get(movieLink, {
      headers: requestHeaders,
      timeout: 10000
    });

    if (response.status !== 200) {
      throw new Error(`详情请求失败，状态码：${response.status}`);
    }

    const html = response.data;
    const $ = cheerio.load(html);
    const movieDetail = {
      // 【关键】需根据 https://qqqys.com 详情页真实DOM调整选择器
      title: $('.movie-detail h1').text().trim() || '暂无标题',
      desc: $('.movie-desc').text().trim() || '暂无简介',
      actor: $('.actor-list').text().trim() || '暂无演员',
      playUrl: $('.play-btn a').attr('href') || '暂无播放地址'
    };

    return movieDetail;
  } catch (error) {
    console.error(`获取影视详情失败：`, error.message);
    return null;
  }
}

// 测试调用（可根据实际需求调整分类/页码）
(async () => {
  console.log('开始请求 https://qqqys.com 数据...');
  const movieList = await get3QMovieList('movie', 1);
  console.log('影视列表（共${movieList.length}条）：', movieList);
  
  if (movieList.length > 0) {
    const firstMovieDetail = await get3QMovieDetail(movieList[0].link);
    console.log('第一部影视详情：', firstMovieDetail);
  }
})();
