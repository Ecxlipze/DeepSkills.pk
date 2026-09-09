import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle, FaYoutube } from 'react-icons/fa';
import logo from '../assets/logo.svg';

const Container = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: 40px auto;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  background: radial-gradient(circle at center, rgba(${props => props.accentRGB || '151, 192, 73'}, 0.05) 0%, transparent 70%);

  @media (max-width: 768px) {
    padding: 40px 10px;
    margin: 10px auto;
  }
`;

const Title = styled(motion.h2)`
  font-size: 3rem;
  color: ${props => props.accentColor || '#97C049'};
  margin-bottom: 70px;
  font-weight: 800;
  text-align: center;
  text-shadow: 0 0 30px rgba(${props => props.accentRGB || '151, 192, 73'}, 0.2);

  @media (max-width: 768px) {
    font-size: 1.8rem;
    margin-bottom: 30px;
  }
`;

const TableContainer = styled(motion.div)`
  width: 100%;
  background: rgba(20, 20, 20, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 30px;
  border: 1px solid rgba(${props => props.accentRGB || '151, 192, 73'}, 0.15);
  overflow: hidden;
  box-shadow: 0 40px 100px rgba(0,0,0,0.6);

  @media (max-width: 768px) {
    border-radius: 20px;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: #fff;
  table-layout: fixed; /* Ensures the table stays within bounds */
`;

const Th = styled.th`
  padding: 30px 15px;
  background: rgba(30, 30, 30, 0.8);
  font-size: 1.1rem;
  font-weight: 800;
  text-align: center;
  border-bottom: 2px solid rgba(255, 255, 255, 0.05);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  word-wrap: break-word;

  &:last-child {
    border-right: none;
  }

  @media (max-width: 768px) {
    padding: 15px 5px;
    font-size: 0.8rem;
  }

  @media (max-width: 400px) {
    font-size: 0.7rem;
    padding: 10px 2px;
  }
`;

const Td = styled.td`
  padding: 20px 10px;
  text-align: center;
  font-size: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  border-right: 1px solid rgba(255, 255, 255, 0.03);
  color: ${props => props.isFeature ? '#fff' : 'rgba(255, 255, 255, 0.7)'};
  font-weight: ${props => props.isFeature ? '700' : '400'};
  word-wrap: break-word;

  &:last-child {
    border-right: none;
  }

  @media (max-width: 768px) {
    padding: 12px 5px;
    font-size: 0.75rem;
  }

  @media (max-width: 400px) {
    font-size: 0.65rem;
    padding: 10px 2px;
  }
`;

const Tr = styled(motion.tr)`
  transition: background 0.3s ease;
  
  &:last-child td {
    border-bottom: none;
  }

  &:hover {
    background: rgba(${props => props.accentRGB || '151, 192, 73'}, 0.05);
  }
`;

const LogoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  
  img {
    height: 30px;
    filter: drop-shadow(0 0 10px rgba(${props => props.accentRGB || '151, 192, 73'}, 0.3));

    @media (max-width: 768px) {
      height: 18px;
    }
  }
`;

const YoutubeHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color: #FF0000;
  
  @media (max-width: 768px) {
    svg {
      font-size: 1.2rem !important;
    }
  }
`;

const StatusIcon = ({ status, accentColor }) => {
  return status ? (
    <motion.div
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 10 }}
    >
      <FaCheckCircle color="#97C049" />
    </motion.div>
  ) : (
    <motion.div
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 10 }}
    >
      <FaTimesCircle color="#f44336" />
    </motion.div>
  );
};

const WhyChooseUs = ({ accentColor, accentRGB }) => {
  const comparisonData = [
    { feature: 'Affordable', ds: true, yt: true, other: false },
    { feature: 'Live doubt solving', ds: true, yt: false, other: false },
    { feature: '1:1 mentorship', ds: true, yt: false, other: false },
    { feature: 'Dedicated Projects', ds: true, yt: false, other: false },
    { feature: 'Certification', ds: true, yt: false, other: true },
    { feature: 'Lifetime access', ds: true, yt: true, other: false },
    { feature: 'Placement assistance', ds: true, yt: false, other: false },
  ];

  return (
    <Container accentRGB={accentRGB}>
      <Title
        accentColor={accentColor}
        accentRGB={accentRGB}
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        Why choose us?
      </Title>
      
      <TableContainer
        accentRGB={accentRGB}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <Table>
          <thead>
            <tr>
              <Th style={{ textAlign: 'left', paddingLeft: '20px' }}>Features</Th>
              <Th>
                <LogoWrapper>
                  <img src={logo} alt="DeepSkills" />
                </LogoWrapper>
              </Th>
              <Th>
                <YoutubeHeader>
                  <FaYoutube size={30} />
                </YoutubeHeader>
              </Th>
              <Th>Other Platforms</Th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row, index) => (
              <Tr 
                key={index}
                accentRGB={accentRGB}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Td isFeature style={{ textAlign: 'left', paddingLeft: '20px' }}>{row.feature}</Td>
                <Td><StatusIcon status={row.ds} accentColor={accentColor} /></Td>
                <Td><StatusIcon status={row.yt} /></Td>
                <Td><StatusIcon status={row.other} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default WhyChooseUs;
