import Image from 'next/image';

// Hosts allowed by next.config.js images.remotePatterns. Anything else must
// bypass the optimizer or next/image throws at request time (admin-pasted URLs
// can point anywhere).
const allowedHosts = (() => {
  const hosts = new Set(['images.unsplash.com']);
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) hosts.add(new URL(supabaseUrl).hostname);
  } catch {
    /* ignore malformed env */
  }
  return hosts;
})();

function canOptimize(src) {
  if (!src) return false;
  if (src.startsWith('/')) return true; // same-origin static assets
  try {
    return allowedHosts.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

// Fills its nearest positioned ancestor, like next/image's fill mode. The
// parent frame must be position:relative with overflow:hidden.
export default function SmartCoverImage({ src, alt = '', sizes = '100vw', priority = false }) {
  if (!src) return null;

  if (!canOptimize(src)) {
    return (
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      style={{ objectFit: 'cover' }}
    />
  );
}
