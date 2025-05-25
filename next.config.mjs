/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add transpilation for stream-chat-react
  transpilePackages: ['stream-chat-react', 'stream-chat'],
  
  // Webpack configuration to handle CSS processing
  webpack: (config, { isServer }) => {
    // Add CSS handling for stream-chat-react
    config.module.rules.push({
      test: /\.css$/,
      include: [/node_modules\/stream-chat-react/],
      use: [
        'style-loader',
        {
          loader: 'css-loader',
          options: {
            importLoaders: 1,
            modules: false,
          },
        },
      ],
    });

    // Resolve fallbacks for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  
  // Experimental features to help with ESM packages
  experimental: {
    esmExternals: 'loose',
  },
};

export default nextConfig;