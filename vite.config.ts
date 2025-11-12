import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages 배포를 위한 base 경로 설정
  // https://jiho2572-ux.github.io/NARK/ 주소에 맞게 설정합니다.
  base: '/NARK/', 
  plugins: [react()],
  define: {
    // Vercel/Netlify 등의 환경 변수를 클라이언트 사이드 코드에 노출시킵니다.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});