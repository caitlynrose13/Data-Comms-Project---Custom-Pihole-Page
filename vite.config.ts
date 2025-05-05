import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: true,
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://192.168.0.200',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, '/api')
			},
			'/api/trigger-pihole-update': {
				target: 'http://192.168.0.200:3001',
				changeOrigin: true
			}
		}
	}
});
