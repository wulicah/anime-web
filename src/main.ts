import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

const app = createApp(App)

// 全局错误兜底
app.config.errorHandler = (err, _instance, info) => {
  console.error('[FanLu] 未捕获错误:', err, info)
}

// 安装插件
app.use(createPinia())
app.use(router)

app.mount('#app')
