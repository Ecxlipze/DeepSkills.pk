import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaDownload, FaExclamationTriangle } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import logo from './logo.svg';

const Container = styled.div`
  min-height: 100vh;
  padding: 140px 20px 80px;
  background: #000;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const HeaderSection = styled.div`
  text-align: center;
  margin-bottom: 50px;
  max-width: 800px;
`;

const Title = styled(motion.h1)`
  font-size: 3rem;
  font-family: 'Asimovian', sans-serif;
  font-weight: 800;
  margin-bottom: 20px;
   background: linear-gradient(135deg, #fff 0%, #7B1F2E 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 768px) {
    font-size: 2.2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #888;
  line-height: 1.6;
`;

const SearchBox = styled(motion.div)`
  width: 100%;
  max-width: 650px;
  background: rgba(255, 255, 255, 0.03);
  padding: 8px;
  border-radius: 60px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 60px;
  backdrop-filter: blur(20px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);

  &:focus-within {
    border-color: #7B1F2E;
    box-shadow: 0 0 30px rgba(123, 31, 46, 0.3);
    background: rgba(255, 255, 255, 0.06);
  }

  @media (max-width: 600px) {
    flex-direction: column;
    border-radius: 20px;
    padding: 20px;
    gap: 20px;
  }
`;

const Input = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  padding: 15px 30px;
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  outline: none;
  width: 100%;

  &::placeholder {
    color: #555;
  }

  @media (max-width: 600px) {
    padding: 10px;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const SearchButton = styled.button`
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 16px 40px;
  border-radius: 40px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;

  &:hover {
    background: #9b283b;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(123, 31, 46, 0.4);
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    background: #333;
    color: #666;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 600px) {
    width: 100%;
    padding: 18px;
  }
`;

const ResultCard = styled(motion.div)`
  width: 100%;
  max-width: 1050px;
  background: #fff;
  color: #000;
  border-radius: 4px;
  border: 1px solid #7B1F2E;
  padding: 10px;
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
`;

const CertificatePreview = styled.div`
  background: #fff;
  border: 1px solid #7B1F2E;
  padding: 15px 30px;
  text-align: center;
  position: relative;
  min-height: 560px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 1;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 13 50 13s16.36 2.347 25.96 5.937l1.768.661c.368.138.73.272 1.088.402H21.184zM0 20c.357-.13.72-.264 1.088-.402l1.768-.661C12.456 15.347 18.464 13 28.816 13c10.352 0 16.36 2.347 25.96 5.937l1.768.661c.368.138.73.272 1.088.402H0z' fill='%237b1f2e' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
    opacity: 0.5;
    pointer-events: none;
    z-index: -1;
  }

  @media (max-width: 768px) {
    padding: 15px 30px;
  }
`;

const CertLogo = styled.img`
  width: 150px;
  height: auto;
  display: block;
  position: relative;
  z-index: 10;
  margin: 0;
  /* Visual filter for web preview */
  filter: brightness(0) saturate(100%) invert(18%) sepia(85%) saturate(2371%) hue-rotate(337deg) brightness(85%) contrast(92%);
`;

const CertHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  margin-bottom: 10px;
  padding-top: 5px;
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 20px;
  }
`;

const TitleGroup = styled.div`
  text-align: right;
  @media (max-width: 768px) {
    text-align: center;
  }
`;

const TopWave = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 120px 120px 0 0;
  border-color: #7B1F2E transparent transparent transparent;
  z-index: 0;
  
  &::after {
    content: '';
    position: absolute;
    top: -120px;
    left: 0;
    width: 60px;
    height: 60px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }
`;

const BottomWave = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 120px 120px;
  border-color: transparent transparent #7B1F2E transparent;
  z-index: 0;
`;

const WatermarkText = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 5rem;
  color: rgba(123, 31, 46, 0.04);
  font-weight: 800;
  pointer-events: none;
  white-space: nowrap;
  text-transform: uppercase;
  z-index: 0;
  user-select: none;
`;

const HeaderTitle = styled.h1`
  font-family: 'Playfair Display', serif;
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: #000;
  margin: 0;
  line-height: 1;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const HeaderSubtitle = styled.h2`
  font-family: 'Montserrat', sans-serif;
  font-size: 1.4rem;
  font-weight: 500;
  letter-spacing: 3px;
  color: #000;
  margin: 5px 0 0;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    letter-spacing: 2px;
  }
`;

