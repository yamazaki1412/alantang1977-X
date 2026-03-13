const axios = require('axios');
const cheerio = require('cheerio');

// 修复点1：完善请求头，模拟浏览器请求（避免被反爬拦截）
const requestHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Referer': 'https://www.3qys.com/', // 替换为目标网站真实referer
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
};

// 核心功能：获取3Q影视指定分类的影视列表
async function get3QMovieList(category = 'movie', page = 1) {
  try {
    // 修复点2：确认目标接口地址（需替换为真实可用的地址，示例仅为格式）
    const targetUrl = `https://qqqys.com/${category}/list-${page}.html`;
    
    // 修复点3：使用async/await处理异步请求，确保等待响应完成
    const response = await axios.get(targetUrl, {
      headers: requestHeaders,
      timeout: 10000, // 修复点4：添加超时机制，避免请求卡死
      // 修复点5：处理可能的重定向（默认axios已处理，显式开启更稳妥）
      maxRedirects: 5,
      // 若网站有cookie验证，需添加cookie（替换为真实值）
      // headers: { ...requestHeaders, 'Cookie': 'xxx=xxx; yyy=yyy' }
    });

    // 修复点6：校验响应状态，确保请求成功
    if (response.status !== 200) {
      throw new Error(`请求失败，状态码：${response.status}`);
    }

    const html = response.data;
    const $ = cheerio.load(html);
    const movieList = [];

    // 修复点7：适配网站DOM结构（需根据目标网站真实结构调整选择器）
    // 示例选择器（需替换为目标网站真实的影视列表选择器）
    $('.movie-item').each((index, element) => {
      const title = $(element).find('.title a').text().trim();
      const cover = $(element).find('.cover img').attr('src') || '';
      const link = $(element).find('.title a').attr('href') || '';
      const score = $(element).find('.score').text().trim() || '暂无评分';
      
      if (title) { // 过滤空数据
        movieList.push({
          title,
          cover: cover.startsWith('//') ? `https:${cover}` : cover, // 修复点8：补全相对路径
          link: link.startsWith('/') ? `https://www.3qys.com${link}` : link,
          score,
          category,
          page
        });
      }
    });

    // 修复点9：处理空数据场景，给出明确提示
    if (movieList.length === 0) {
      console.warn(`第${page}页未获取到${category}类影视数据，可能是选择器错误或页面无数据`);
    }

    return movieList;
  } catch (error) {
    // 修复点10：完善错误捕获，定位问题原因
    console.error(`获取影视列表失败：`, error.message);
    return [];
  }
}

// 核心功能：获取单部影视的详情信息
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

// 测试调用（可根据原有功能调整）
(async () => {
  const movieList = await get3QMovieList('movie', 1);
  console.log('影视列表：', movieList);
  
  if (movieList.length > 0) {
    const firstMovieDetail = await get3QMovieDetail(movieList[0].link);
    console.log('第一部影视详情：', firstMovieDetail);
  }
})();
