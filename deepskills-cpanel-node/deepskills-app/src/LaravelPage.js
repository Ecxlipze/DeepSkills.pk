import React from 'react';
import styled from 'styled-components';
import LaravelHero from './components/LaravelHero';
import LaravelFeatures from './components/LaravelFeatures';
import LaravelLearning from './components/LaravelLearning';
import LaravelProjects from './components/LaravelProjects';
import LaravelOutcomes from './components/LaravelOutcomes';
import VideoReviews from './components/VideoReviews';
import WhyChooseUs from './components/WhyChooseUs';
import InstantDoubt from './components/InstantDoubt';
import CertifySection from './components/CertifySection';
import CourseOutline from './components/CourseOutline';
import LaravelCareer from './components/LaravelCareer';
import CourseRoadmap from './components/CourseRoadmap';
import laraInstant from './assets/lara-instant-banner.svg';
import laravelMap from './assets/laravel-map.svg';

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #000;
  color: #fff;
  overflow-x: hidden;
`;

const LaravelPage = () => {
  const [pdfUrl, setPdfUrl] = React.useState('');

  React.useEffect(() => {
    const fetchPdf = async () => {
      const { supabasePublic } = await import('./supabasePublicClient');
      const { data } = await supabasePublic
        .from('courses')
        .select('pdf_url')
        .ilike('category', '%laravel%')
        .single();
      
      if (data?.pdf_url) {
        setPdfUrl(data.pdf_url);
      }
    };
    fetchPdf();
  }, []);

  // Laravel Theme: Cyber Cyan accent
  const accentColor = "#00E5FF";
  const accentRGB = "0, 229, 255";

  return (
    <PageContainer>
      <LaravelHero />
      <LaravelFeatures />
      <LaravelLearning />
      <LaravelProjects />
      <LaravelOutcomes />
      
      {/* Reusable sections with Laravel theme */}
      <VideoReviews accentColor={accentColor} accentRGB={accentRGB} />
      <WhyChooseUs accentColor={accentColor} accentRGB={accentRGB} />
      <InstantDoubt accentColor={accentColor} accentRGB={accentRGB} bannerImage={laraInstant} />
      <CertifySection accentColor={accentColor} accentRGB={accentRGB} />
      <LaravelCareer />
      <CourseOutline accentColor={accentColor} accentRGB={accentRGB} pdfUrl={pdfUrl} />
      <CourseRoadmap imageSrc={laravelMap} accentColor={accentColor} />

    </PageContainer>
  );
};

export default LaravelPage;
