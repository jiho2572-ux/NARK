import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Vercel/Netlify 등의 환경 변수를 클라이언트 사이드 코드에 노출시킵니다.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
