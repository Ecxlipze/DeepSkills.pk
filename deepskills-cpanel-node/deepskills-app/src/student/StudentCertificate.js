import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { 
  FaHome, FaTasks, FaExclamationCircle, 
  FaWallet, FaUserFriends, FaChartLine, FaCertificate, 
  FaGraduationCap, FaUserPlus, FaComments, FaDownload
} from 'react-icons/fa';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import logo from '../logo.svg';

// Nav items matching Student dashboard


const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Title = styled.h2`
  color: #fff;
  margin-top: 0;
  margin-bottom: 25px;
  font-size: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 15px;
  width: 100%;
`;

const ResultCard = styled(motion.div)`
  width: 100%;
  max-width: 1050px;
  background: #fff;
  color: #000;
  border-radius: 4px;
  border: 1px solid #7B1F2E;
  padding: 10px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
  margin-top: 20px;
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
  margin-top: 30px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 15px 40px;
  border-radius: 50px;
  font-weight: 700;
  font-size: 1rem;
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

const InfoBox = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255,255,255,0.7);
  padding: 40px;
  border-radius: 12px;
  text-align: center;
  font-family: 'Montserrat', sans-serif;
  width: 100%;
  margin-top: 40px;
`;

const CertList = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  width: 100%;
  flex-wrap: wrap;
`;

const CertTab = styled.button`
  background: ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.05)'};
  color: ${props => props.$active ? '#fff' : 'rgba(255,255,255,0.7)'};
  border: 1px solid ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.1)'};
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.1)'};
  }
`;

const StudentCertificate = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [activeCert, setActiveCert] = useState(null);
  const [maroonLogo, setMaroonLogo] = useState(null);
  const certRef = useRef(null);

  const studentCnic = user?.cnic || "";

  useEffect(() => {
    // Process logo to maroon for PDF compatibility
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logo;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#7B1F2E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      setMaroonLogo(canvas.toDataURL('image/png'));
    };
  }, []);

  const fetchCertificates = useCallback(async () => {
    if (!studentCnic) {
      setCertificates([]);
      setActiveCert(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('student_cnic', studentCnic);

      if (error) throw error;
      
      setCertificates(data || []);
      if (data && data.length > 0) {
        setActiveCert(data[0]);
      }
    } catch (err) {
      console.error('Error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  }, [studentCnic]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleDownloadPDF = async () => {
    if (!activeCert || !certRef.current) return;

    setDownloading(true);
    try {
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

      if (imgHeight > pdfHeight) {
        imgHeight = pdfHeight;
        imgWidth = pdfHeight * ratio;
      }

      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`DeepSkills_Certificate_${activeCert.course_name.replace(/\s+/g, '_')}.pdf`);
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
    <DashboardLayout>
      <Container>
        <Title>Your Certificates</Title>

        {loading ? (
          <InfoBox>Loading your certificates...</InfoBox>
        ) : certificates.length === 0 ? (
          <InfoBox>
            <FaCertificate size={40} style={{ color: '#7B1F2E', marginBottom: '20px' }} />
            <h3>No Certificates Yet</h3>
            <p style={{ marginTop: '10px' }}>You haven't been issued any certificates yet. Keep up the great work in your courses!</p>
          </InfoBox>
        ) : (
          <>
            {certificates.length > 1 && (
              <CertList>
                {certificates.map(cert => (
                  <CertTab 
                    key={cert.id} 
                    $active={activeCert?.id === cert.id}
                    onClick={() => setActiveCert(cert)}
                  >
                    {cert.course_name}
                  </CertTab>
                ))}
              </CertList>
            )}

            <AnimatePresence mode="wait">
              {activeCert && (
                <motion.div
                  key={activeCert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
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
                            const headers = getCertHeaders(activeCert.certificate_type);
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
                      <NameText>{activeCert.student_name}</NameText>

                      <CompletionDescription>
                        {getCertMessage(activeCert)}
                      </CompletionDescription>

                      <BestWishesText>
                        Deepskills wishes you the best for your future endeavors
                      </BestWishesText>

                      <SignaturesGrid>
                        <SignatoryItem>
                          <div className="name">{activeCert.signatory_1_name || 'Samira Hadid'}</div>
                          <div className="line" />
                          <div className="role">{activeCert.signatory_1_role || 'Supervisor'}</div>
                        </SignatoryItem>

                        <GoldenSeal />

                        <SignatoryItem>
                          <div className="name">{activeCert.signatory_2_name || 'Aaron Loeb'}</div>
                          <div className="line" />
                          <div className="role">{activeCert.signatory_2_role || 'Co Founder'}</div>
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
          </>
        )}
      </Container>
    </DashboardLayout>
  );
};

export default StudentCertificate;
