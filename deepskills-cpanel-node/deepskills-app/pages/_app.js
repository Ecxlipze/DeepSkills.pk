import '../src/index.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { useEffect } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { AuthProvider } from '../src/context/AuthContext';
import { NotificationsProvider } from '../src/hooks/useNotifications';
import ToastNotifications from '../src/components/ToastNotifications';
import { GA_MEASUREMENT_ID, pageview } from '../lib/analytics';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isDashboardRoute =
    router.asPath.startsWith('/student') ||
    router.asPath.startsWith('/teacher') ||
    router.asPath.startsWith('/admin');

  useEffect(() => {
    const handleRouteChange = (url) => {
      pageview(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    document.body.classList.toggle('ds-native-cursor', isDashboardRoute);
    return () => document.body.classList.remove('ds-native-cursor');
  }, [isDashboardRoute]);

  return (
    <>
      {GA_MEASUREMENT_ID ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', { page_path: window.location.pathname });
            `}
          </Script>
        </>
      ) : null}
      <AuthProvider>
        <NotificationsProvider>
          <Component {...pageProps} />
          {isDashboardRoute && <ToastNotifications />}
        </NotificationsProvider>
      </AuthProvider>
    </>
  );
}
