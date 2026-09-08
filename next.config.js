const path = require('path');

const supabaseHost = (() => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  try {
    return supabaseUrl ? new URL(supabaseUrl).hostname : '';
  } catch {
    return '';
  }
})();

// Dual deploy modes: default build targets a Node server (full ISR + API routes).
// NEXT_OUTPUT=export produces a static export for PHP-only shared hosting, where
// ISR/fallback/redirects are unsupported (see lib/rendering.js and scripts/build-static.js).
const isExport = process.env.NEXT_OUTPUT === 'export';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isExport ? { output: 'export' } : {}),
  trailingSlash: true,
  // Next writes the static export into distDir, so give it its own directory
  // to keep deployable output separate from the Node build.
  distDir: isExport ? 'out' : 'next-build',
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
    unoptimized: isExport,
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
  // redirects() is unsupported in export mode; the same rules are mirrored in .htaccess
  async redirects() {
    if (isExport) return [];
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
    if (isExport) return [];
    return {
      beforeFiles: require('./deployment/cpanel/node-api-aliases.json'),
      afterFiles: [],
      fallback: []
    };
  }
};

module.exports = nextConfig;
