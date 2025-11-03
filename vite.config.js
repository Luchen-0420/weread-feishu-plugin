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
            proxyReq.setHeader('Referer', 'https://weread.qq.com/');
            proxyReq.setHeader('Origin', 'https://weread.qq.com');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            proxyReq.setHeader('Accept-Encoding', 'gzip, deflate, br');
            proxyReq.setHeader('Accept', 'application/json, text/plain, */*');

            const wereadCookie = req.headers['x-weread-cookie'];
            if (wereadCookie) {
              console.log('转发Cookie:', wereadCookie);
              proxyReq.setHeader('Cookie', wereadCookie);
            } else {
              console.log('警告: 请求中没有Cookie');
            }
            
            console.log('代理请求URL:', req.url);
            console.log('代理请求头:', proxyReq.getHeaders());
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
      
                
                // 打印完整的返回数据结构
                // console.log('完整的接口返回数据结构:', JSON.stringify(data, null, 2));
              } catch (e) {
                console.error('解析响应数据失败:', e);
                console.log('Buffer 长度:', Buffer.concat(chunks).length);
                console.log('Buffer 内容:', Buffer.concat(chunks));
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