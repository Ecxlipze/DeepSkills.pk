import React from 'react';
import styled from 'styled-components';
import WordPressHero from './components/WordPressHero';
import WordPressFeatures from './components/WordPressFeatures';
import WordPressLearning from './components/WordPressLearning';
import WordPressOverview from './components/WordPressOverview';
import WordPressProjects from './components/WordPressProjects';
import WordPressCareer from './components/WordPressCareer';
import VideoReviews from './components/VideoReviews';
import WhyChooseUs from './components/WhyChooseUs';
import InstantDoubt from './components/InstantDoubt';
import CertifySection from './components/CertifySection';

import CourseOutline from './components/CourseOutline';
import WordPressOutcomes from './components/WordPressOutcomes';
import CourseRoadmap from './components/CourseRoadmap';
import wpInstantBanner from './assets/wp-instant-banner.svg';
import wpMap from './assets/wp-map.svg';

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #000;
  color: #fff;
  overflow-x: hidden;
`;

const WordPressPage = () => {
  const [pdfUrl, setPdfUrl] = React.useState('');

  React.useEffect(() => {
    const fetchPdf = async () => {
      const { supabasePublic } = await import('./supabasePublicClient');
      const { data } = await supabasePublic
        .from('courses')
        .select('pdf_url')
        .ilike('category', '%wordpress%')
        .single();
      
      if (data?.pdf_url) {
        setPdfUrl(data.pdf_url);
      }
    };
    fetchPdf();
  }, []);

  return (
    <PageContainer>
      <WordPressHero />
      <WordPressFeatures />
      <WordPressLearning />
      <WordPressOverview />
      <WordPressProjects />
      <WordPressCareer />
      
      {/* Reusable sections for consistency */}
      <VideoReviews accentColor="#275D8F" accentRGB="140, 199, 255" />
      <WhyChooseUs accentColor="#275D8F" accentRGB="140, 199, 255" />
      <InstantDoubt accentColor="#275D8F" accentRGB="140, 199, 255" bannerImage={wpInstantBanner} />
      <CertifySection accentColor="#275D8F" accentRGB="140, 199, 255" />
      <WordPressOutcomes />
      <CourseOutline accentColor="#275D8F" accentRGB="140, 199, 255" pdfUrl={pdfUrl} />
      <CourseRoadmap imageSrc={wpMap} accentColor="#275D8F" />

    </PageContainer>
  );
};

export default WordPressPage;
