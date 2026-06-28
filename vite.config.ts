import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 关键：手动加载 .env，让 server.proxy 能读到 VITE_PROXY_TARGET
  // Vite 默认只把 VITE_* 暴露给客户端（import.meta.env），不暴露给 server.proxy
  // 用 loadEnv 把 .env 文件中的变量加载到 process.env
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      vue(),
      VitePWA({
        // 基础配置
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/icon-192.svg'],
        manifest: {
          name: '番录 FanLu',
          short_name: '番录',
          description: '个人向动漫追踪与资讯站',
          theme_color: '#F4F1EC',
          background_color: '#F4F1EC',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          lang: 'zh-CN',
          icons: [
            {
              src: '/icons/icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        // Workbox 运行时缓存
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              // Bangumi API GET 缓存
              urlPattern: /^https:\/\/api\.bgm\.tv\/v0\/subjects\/\d+$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'anime-detail',
                expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 7 },
              },
            },
            {
              // 每日新番
              urlPattern: /^https:\/\/api\.bgm\.tv\/calendar$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'anime-calendar',
                expiration: { maxEntries: 1, maxAgeSeconds: 86400 },
              },
            },
            {
              // 搜索
              urlPattern: /^https:\/\/api\.bgm\.tv\/v0\/search/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'anime-search',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
              },
            },
            {
            // 图片代理（相对路径 /img?url=xxx 或 Worker 域名 /img?url=xxx）
            // 用 StaleWhileRevalidate 而非 CacheFirst：
            // - 避免上游错误（如 wsrv.nl 403、CF 屏蔽）被永久缓存到 SW
            // - 后台异步更新，新版本下次访问生效
            // - 30 天过期，保证长期更新
            urlPattern: /\/img\?.*url=/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
            },
          },
            {
              // 字体
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 31536000 },
              },
            },
          ],
        },
        // 开发模式注入（方便调试）
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      open: false,
      proxy: {
        // Bangumi API 代理
        // 目标：解决 3 个问题
        //   ① 浏览器 CORS 限制
        //   ② 国内访问 api.bgm.tv 网络不通
        //   ③ 移动设备访问 workers.dev 经常被墙
        //
        // 方案：设置 VITE_PROXY_TARGET 指向你的代理地址
        //   生产环境用 Cloudflare Pages Functions 转发（同 /api/bgm 策略）
        '/api/bgm': {
          target:
            process.env.VITE_PROXY_TARGET ||
            env.VITE_PROXY_TARGET ||
            '',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => {
            // path = /api/bgm/v0/subjects/520633
            // 代理路径：/api/bgm/v0/subjects/520633（去掉 /api/bgm 前缀）
            return path.replace(/^\/api\/bgm/, '')
          },
          configure: (proxy) => {
            proxy.on('error', (err, _req, res: any) => {
              console.error('[Proxy Error]', err.message)
              if (res && typeof res.writeHead === 'function') {
                res.writeHead(502, { 'Content-Type': 'application/json' })
                res.end(
                  JSON.stringify({
                    error: 'API_PROXY_ERROR',
                    message: err.message,
                    tip: '检查 VITE_PROXY_TARGET 配置',
                  }),
                )
              }
            })
          },
        },
        // Bangumi 图片代理
        // 目标：解决 3 个问题
        //   ① 浏览器 CORS 限制（lain.bgm.tv 不允许跨域）
        //   ② 国内访问 lain.bgm.tv 被墙
        //   ③ 移动设备/国内直连 workers.dev 经常被墙
        //
        // 策略：
        //   - dev 默认走 wsrv.nl（专业图片代理 + CDN 缓存，免部署即可开发）
        //   - 设置 VITE_IMG_PROXY_TARGET 指向已部署的代理（生产可选，自有缓存）
        //
        // 路径格式：/img?url=encoded_url
        //   - wsrv.nl：重写为 /?url=encoded_url
        //   - 自建代理：直接透传 /img?url=encoded_url
        '/img': {
          target:
            process.env.VITE_IMG_PROXY_TARGET ||
            env.VITE_IMG_PROXY_TARGET ||
            'https://wsrv.nl',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => {
            // 已指向自建代理（路径含 /img）时不重写
            const target =
              process.env.VITE_IMG_PROXY_TARGET || env.VITE_IMG_PROXY_TARGET || ''
            if (target) return path
            // wsrv.nl 格式：/?url=encoded_url
            return path.replace(/^\/img/, '')
          },
          configure: (proxy) => {
            proxy.on('error', (err, _req, res: any) => {
              console.error('[Img Proxy Error]', err.message)
              if (res && typeof res.writeHead === 'function') {
                res.writeHead(502, { 'Content-Type': 'text/plain' })
                res.end('IMG_PROXY_ERROR: ' + err.message)
              }
            })
          },
        },
      },
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
            vendor: ['@vueuse/core', 'dayjs', 'dexie'],
          },
        },
      },
    },
  }
})