const PresentedTo = styled.p`
  font-family: 'Montserrat', sans-serif;
  font-size: 1.1rem;
  color: #555;
  margin-bottom: 15px;
  letter-spacing: 2px;
`;

const NameText = styled.h3`
  font-family: 'Great Vibes', cursive;
  font-size: 4.3rem;
  color: #7B1F2E;
  margin: 0 0 25px;
  font-weight: 400;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const CompletionDescription = styled.p`
  font-family: 'Montserrat', sans-serif;
  font-size: 0.94rem;
  line-height: 1.6;
  color: #000;
  max-width: 700px;
  margin: 0 auto 15px;
  font-weight: 600;

  strong {
    color: #7B1F2E;
  }
`;

const BestWishesText = styled.p`
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: #000;
  margin-bottom: 40px;
`;

const SignaturesGrid = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 15px;
  padding: 0 40px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 30px;
  }
`;

const SignatoryItem = styled.div`
  text-align: center;
  min-width: 200px;
  position: relative;
  z-index: 5;

  .name {
    font-family: 'Playfair Display', serif;
    font-size: 1.2rem;
    font-weight: 600;
    color: #000;
    margin-bottom: 5px;
  }

  .line {
    height: 1px;
    background: #555;
    width: 100%;
    margin-bottom: 8px;
  }

  .role {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.8rem;
    color: #555;
    text-transform: capitalize;
  }
`;

const GoldenSeal = styled.div`
  width: 70px;
  height: 70px;
  background: radial-gradient(circle, #f3d053 0%, #e0a91e 50%, #b88a10 100%);
  border-radius: 50%;
  position: relative;
  box-shadow: 0 0 20px rgba(184, 138, 16, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;

  &::before {
    content: '';
    position: absolute;
    width: 110%;
    height: 110%;
    border: 2px dashed #b88a10;
    border-radius: 50%;
    animation: rotate 20s linear infinite;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const DownloadBtn = styled(motion.button)`
  margin-top: 40px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 18px 45px;
  border-radius: 50px;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;
  box-shadow: 0 10px 20px rgba(123, 31, 46, 0.3);

  &:hover {
    background: #9b283b;
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(123, 31, 46, 0.4);
  }

  svg {
    font-size: 1.2rem;
  }
`;

const ErrorBox = styled(motion.div)`
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid #e74c3c;
  color: #e74c3c;
  padding: 20px 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  max-width: 500px;
  text-align: center;
  font-family: 'Montserrat', sans-serif;
