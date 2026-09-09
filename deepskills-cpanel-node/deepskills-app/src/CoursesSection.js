import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { Link } from "../lib/nextRouterDomCompat";
import { FaLaptop, FaCode, FaPaintBrush, FaWordpress } from "react-icons/fa";
import courseBg from "./assets/course-bg.png";
import RegisterButton from "./components/RegisterButton";
import btnIcon from "./assets/btn-icon.svg";
import mernCardThumb from "./assets/mern-card.png";
import graphicsCardThumb from "./assets/graphics-card.png";
import wpCardThumb from "./assets/wp-card.png";
import laravelCardThumb from "./assets/php-card.svg";
import { getCourseDetailPath, getCourseSlugFromCategory } from "./utils/enrollmentNavigation";
import SmartCoverImage from "../components/next/SmartCoverImage";

const dummyCourses = [
  { id: 'dummy-1', title: 'Graphic Design Mastery', description: 'Learn Adobe Photoshop, Illustrator, and Premiere Pro from scratch. Build a stunning portfolio.', category: 'Graphic Design', image_url: null },
  { id: 'dummy-2', title: 'Full Stack (Laravel)', description: 'Master backend development with Laravel. Build robust and scalable web applications.', category: 'Laravel / PHP', image_url: null },
  { id: 'dummy-3', title: 'Full Stack React JS', description: 'Become a highly paid Frontend Engineer. Learn React, Redux, Node.js, and Modern UI/UX.', category: 'React JS', image_url: null },
  { id: 'dummy-4', title: 'WordPress Mastery', description: 'Create professional websites without coding. Best for freelancers and digital marketers.', category: 'WordPress', image_url: null }
];

const Section = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
`;

const Header = styled(motion.div)`
  text-align: center;
  padding: 40px 20px;
`;

const SectionTitle = styled.h2`
  // font-family: 'Asimovian', sans-serif;
  font-size: 2.7rem;
  color: #ffffff;
  margin-bottom: 15px;
  font-weight: bold;
   @media (max-width: 768px) {
      font-size: 2.2rem;
      margin-bottom: 10px;
    }

`;


const Tagline = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  color: #ffffffff;
  // text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0;
  display: inline-block;
  font-weight: 600;
  border: 1px solid #c9c9c9ff;
  padding: 10px 20px;
  border-radius: 25px;
  @media (max-width: 768px) {
      font-size: 0.8rem;
      padding: 5px 10px;
      border-radius: 20px;
    }
`;

const ContentContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 95%;
  max-width: 1400px;
  margin: 0 auto;
  background-image: url(${courseBg});
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  border: 1px solid #CD7C7C;
  border-radius: 25px;
  overflow: hidden;
  margin-bottom: 80px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  padding: 40px 20px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 1;
  }

  > * {
    position: relative;
    z-index: 2;
  }
`;

const IconContainer = styled(motion.div)`
  background-color: #7A1E2D;
  color: #ffffffff;
  border-radius: 50%;
  padding: 15px;
  margin-bottom: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  width: 60px;
  height: 60px;
  transition: transform 0.5s ease;
`;

const Separator = styled(motion.hr)`
  width: 100%;
  border: 0;
  height: 1px;
  background-color: #ffffffff;
  margin-top: 10px;
  opacity: 0.5;
  transition: width 0.4s ease, opacity 0.4s ease;
`;

// Real anchors (instead of onClick navigation) so crawlers can follow
// homepage course cards to their detail pages.
const CourseCardLink = motion.create(Link);

const CourseCard = styled(CourseCardLink)`
  background: transparent;
  color: white;
  text-decoration: none;
  width: 100%;
  max-width: 350px;
  padding: 25px;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 450px;

  &:hover {
    ${IconContainer} {
      transform: rotate(360deg);
    }

    ${Separator} {
      width: 50%;
      opacity: 1;
    }
  }
