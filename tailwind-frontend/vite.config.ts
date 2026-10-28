import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import svgr from '@svgr/rollup';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const proxyTarget = (env.VITE_PROXY_TARGET || env.VITE_API_URL || 'http://127.0.0.1:5002')
        .replace(/\/api\/?$/, '')
        .replace(/\/+$/, '');

    return {
        resolve: {
            alias: {
                src: resolve(__dirname, 'src'),
            },
        },
        server: {
            port: 3000,
            proxy: {
                '/api': {
                    target: proxyTarget,
                    changeOrigin: true,
                },
                '/public': {
                    target: proxyTarget,
                    changeOrigin: true,
                },
                '/uploads': {
                    target: proxyTarget,
                    changeOrigin: true,
                },
            },
        },
        esbuild: {
            loader: 'tsx',
            include: /src\/.*\.[tj]sx?$/,
            exclude: [],
        },
        optimizeDeps: {
            esbuildOptions: {
                plugins: [
                    {
                        name: 'load-js-files-as-tsx',
                        setup(build) {
                            build.onLoad(
                                { filter: /src[\\/].*\.[tj]sx?$/ },
                                async (args) => ({
                                    loader: 'tsx',
                                    contents: await fs.readFile(args.path, 'utf8'),
                                })
                            );
                        },
                    },
                ],
            },
        },
        build: {
            outDir: 'dist', // ✅ this is required for Netlify
        },
        plugins: [svgr(), react()],
    };
});
