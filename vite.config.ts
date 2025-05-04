import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: true, // Tells Vite to listen on all interfaces
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://192.168.0.200',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, '/api')
			}
		}
	}
});
