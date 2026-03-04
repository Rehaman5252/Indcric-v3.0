/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
    output: "standalone",
    reactStrictMode: true,
    swcMinify: true,
    images: {
        // ✅ REMOVED: domains array completely (deprecated)
        // ✅ KEPT: remotePatterns from both files, merged + deduped
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                pathname: '/v0/b/**'
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'placehold.co',
            },
            {
                protocol: 'https',
                hostname: 'upload.wikimedia.org',
            },
            {
                protocol: 'https',
                hostname: 'www.freepnglogos.com',
            },
            {
                protocol: 'https',
                hostname: 'cdn.icon-icons.com',
            },
            {
                protocol: 'https',
                hostname: 'www.pngkey.com',
            },
            {
                protocol: 'https',
                hostname: 'logolook.net',
            },
            {
                protocol: 'https',
                hostname: 'videos.pexels.com',
            },
            {
                protocol: 'https',
                hostname: 'logowik.com',  // from mjs
            },
        ],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    webpack(config, { webpack, isServer }) {
        config.resolve.alias['@'] = path.resolve(__dirname);
        
        config.infrastructureLogging = {
            level: 'error',
        };

        config.ignoreWarnings = [
            ...(config.ignoreWarnings || []),
            { module: /handlebars/ },
            { module: /require-in-the-middle/ },
        ];
        
        config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };

        return config;
    },
};

module.exports = nextConfig;