`;

const Title = styled.h3`
  font-size: 1.4rem;
  font-family: 'Asimovian', sans-serif;
  margin-bottom: 15px;
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
  height: 150px;
  background-color: #333;
  background-image: linear-gradient(135deg, rgba(123, 31, 46, 0.95), rgba(20, 20, 20, 0.95));
  border-radius: 15px;
  margin-bottom: 20px;
  transition: transform 0.4s ease;

  ${CourseCard}:hover & {
    transform: scale(1.05);
  }
`;

const Description = styled.p`
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;
  margin-bottom: 20px;
  line-height: 1.5;
  color: #e0e0e0;
  flex-grow: 1;
`;

const BottomCTA = styled.div`
  text-align: center;
  width: 100%;
  margin-top: -50px;
  margin-bottom: 50px;
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
`;


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

export function mergeCoursesWithDummies(data) {
  return data && data.length > 0 ? [...data, ...dummyCourses] : dummyCourses;
}

const CoursesSection = ({ initialCourses = null }) => {
  // Courses arrive via getStaticProps (pages/index.js) so the cards are present
  // in the prerendered HTML; CMS edits reach the page through revalidation.
  const courses = mergeCoursesWithDummies(initialCourses);

  const getIcon = (category) => {
    const cat = category?.toLowerCase();
    if (cat?.includes('graphic')) return <FaPaintBrush />;
    if (cat?.includes('laravel') || cat?.includes('php')) return <FaLaptop />;
    if (cat?.includes('react')) return <FaCode />;
    if (cat?.includes('wordpress')) return <FaWordpress />;
    return <FaCode />;
  };

  const getPath = (category) => {
    const slug = getCourseSlugFromCategory(category);
    return slug ? getCourseDetailPath(slug) : '/courses';
  };

  const getCourseImage = (category) => {
    const cat = category?.toLowerCase();
    if (cat?.includes('react')) return mernCardThumb;
    if (cat?.includes('graphic')) return graphicsCardThumb;
    if (cat?.includes('laravel') || cat?.includes('php')) return laravelCardThumb;
    if (cat?.includes('wordpress')) return wpCardThumb;
    return null;
  };

  return (
    <Section>
      <Header
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <SectionTitle>Courses We Offer</SectionTitle>
        <Tagline>Career-Ready Learning Programs</Tagline>
      </Header>

      <ContentContainer
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <Column>
          {courses.slice(0, 2).map((course, index) => (
            <CourseCard
              key={course.id || index}
              variants={cardVariants}
              whileHover={{ y: -10, scale: 1.02 }}
              to={course.path || getPath(course.category)}
            >
              <IconContainer>{getIcon(course.category)}</IconContainer>
              <Title>{course.title}</Title>
              <CourseImage>
                <SmartCoverImage
                  src={getCourseImage(course.category)}
                  alt={`${course.title} course`}
                  sizes="(max-width: 900px) 100vw, 350px"
                />
              </CourseImage>
              <Description>{course.description}</Description>
              <Separator />
            </CourseCard>
          ))}
        </Column>

        <Column>
          {courses.slice(2, 4).map((course, index) => (
            <CourseCard
              key={course.id || index}
              variants={cardVariants}
              whileHover={{ y: -10, scale: 1.02 }}
              to={course.path || getPath(course.category)}
            >
              <IconContainer>{getIcon(course.category)}</IconContainer>
              <Title>{course.title}</Title>
              <CourseImage>
                <SmartCoverImage
                  src={getCourseImage(course.category)}
                  alt={`${course.title} course`}
                  sizes="(max-width: 900px) 100vw, 350px"
                />
              </CourseImage>
              <Description>{course.description}</Description>
              <Separator />
            </CourseCard>
          ))}
        </Column>
      </ContentContainer>

      <BottomCTA>
        <RegisterButton
          to="/courses"
          variant="primary"
          style={{ minWidth: "220px" }}
        >
          <img src={btnIcon} alt="" style={{ width: "20px", height: "20px" }} />
          Explore All Courses
        </RegisterButton>
      </BottomCTA>
    </Section>
  );
};

export default CoursesSection;
