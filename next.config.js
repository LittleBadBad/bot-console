/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    swcMinify: true,
    distDir: process.env.NEXT_BUILD_PATH || '.next'
}

module.exports = nextConfig
