import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import footerBg from '../assets/footer-bg.png';

const Section = styled.section`
  width: 100%;
  padding: 40px 0;
  background: url(${footerBg});
  background-size: cover;
  background-position: center;
  display: flex;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
  }
`;

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 0 20px;
  }
`;

const Heading = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 15px;

  span {
    color: ${props => props.accentColor || '#97C049'};
    display: block;
  }

  @media (max-width: 768px) {
    font-size: 1.7rem;
  }
`;

const Description = styled(motion.p)`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  max-width: 700px;
  margin-bottom: 40px;
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const DownloadButton = styled(motion.button)`
  background: ${props => props.accentColor || '#97C049'};
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  padding: 18px 45px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(${props => props.accentRGB || '151, 192, 73'}, 0.3);
  text-transform: uppercase;
  letter-spacing: 1px;

  @media (max-width: 768px) {
    padding: 16px 35px;
    font-size: 1rem;
  }
`;

const PreviewPanel = styled(motion.div)`
  width: 100%;
  max-width: 980px;
  margin-top: 34px;
  border: 1px solid rgba(${props => props.$accentRGB || '151, 192, 73'}, 0.35);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.72);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
`;

const PreviewToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const PreviewTitle = styled.div`
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  text-align: left;
  letter-spacing: 0.3px;
`;

const PreviewMessage = styled.div`
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 1rem;
  background: rgba(0, 0, 0, 0.35);
`;

const PreviewActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;

  @media (max-width: 640px) {
    justify-content: stretch;

    button,
    a {
      flex: 1;
    }
  }
`;

const ActionButton = styled(motion.button)`
  background: ${props => props.$primary ? props.$accentColor || '#97C049' : 'rgba(255, 255, 255, 0.08)'};
  color: #fff;
  border: 1px solid ${props => props.$primary ? 'transparent' : 'rgba(255, 255, 255, 0.16)'};
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
`;

const ActionLink = styled(motion.a)`
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
`;

const PdfFrame = styled.iframe`
  width: 100%;
  height: min(72vh, 760px);
  min-height: 520px;
  border: 0;
  display: block;
  background: #1a1a1a;

  @media (max-width: 768px) {
    height: 70vh;
    min-height: 430px;
  }
`;

const CourseOutline = ({ accentColor, accentRGB, pdfUrl }) => {
  const [downloadStatus, setDownloadStatus] = React.useState('idle'); // 'idle', 'downloading', 'completed'
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [previewStatus, setPreviewStatus] = React.useState('idle'); // 'idle', 'loading', 'ready', 'failed'
  const [previewUrl, setPreviewUrl] = React.useState('');
  const hasPdfUrl = Boolean(pdfUrl);

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const getFileName = () => {
    if (!pdfUrl) return 'Course-Outline.pdf';

    let fileName = pdfUrl.split('/').pop().split('?')[0].replace(/%20/g, ' ');
    fileName = fileName.replace(/^\d+-/, '');

    return fileName || 'Course-Outline.pdf';
  };

  const handleDownload = async () => {
    if (!hasPdfUrl) {
      alert("Course outline PDF will be available soon!");
      return;
    }

    setDownloadStatus('downloading');
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`PDF download request failed with ${response.status}`);
      }

      const blob = await response.blob();

      // Create a local object URL for the blob
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      link.setAttribute('download', getFileName());

      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadStatus('completed');
      // Reset back to idle after a few seconds
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (error) {
      console.warn("PDF download failed:", error);
      setDownloadStatus('idle');
      setPreviewStatus('failed');
    }
  };

  const handlePreview = async () => {
    if (!hasPdfUrl) {
      alert("Course outline PDF will be available soon!");
      return;
    }

    setIsPreviewOpen(true);

    if (previewUrl) {
      setPreviewStatus('ready');
      return;
    }

    setPreviewStatus('loading');

    try {
      const response = await fetch(pdfUrl);

      if (!response.ok) {
        console.warn(`PDF preview request failed with ${response.status}`);
        setPreviewStatus('failed');
        return;
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));

      setPreviewUrl(objectUrl);
      setPreviewStatus('ready');
    } catch (error) {
      console.error("PDF preview failed:", error);
      setPreviewStatus('failed');
    }
  };

  return (
    <Section>
      <Container>
        <Heading
          accentColor={accentColor}
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Download the Complete
          <span>Course Outline</span>
        </Heading>

        <Description
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Want a detailed weekly breakdown and project roadmap?
        </Description>

        <DownloadButton
          accentColor={accentColor}
          accentRGB={accentRGB}
          disabled={downloadStatus === 'downloading'}
          whileHover={{
            scale: downloadStatus === 'downloading' ? 1 : 1.05,
            boxShadow: `0 15px 40px rgba(${accentRGB || '151, 192, 73'}, 0.5)`
          }}
          whileTap={{ scale: downloadStatus === 'downloading' ? 1 : 0.95 }}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          onClick={handlePreview}
          style={{ opacity: downloadStatus === 'downloading' ? 0.8 : 1 }}
        >
          {isPreviewOpen ? "PDF Preview Opened" : "Download Course PDF"}
        </DownloadButton>

        {isPreviewOpen && (
          <PreviewPanel
            $accentRGB={accentRGB}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <PreviewToolbar>
              <PreviewTitle>{getFileName()}</PreviewTitle>
              <PreviewActions>
                <ActionButton
                  type="button"
                  $accentColor={accentColor}
                  $primary
                  disabled={downloadStatus === 'downloading'}
                  whileHover={{ scale: downloadStatus === 'downloading' ? 1 : 1.03 }}
                  whileTap={{ scale: downloadStatus === 'downloading' ? 1 : 0.97 }}
                  onClick={handleDownload}
                >
                  {downloadStatus === 'downloading' && "Downloading..."}
                  {downloadStatus === 'completed' && "Downloaded"}
                  {downloadStatus === 'idle' && "Download"}
                </ActionButton>
                <ActionLink
                  href={hasPdfUrl ? pdfUrl : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!hasPdfUrl}
                  onClick={(event) => {
                    if (!hasPdfUrl) event.preventDefault();
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Open
                </ActionLink>
                <ActionButton
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Close
                </ActionButton>
              </PreviewActions>
            </PreviewToolbar>
            {previewStatus === 'loading' && (
              <PreviewMessage>Preparing PDF preview...</PreviewMessage>
            )}
            {previewStatus === 'failed' && (
              <PreviewMessage>
                Preview could not be loaded in this browser. Please use Open or Download.
              </PreviewMessage>
            )}
            {previewStatus === 'ready' && (
              <PdfFrame title="Course PDF preview" src={`${previewUrl}#toolbar=1&navpanes=0`} />
            )}
          </PreviewPanel>
        )}
      </Container>
    </Section>
  );
};

export default CourseOutline;
