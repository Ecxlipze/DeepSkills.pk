import GlobalStyle from '../../src/GlobalStyle';
import Header from '../../src/Header';
import Footer from '../../src/Footer';
import CustomCursor from '../../src/CustomCursor';
import GlobalOverlay from '../../src/components/GlobalOverlay';
import PageTransition from '../../src/components/PageTransition';
import ScrollProgressBar from '../../src/components/ScrollProgressBar';
import GoToTopButton from '../../src/components/GoToTopButton';
import styled from 'styled-components';

const SkipLink = styled.a`
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10000;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  background: #ffffff;
  color: #000000;
  padding: 10px 14px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;

  &:focus,
  &:focus-visible {
    position: fixed;
    top: 12px;
    left: 12px;
    width: auto;
    height: auto;
    overflow: visible;
    clip: auto;
    clip-path: none;
    white-space: normal;
  }
`;

export default function PublicLayout({ children }) {
  return (
    <>
      <GlobalStyle />
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <GlobalOverlay />
      <ScrollProgressBar />
      <GoToTopButton />
      <CustomCursor />
      <Header />
      <PageTransition>
        <main id="main-content" tabIndex="-1">
          {children}
        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
