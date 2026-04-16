import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 关键配置：让 "@" 指向 "src" 目录
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './', // 确保 Electron 打包路径正确
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true, // 必须固定端口，因为 electron 等待 5173
  },
});