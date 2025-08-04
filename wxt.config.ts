import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: [
      'activeTab',
      'tabs',
      'downloads',
      'storage',         // 数据存储
      'scripting'        // 新增：用于读取网页localStorage
    ],
    host_permissions: [
      'http://127.0.0.1:4999/*',
      'http://localhost:4999/*',
      'https://hub.anyspecs.cn/*'       // 前端网站和API端点
    ]
  }
});
