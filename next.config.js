/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // 只在服务器端应用这些修改
    if (isServer) {
      // 处理 fs/promises polyfill
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'fs/promises': false,
      };
    }
    return config;
  },
}

module.exports = nextConfig 