import React from 'react';
import styled from 'styled-components';
import GraphicHero from './components/GraphicHero';
import GraphicFeatures from './components/GraphicFeatures';
import GraphicLearning from './components/GraphicLearning';
import GraphicProjects from './components/GraphicProjects';
import GraphicOutcomes from './components/GraphicOutcomes';
import GraphicCareer from './components/GraphicCareer';
import VideoReviews from './components/VideoReviews';
import WhyChooseUs from './components/WhyChooseUs';
import InstantDoubt from './components/InstantDoubt';
import CertifySection from './components/CertifySection';
import CourseOutline from './components/CourseOutline';
import CourseRoadmap from './components/CourseRoadmap';
import graphicMap from './assets/graphic-map.svg';

// Assets for shared sections (reused but themed)
import instantBanner from './assets/graphics-instant-banner.svg'; // Placeholder for graphics themed banner if needed

const PageContainer = styled.div`
  background-color: #000;
  color: #fff;
  min-height: 100vh;
`;

const GraphicPage = () => {
  const [pdfUrl, setPdfUrl] = React.useState('');

  React.useEffect(() => {
    const fetchPdf = async () => {
      const { supabasePublic } = await import('./supabasePublicClient');
      const { data } = await supabasePublic
        .from('courses')
        .select('pdf_url')
        .ilike('category', '%graphic%')
        .single();
      
      if (data?.pdf_url) {
        setPdfUrl(data.pdf_url);
      }
    };
    fetchPdf();
  }, []);

  // Theme settings for shared components
  const graphicsAccent = "#9333EA";

  return (
    <PageContainer>
      <GraphicHero />
      <GraphicFeatures />
      <GraphicLearning />
      <GraphicProjects />
      <GraphicOutcomes />
      
      {/* Reused sections with graphics theme */}
      <VideoReviews accentColor={graphicsAccent} />
      <WhyChooseUs accentColor={graphicsAccent} />
      <InstantDoubt accentColor={graphicsAccent} bannerImage={instantBanner} />
      <CertifySection accentColor={graphicsAccent} />
      <GraphicCareer />
      <CourseOutline accentColor={graphicsAccent} pdfUrl={pdfUrl} />
      <CourseRoadmap imageSrc={graphicMap} accentColor={graphicsAccent} />

    </PageContainer>
  );
};

export default GraphicPage;
