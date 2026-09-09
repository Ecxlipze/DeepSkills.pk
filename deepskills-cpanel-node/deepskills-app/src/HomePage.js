import React from 'react';
import HeroSection from './HeroSection';
import AboutSection from './AboutSection';
import CoursesSection from './CoursesSection';
import WhyChooseSection from './WhyChooseSection';
import TestimonialSection from './TestimonialSection';
import JoinSection from './JoinSection';
import RegisterSection from './RegisterSection';
import ScrollReveal from './ScrollReveal';

const HomePage = ({ content = {} }) => {
  return (
    <>
      <div id="hero">
        <HeroSection initialContent={content.hero} />
      </div>

      <ScrollReveal>
        <div id="about">
          <AboutSection initialContent={content.about} initialOffers={content.offers} />
        </div>
      </ScrollReveal>


      <ScrollReveal>
        <div id="courses">
          <CoursesSection initialCourses={content.courses} />
        </div>
      </ScrollReveal>
      <ScrollReveal>
        <div id="why-choose">
          <WhyChooseSection />
        </div>
      </ScrollReveal>


      <div id="testimonials">
        <TestimonialSection initialTestimonials={content.testimonials} />
      </div>
      
      <ScrollReveal>
        <div id="join">
          <JoinSection />
        </div>
      </ScrollReveal>
      
      <ScrollReveal>
        <div id="register">
          <RegisterSection />
        </div>
      </ScrollReveal>
    </>
  );
};

export default HomePage;
