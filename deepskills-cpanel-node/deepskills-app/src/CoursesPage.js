import React, { useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from "../lib/nextRouterDomCompat";
import { FaLaptop, FaCode, FaPaintBrush, FaWordpress, FaSearchDollar, FaPenNib } from "react-icons/fa";
import { getCourseDetailPath, getCourseSlugFromCategory } from './utils/enrollmentNavigation';
import SmartCoverImage from '../components/next/SmartCoverImage';

const PageContainer = styled.div`
  background-color: #000;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding-top: 120px;
  padding-bottom: 50px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(123, 31, 46, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(123, 31, 46, 0.05) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const Header = styled(motion.div)`
  text-align: center;
  margin-bottom: 60px;
  position: relative;
  z-index: 2;
  padding: 0 20px;
`;

const Title = styled.h1`
  font-size: 3.2rem;
  font-family: 'Asimovian', sans-serif;
  color: #fff;
  margin-bottom: 15px;
  letter-spacing: 2px;

  @media (max-width: 768px) {
    font-size: 2.1rem;
  }
`;

const Subtitle = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: #ccc;
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.6;
`;

const GridContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 2;
`;

const IconContainer = styled(motion.div)`
  background-color: #7A1E2D;
  color: #ffffffff;
  border-radius: 50%;
  padding: 10px;
  margin-bottom: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  width: 50px;
  height: 50px;
  transition: transform 0.5s ease;
`;

const Separator = styled(motion.hr)`
  width: 100%;
  border: 0;
  height: 1px;
  background-color: #ffffffff;
  margin-top: 15px;
  opacity: 0.3;
  transition: width 0.4s ease, opacity 0.4s ease;
`;

// Real anchors (instead of onClick navigation) so crawlers can follow
// course cards to their detail pages.
const CourseCardLink = motion.create(Link);

const CourseCard = styled(CourseCardLink)`
  background: rgba(25, 25, 25, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  text-decoration: none;
  padding: 30px 25px;
  border-radius: 15px;
  text-align: center;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 480px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(40, 40, 40, 0.9);
    border-color: #CD7C7C;
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(122, 30, 45, 0.2);

    ${IconContainer} {
      transform: rotate(360deg) scale(1.1);
    }

    ${Separator} {
      width: 50%;
      opacity: 1;
    }
  }
`;

const CourseTitle = styled.h3`
  font-size: 1.3rem;
  font-family: 'Asimovian', sans-serif;
  margin-bottom: 10px;
  font-weight: normal;
  letter-spacing: 1px;
  min-height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CourseImage = styled.div`
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 160px;
  background-color: #333;
  border-radius: 10px;
  margin-bottom: 15px;
`;

const Description = styled.p`
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;
  margin-bottom: 5px;
  line-height: 1.5;
  color: #e0e0e0;
  flex-grow: 1;
`;

const CTAButton = styled.button`
  background: #7A1E2D;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.95rem;
  margin-top: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;

  &:hover {
    background: #CD7C7C;
  }
`;

const dummyCourses = [
  { id: 'dummy-1', title: 'Graphic Designing', description: 'Learn Adobe Photoshop, Illustrator, and Premiere Pro. Build a stunning portfolio.', category: 'Graphic Design', image_url: null },
  { id: 'dummy-2', title: 'Full Stack (Laravel)', description: 'Master backend development with Laravel. Build robust and scalable web applications.', category: 'Laravel / PHP', image_url: null },
  { id: 'dummy-3', title: 'Full Stack React JS', description: 'Become a highly paid Frontend Engineer. Learn React, Redux, Node.js, and Modern UI/UX.', category: 'React JS', image_url: null },
  { id: 'dummy-4', title: 'WordPress Mastery', description: 'Create professional websites without coding. Best for freelancers and digital marketers.', category: 'WordPress', image_url: null },
  { id: 'dummy-5', title: 'UI/UX Design', description: 'Master user research, wireframing, prototyping, and visual design using Figma.', category: 'UI/UX', image_url: null },
  { id: 'dummy-6', title: 'SEO & Digital Marketing', description: 'Learn search engine optimization, content strategy, and online growth tactics.', category: 'SEO', image_url: null }
];


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const defaultImage = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

export function mergeCoursesWithDummies(data) {
  if (!data || data.length === 0) return dummyCourses;
  const dbTitles = data.map(c => c.title.toLowerCase());
  // Merge in dummy backups for missing courses like UX and SEO
  const missingDummies = dummyCourses.filter(dc => !dbTitles.some(dbt => dbt.includes(dc.category.toLowerCase()) || dc.title.toLowerCase().includes(dbt)));
  return [...data, ...missingDummies];
}

const CoursesPage = ({ initialCourses = null }) => {
  // Courses arrive via getStaticProps (pages/courses/index.js) so the listing is
  // present in the prerendered HTML; CMS edits reach the page through revalidation.
  const courses = mergeCoursesWithDummies(initialCourses);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getIcon = (category) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('graphic')) return <FaPaintBrush />;
    if (cat.includes('laravel') || cat.includes('php')) return <FaLaptop />;
    if (cat.includes('react')) return <FaCode />;
    if (cat.includes('wordpress')) return <FaWordpress />;
    if (cat.includes('ui/ux') || cat.includes('ux') || cat.includes('design')) return <FaPenNib />;
    if (cat.includes('seo') || cat.includes('marketing')) return <FaSearchDollar />;
    return <FaCode />;
  };

  const getPath = (category) => {
    const slug = getCourseSlugFromCategory(category);
    if (slug) return getCourseDetailPath(slug);
    return '/inquiry';
  };

  return (
    <PageContainer>
      <Header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Title>Explore Our Courses</Title>
        <Subtitle>
          Master the most in-demand digital skills. Whether you're starting from scratch or leveling up your career, we have the right learning path for you.
        </Subtitle>
      </Header>

      <GridContainer
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {courses.map((course, index) => (
          <CourseCard
            key={course.id || index}
            variants={cardVariants}
            to={course.path || getPath(course.category)}
          >
            <CourseImage>
              <SmartCoverImage
                src={course.image_url || defaultImage}
                alt={`${course.title} course`}
                sizes="(max-width: 768px) 100vw, 380px"
              />
            </CourseImage>
            <IconContainer>{getIcon(course.category)}</IconContainer>
            <CourseTitle>{course.title}</CourseTitle>
            <Description>{course.description}</Description>
            <Separator />
            <CTAButton>View Course Details</CTAButton>
          </CourseCard>
        ))}
      </GridContainer>
    </PageContainer>
  );
};

export default CoursesPage;
