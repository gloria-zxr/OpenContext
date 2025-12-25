import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  envPrefix: ['VITE_', 'TAURI_'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react/compiler-runtime': 'react-compiler-runtime'
    }
  },
  // 添加 clearScreen: false 以便 Tauri CLI 可以正常显示输出
  clearScreen: false,
  server: {
    port: 5173,
    // Tauri 需要固定端口
    strictPort: true,
    // 监听所有地址，以便 Tauri 开发模式可以访问
    host: true,
    // 代理 API 请求到后端服务器（Tauri 开发模式需要先启动 API server）
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4321',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../../dist/ui'),
    emptyOutDir: true
  },
  publicDir: path.resolve(__dirname, 'public')
});

