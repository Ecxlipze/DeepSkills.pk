import React from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';

const MOTION_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileDrag',
  'whileInView',
  'viewport',
  'drag',
  'dragConstraints',
  'dragElastic',
  'layout',
  'layoutId'
]);

function omitMotionProps(props) {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => !MOTION_PROPS.has(key))
  );
}

// In-memory navigation state, mirroring react-router's location.state closely
// enough for this app (LoginPage reads state.from). Unlike react-router it does
// not survive a full page reload or back/forward restore.
let navState = null;

export const Link = React.forwardRef(function RouterCompatLink(
  { to, href, replace, state, children, ...props },
  ref
) {
  const linkProps = omitMotionProps(props);
  const resolvedHref = to || href || '#';

  const handleClick = (event) => {
    navState = state ?? null;
    if (linkProps.onClick) linkProps.onClick(event);
  };

  return (
    <NextLink
      ref={ref}
      href={resolvedHref}
      replace={Boolean(replace)}
      {...linkProps}
      onClick={handleClick}
    >
      {children}
    </NextLink>
  );
});

export function useNavigate() {
  const router = useRouter();

  return React.useCallback(
    (to, options = {}) => {
      if (typeof to === 'number') {
        router.back();
        return;
      }

      navState = options.state ?? null;

      if (options.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    },
    [router]
  );
}

export function useLocation() {
  const router = useRouter();
  const [hash, setHash] = React.useState('');
  const pathname = router.asPath.split('?')[0].split('#')[0];

  React.useEffect(() => {
    setHash(window.location.hash || '');
  }, [router.asPath]);

  return {
    pathname,
    search: router.asPath.includes('?') ? `?${router.asPath.split('?')[1].split('#')[0]}` : '',
    hash,
    state: navState
  };
}

export function useSearchParams() {
  const location = useLocation();
  const searchParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const navigate = useNavigate();

  const setSearchParams = React.useCallback(
    (nextInit, navigateOpts = {}) => {
      const nextQuery =
        typeof nextInit === 'function' ? nextInit(searchParams) : nextInit;
      const qs = new URLSearchParams(nextQuery).toString();
      const url = qs ? `${location.pathname}?${qs}` : location.pathname;
      navigate(url, navigateOpts);
    },
    [location.pathname, navigate, searchParams]
  );

  return [searchParams, setSearchParams];
}

export function useParams() {
  const router = useRouter();
  const pathname = router.asPath.split('?')[0].split('#')[0];
  const parts = pathname.split('/').filter(Boolean);

  if (parts[0] === 'admin') {
    // Department aliases (normalizeAdminPath) nest the real section one level
    // deeper: /admin/management/teachers/:id ≡ /admin/teachers/:id.
    const rest = ['management', 'academic', 'hr'].includes(parts[1])
      ? parts.slice(2)
      : parts.slice(1);
    const [section, child] = rest;

    if (section === 'students' && child) return { id: child };
    if (section === 'teachers' && child) return { id: child };
    if (section === 'courses' && child) return { courseId: child };
  }

  if (parts[0] === 'student') {
    if (parts[1] === 'results' && parts[2]) return { type: parts[2] };
  }

  return {};
}

export function Navigate({ to, replace = false, state }) {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate(to, { replace, state });
  }, [navigate, replace, state, to]);

  return null;
}

export function BrowserRouter({ children }) {
  return children;
}

export function Routes({ children }) {
  return children;
}

export function Route() {
  return null;
}
