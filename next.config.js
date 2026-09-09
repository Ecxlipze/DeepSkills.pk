const path = require('path');

const supabaseHost = (() => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  try {
    return supabaseUrl ? new URL(supabaseUrl).hostname : '';
  } catch {
    return '';
  }
})();

// API routes and ISR require the Node server. Reject the retired export mode.
if (process.env.NEXT_OUTPUT === 'export') throw new Error('Static/PHP deployment is retired. Use npm run build and the Node application.');

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  distDir: 'next-build',
  transpilePackages: ['react-router-dom'],
  turbopack: {
    resolveAlias: {
      'react-router-dom': path.resolve(__dirname, 'lib/nextRouterDomCompat.js')
    }
  },
  compiler: {
    styledComponents: true
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
  },
  images: {
    unoptimized: false,
    disableStaticImages: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      },
      ...(supabaseHost
        ? [
            {
              protocol: 'https',
              hostname: supabaseHost
            }
          ]
        : [])
    ]
  },
  webpack(config) {
    config.resolve.alias['react-router-dom'] = path.resolve(__dirname, 'lib/nextRouterDomCompat.js');
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'static/media/[name].[hash][ext]'
      }
    });
    config.module.rules.push({
      test: /\.(woff2?|eot|ttf|otf)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'static/fonts/[name].[hash][ext]'
      }
    });
    return config;
  },
  async redirects() {
    return [
      {
        source: '/blogs/post',
        destination: '/blogs/',
        permanent: true
      },
      {
        source: '/full-stack-react',
        destination: '/courses/full-stack-react',
        permanent: true
      },
      {
        source: '/laravel-mastery',
        destination: '/courses/laravel-mastery',
        permanent: true
      },
      {
        source: '/wordpress-mastery',
        destination: '/courses/wordpress-mastery',
        permanent: true
      },
      {
        source: '/graphic-design',
        destination: '/courses/graphic-design',
        permanent: true
      },
      {
        source: '/blog',
        destination: '/blogs',
        permanent: true
      },
      {
        source: '/blog/:slug',
        destination: '/blogs/:slug',
        permanent: true
      },
      {
        source: '/register',
        destination: '/inquiry',
        permanent: true
      }
    ];
  },
  async rewrites() {
    return {
      beforeFiles: require('./deployment/cpanel/node-api-aliases.json'),
      afterFiles: [],
      fallback: []
    };
  }
};

module.exports = nextConfig;
