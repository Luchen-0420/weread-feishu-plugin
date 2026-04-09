import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  server: {
    host: true,
    proxy: {
      '^/api/base': {
        target: 'https://base-api.feishu.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/base/, '')
      },
      '^/api/weread': {
        target: 'https://weread.qq.com',
        changeOrigin: true,
          secure: false,
          rewrite: (path) => {
            const newPath = path.replace(/^\/api\/weread/, '/web');
            // console.log('URL重写: ', {
            //   原始路径: path,
            //   重写后路径: newPath
            // });
            return newPath;
          },
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const urlObj = new URL(req.url, 'http://localhost');
            const bookId = urlObj.searchParams.get('bookId');
            
            if ((req.url.includes('/bookmarklist') || req.url.includes('/review/list')) && bookId) {
              proxyReq.setHeader('Referer', `https://weread.qq.com/web/reader/${bookId}`);
              // 微信读书获取笔记防爬虫的高级 Header
              proxyReq.setHeader('sec-ch-ua', '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"');
              proxyReq.setHeader('sec-fetch-dest', 'empty');
              proxyReq.setHeader('sec-fetch-mode', 'cors');
              proxyReq.setHeader('sec-fetch-site', 'same-origin');
            } else {
              proxyReq.setHeader('Referer', 'https://weread.qq.com/');
            }
            
            proxyReq.setHeader('Origin', 'https://weread.qq.com');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            proxyReq.setHeader('Accept-Encoding', 'gzip, deflate, br');
            proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
            
            // 删除可能导致 304 Not Modified 的缓存头，强制获得 200 OK 响应体
            proxyReq.removeHeader('if-none-match');
            proxyReq.removeHeader('if-modified-since');

            const wereadCookie = req.headers['x-weread-cookie'];
            if (wereadCookie) {
              // console.log('转发Cookie:', wereadCookie); // 防止打印过量日志
              proxyReq.setHeader('Cookie', wereadCookie);
            }
            
            console.log('代理请求URL:', req.url);
          });

          // 添加响应数据的打印
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const encoding = proxyRes.headers['content-encoding'];
            console.log('响应头:', proxyRes.headers);
            console.log('内容编码:', encoding);

            const chunks = [];
            proxyRes.on('data', function(chunk) {
              chunks.push(chunk);
            });
            proxyRes.on('end', async function() {
              try {
                // 将 Buffer 数组合并成一个 Buffer
                let buffer = Buffer.concat(chunks);
                if (buffer.length === 0) {
                  return; // 响应体为空（如304）则直接忽略，不打印解析错误
                }
                
                let body;
                // 如果响应是压缩的，先解压
                if (encoding === 'gzip') {
                  const zlib = await import('zlib');
                  body = zlib.gunzipSync(buffer).toString('utf8');
                } else if (encoding === 'deflate') {
                  const zlib = await import('zlib');
                  body = zlib.inflateSync(buffer).toString('utf8');
                } else if (encoding === 'br') {
                  const zlib = await import('zlib');
                  body = zlib.brotliDecompressSync(buffer).toString('utf8');
                } else {
                  body = buffer.toString('utf8');
                }

                // 尝试解析 JSON
                const data = JSON.parse(body);
              } catch (e) {
                console.error('代理响应数据处理失败:', e.message);
              }
            });
          });
        }
      }
    }
  },
  base: './',
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})