`;

const VerifyCertificatePage = () => {
  const [certNo, setCertNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState('');
  const [maroonLogo, setMaroonLogo] = useState(null);
  const certRef = useRef(null);

  // Process logo to maroon for PDF compatibility
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logo;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      // Tint to Maroon #7B1F2E
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#7B1F2E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      setMaroonLogo(canvas.toDataURL('image/png'));
    };
  }, []);

  const handleVerify = async () => {
    if (!certNo.trim()) return;

    setLoading(true);
    setError('');
    setCertificate(null);

    try {
      const { supabase } = await import('./supabaseClient');
      const { data, error: fetchError } = await supabase
        .from('certificates')
        .select('*')
        .eq('certificate_no', certNo.trim())
        .single();

      if (fetchError) {
        throw new Error('Certificate not found. Please check the number and try again.');
      }

      setCertificate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!certificate || !certRef.current) return;

    setDownloading(true);
    try {
      // Create a high-quality capture by forcing a wide-screen clone
      const canvas = await html2canvas(certRef.current, {
        scale: 3.5,
        useCORS: true,
        backgroundColor: '#fff',
        logging: false,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const container = clonedDoc.querySelector('[data-cert-container]');
          if (container) {
            container.style.width = '1200px';
            container.style.maxWidth = 'none';
            container.style.margin = '0';
            container.style.padding = '30px 60px';
          }

          // Logo is already colored by our useEffect processor
          const logoEl = clonedDoc.querySelector('[data-cert-logo]');
          if (logoEl) {
            logoEl.style.filter = 'none';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const ratio = canvas.width / canvas.height;
      let imgWidth = pdfWidth;
      let imgHeight = pdfWidth / ratio;

      // Ensure the image fits within A4 page while maintaining aspect ratio
      if (imgHeight > pdfHeight) {
        imgHeight = pdfHeight;
        imgWidth = pdfHeight * ratio;
      }

      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`DeepSkills_Certificate_${certificate.student_name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const getCertHeaders = (type) => {
    switch (type) {
      case 'Internship':
        return { title: 'CERTIFICATE', subtitle: 'OF INTERNSHIP' };
      case 'Participation':
        return { title: 'CERTIFICATE', subtitle: 'OF PARTICIPATION' };
      case 'Excellence':
        return { title: 'CERTIFICATE', subtitle: 'OF EXCELLENCE' };
      default:
        return { title: 'CERTIFICATE', subtitle: 'OF COURSE COMPLETION' };
    }
  };

  const getCertMessage = (cert) => {
    const dateStr = new Date(cert.issue_date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    switch (cert.certificate_type) {
      case 'Internship':
        return (
          <>
            For successfully completing the Internship at DeepSkills in <strong>{cert.course_name}</strong> on
            <strong> {dateStr}</strong>.
          </>
        );
      case 'Participation':
        return (
          <>
            For participating in the DeepSkills <strong>{cert.course_name}</strong> session on
            <strong> {dateStr}</strong>.
          </>
        );
      default:
        return (
          <>
            For successfully completing the <strong>DeepSkills {cert.course_name}</strong> course on
            <strong> {dateStr}</strong>.
          </>
        );
    }
  };

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Great+Vibes&family=Montserrat:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Container>
      <HeaderSection>
        <Title
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Verify Certificate
        </Title>
        <Subtitle>
          Protecting the integrity of DeepSkills credentials. Enter the certificate number below to verify its authenticity.
        </Subtitle>
      </HeaderSection>

      <SearchBox
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Input
          placeholder="Enter Certificate No (e.g. DS-2024-001)"
          value={certNo}
          onChange={(e) => setCertNo(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
        />
        <SearchButton
          onClick={handleVerify}
          disabled={loading || !certNo.trim()}
        >
          {loading ? 'Verifying...' : <><FaSearch /> Verify</>}
        </SearchButton>
      </SearchBox>

      <AnimatePresence mode="wait">
        {error && (
          <ErrorBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <FaExclamationTriangle size={24} />
            {error}
          </ErrorBox>
        )}

        {certificate && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
          >
            <ResultCard ref={certRef} data-cert-container>
              <TopWave />
              <BottomWave />
              <CertificatePreview>
                <WatermarkText>DEEPSKILLS • VERIFIED</WatermarkText>

                <CertHeader>
                  <CertLogo src={maroonLogo || logo} alt="DeepSkills" data-cert-logo />
                  <TitleGroup>
                    {(() => {
                      const headers = getCertHeaders(certificate.certificate_type);
                      return (
                        <>
                          <HeaderTitle>{headers.title}</HeaderTitle>
                          <HeaderSubtitle>{headers.subtitle}</HeaderSubtitle>
                        </>
                      );
                    })()}
                  </TitleGroup>
                </CertHeader>

                <PresentedTo>PRESENTED TO:</PresentedTo>
                <NameText>{certificate.student_name}</NameText>

                <CompletionDescription>
                  {getCertMessage(certificate)}
                </CompletionDescription>

                <BestWishesText>
                  Deepskills wishes you the best for your future endeavors
                </BestWishesText>

                <SignaturesGrid>
                  <SignatoryItem>
                    <div className="name">{certificate.signatory_1_name || 'Samira Hadid'}</div>
                    <div className="line" />
                    <div className="role">{certificate.signatory_1_role || 'Supervisor'}</div>
                  </SignatoryItem>

                  <GoldenSeal />

                  <SignatoryItem>
                    <div className="name">{certificate.signatory_2_name || 'Aaron Loeb'}</div>
                    <div className="line" />
                    <div className="role">{certificate.signatory_2_role || 'Co Founder'}</div>
                  </SignatoryItem>
                </SignaturesGrid>
              </CertificatePreview>
            </ResultCard>

            <DownloadBtn
              onClick={handleDownloadPDF}
              disabled={downloading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {downloading ? 'Preparing PDF...' : <><FaDownload /> Download PDF</>}
            </DownloadBtn>
          </motion.div>
        )}
      </AnimatePresence>
      </Container>
    </>
  );
};

export default VerifyCertificatePage;
