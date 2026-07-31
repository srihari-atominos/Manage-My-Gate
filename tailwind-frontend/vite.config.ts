import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import svgr from '@svgr/rollup';

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            src: resolve(__dirname, 'src'),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:5002',
                changeOrigin: true,
            },
            '/public': {
                target: 'http://localhost:5002',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://localhost:5002',
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
});
