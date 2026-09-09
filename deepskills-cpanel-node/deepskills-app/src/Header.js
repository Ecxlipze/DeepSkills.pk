import React, { useState, useEffect } from "react";
import Image from "next/image";
import styled from "styled-components";
import { Link, useLocation, useNavigate } from "../lib/nextRouterDomCompat";
import { motion, AnimatePresence } from "framer-motion";
import { FaBars, FaTimes, FaHome, FaInfoCircle, FaBook, FaUserTie, FaPlayCircle, FaUser, FaSignOutAlt, FaColumns, FaPhoneAlt, FaPenNib } from "react-icons/fa";
import { FiChevronRight, FiChevronDown } from "react-icons/fi";
import logoImg from "./logo.svg";
import RegisterButton from "./components/RegisterButton";
import { useAuth } from "./context/AuthContext";

const Nav = styled(motion.nav)`
  position: fixed;
  top: 0;
  width: 100%;
  height: 90px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  z-index: 1000;
  background: ${props => props.$scrolled ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.4)"};
  backdrop-filter: ${props => props.$scrolled ? "blur(12px)" : "blur(8px)"};
  border-bottom: 1px solid ${props => props.$scrolled ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)"};
  transition: all 0.3s ease;

  @media (max-width: 1100px) {
    padding: 0 20px;
    height: 70px;
  }
`;

const LogoWrapper = styled(Link)`
  display: flex;
  align-items: center;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.02);
  }
  
  img {
    height: 45px;
    width: auto;
    display: block; // Ensure it behaves as a block to avoid spacing issues
  }

  @media (max-width: 1100px) {
    img {
      height: 35px;
    }
  }
`;

const NavPill = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 30px;
  background: rgba(255, 255, 255, 0.05);
  padding: 10px 40px;
  border-radius: 50px;
  backdrop-filter: blur(15px);
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;

  // Masked border glow (Static, all-side)
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1.5px; // Border width
    background: linear-gradient(
      135deg, 
      rgba(123, 31, 46, 0.2), 
      rgba(255, 255, 255, 0.3), 
      rgba(123, 31, 46, 0.2)
    );
    opacity: 0.4;
    transition: opacity 0.5s ease, background 0.5s ease;
    z-index: -1;
    pointer-events: none;
    border-radius: inherit;
    
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  // Soft background polish and border intensification on hover
  &:hover {
    transform: scale(1.01);
    background: rgba(123, 31, 46, 0.08);

    &::before {
      opacity: 1;
      background: linear-gradient(
        135deg, 
        rgba(123, 31, 46, 0.6), 
        rgba(255, 255, 255, 0.6), 
        rgba(123, 31, 46, 0.6)
      );
    }
  }

  @media (max-width: 1100px) {
    display: none;
  }
`;

const NavLink = styled(motion.a)`
  color: ${props => props.$active ? "#d94a5e" : "#fff"};
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  position: relative;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 10; // Ensure clickable area is above glow pseudo-elements

  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: ${props => props.$active ? "100%" : "0"};
    height: 2px;
    background-color: #d94a5e;
    transition: width 0.3s ease;
  }

  &:hover {
    color: #d94a5e;
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 25px;

  @media (max-width: 1100px) {
    gap: 15px;
  }
`;

const DesktopOnlyBtn = styled.div`
  @media (max-width: 1100px) {
    display: none;
  }
`;

const LoginLink = styled(motion.create(Link))`
  color: #fff;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  
  &:hover {
    color: #ccc;
  }

  @media (max-width: 1100px) {
    background: #7B1F2E;
    color: #fff;
    padding: 8px 18px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.9rem;
    box-shadow: 0 4px 10px rgba(123, 31, 46, 0.2);
    
    &:hover {
      background: #9b283b;
      color: #fff;
    }
  }
`;

const UserDropdown = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 5px 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(123, 31, 46, 0.1);
    border-color: #7B1F2E;
  }
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  background: #7B1F2E;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
`;

const UserName = styled.span`
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;

  @media (max-width: 1200px) {
    display: none;
  }
`;

const DropdownMenu = styled(motion.div)`
  position: absolute;
  top: calc(100% + 15px);
  right: 0;
  background: rgba(15, 15, 15, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 10px;
  min-width: 200px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
  z-index: 1000;
`;

const DropdownItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  border-radius: 10px;
  transition: all 0.2s ease;

  svg {
    color: #7B1F2E;
    font-size: 1rem;
  }

  &:hover {
    background: rgba(123, 31, 46, 0.15);
    color: #fff;
    transform: translateX(5px);
  }

  &.logout {
    color: #ff4e4e;
    &:hover {
      background: rgba(255, 78, 78, 0.1);
    }
    svg {
      color: #ff4e4e;
    }
  }
`;

const MobileMenuBtn = styled.button`
  display: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  transition: transform 0.3s ease;
  padding: 5px; // Better hit area
  background: transparent;
  border: 0;

  &:active {
    transform: scale(0.9);
  }

  @media (max-width: 1100px) {
    display: flex;
    align-items: center;
  }
`;

const NavPillContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const DesktopDropdown = styled(motion.div)`
  position: absolute;
  top: 180%;
  left: 10%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 10px 0;
  min-width: 200px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  z-index: 1001;

  &::before {
    content: '';
    position: absolute;
    top: -20px;
    left: 0;
    width: 100%;
    height: 20px;
    background: transparent;
  }
`;

const DropdownLink = styled.a`
  display: block;
  padding: 12px 25px;
  color: #fff;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(123, 31, 46, 0.2);
    color: #7B1F2E;
  }
`;

// Mobile Menu Components
const MobileMenuContainer = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background-color: #7B1F2E;
  z-index: 2000;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
  overflow-y: auto;

  @media (max-width: 480px) {
    width: 100%;
  }
`;

const MobileMenuHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const MobileLogo = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  img {
    height: 35px; // Matching mobile header size
    width: auto;
    display: block;
  }
`;

const CloseBtn = styled.button`
  color: #fff;
  font-size: 1.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  background: transparent;
  border: 0;
`;

const MobileControls = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 30px;
`;

const MobileCta = styled(motion.button)`
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  background: ${props => props.$primary ? "#000" : "#fff"};
  color: ${props => props.$primary ? "#fff" : "#7B1F2E"};
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.98);
  }
`;


const MobileTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
`;

const MobileLinkWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
`;

const MainLink = styled(motion.a)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #EFECEC;
  padding: 15px 20px;
  border-radius: 10px;
  text-decoration: none;
  transition: transform 0.2s ease;
  color: #7B1F2E; // Explicitly set color for icons

  &:active {
    transform: scale(0.98);
  }
`;

const LinkLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  color: #7B1F2E;
  font-size: 1.1rem;

  span {
    color: #7B1F2E;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 1rem;
  }
`;

const DropdownContent = styled(motion.div)`
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  margin: 0 5px;
  border-radius: 0 0 10px 10px;
`;

const SubLink = styled.a`
  display: block;
  padding: 12px 20px 12px 50px;
  color: #fff;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Header = () => {
  const [activeLink, setActiveLink] = useState("HOME");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expandedMobileItem, setExpandedMobileItem] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = React.useMemo(() => [
    { name: "Home", href: "/", isRoute: true, icon: <FaHome /> },
    {
      name: "About",
      href: "/about",
      isRoute: true,
      icon: <FaInfoCircle />,
      hasDropdown: true,
      sublinks: [
        { name: "About DeepSkills", href: "/about", isRoute: true },
        { name: "Our Trainers", href: "/trainers", isRoute: true },
        { name: "Founder Message", href: "/founder-message", isRoute: true }
      ]
    },
    {
      name: "Courses",
      href: "/courses",
      isRoute: true,
      icon: <FaBook />,
      hasDropdown: true,
      sublinks: [
        { name: "Graphic Designing", href: "/courses/graphic-design", isRoute: true },
        { name: "Full Stack (Laravel)", href: "/courses/laravel-mastery", isRoute: true },
        { name: "Full Stack (React)", href: "/courses/full-stack-react", isRoute: true },
        { name: "View All Courses", href: "/courses", isRoute: true }
      ]
    },
    { name: "Media", href: "/media", isRoute: true, icon: <FaPlayCircle /> },
    { name: "Blogs", href: "/blogs", isRoute: true, icon: <FaPenNib /> },
    {
      name: "Certificate",
      href: "/verify-certificate",
      isRoute: true,
      icon: <FaBook />,
      hasDropdown: true,
      sublinks: [
        { name: "Verify Certificate", href: "/verify-certificate", isRoute: true },
      ]
    },
    { name: "Contact Us", href: "/contact", isRoute: true, icon: <FaPhoneAlt /> },
  ], []);

  useEffect(() => {
    const currentPath = location.pathname;
    let active = "";

    // Exact matches first
    if (currentPath === "/") {
      active = "HOME";
    } else {
      links.forEach(link => {
        // Match main links
        if (link.isRoute && link.href === currentPath) {
          active = link.name.toUpperCase();
        }
        // Match sublinks
        if (link.hasDropdown) {
          link.sublinks.forEach(sub => {
            if (sub.isRoute && sub.href === currentPath) {
              active = link.name.toUpperCase();
            }
          });
        }
      });
    }

    setActiveLink(active);
  }, [location.pathname, links]);

  const handleLinkClick = (e, link) => {
    if (link.isRoute) {
      setMobileMenuOpen(false);
      // setActiveLink will be handled by useEffect on route change
      return;
    }

    if (isHomePage) {
      e.preventDefault();
      const element = document.querySelector(link.href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        setActiveLink(link.name.toUpperCase());
      }
    } else {
      // Navigate to home and then scroll
      navigate("/" + link.href);
    }
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    navigate('/');
  };

  return (
    <>
      <Nav
        $scrolled={scrolled}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <LogoWrapper to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          {/* SVG logo: the optimizer rejects SVG, so serve it as-is but load it
              eagerly with high priority (it is above the fold on every page). */}
          <Image src={logoImg} alt="Deep Skills Logo" width={160} height={45} priority unoptimized />
        </LogoWrapper>

        <NavPill
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {links.slice(0, 7).map((link) => (
            <NavPillContainer
              key={link.name}
              onMouseEnter={() => link.hasDropdown && setOpenDropdown(link.name)}
              onMouseLeave={() => link.hasDropdown && setOpenDropdown(null)}
            >
              <NavLink
                as={link.isRoute ? Link : "a"}
                to={link.isRoute ? link.href : undefined}
                href={link.isRoute ? undefined : link.href}
                $active={activeLink === link.name.toUpperCase()}
                onClick={(e) => handleLinkClick(e, link)}
                style={{ display: "flex", alignItems: "center", gap: "2px" }}
              >
                {link.name}
                {link.hasDropdown && <FiChevronDown style={{ fontSize: "0.8rem", marginTop: "2px" }} />}
              </NavLink>

              {link.hasDropdown && (
                <AnimatePresence>
                  {openDropdown === link.name && (
                    <DesktopDropdown
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      {link.sublinks.map((sub) => (
                        <DropdownLink
                          key={sub.name}
                          as={sub.isRoute ? Link : "a"}
                          to={sub.isRoute ? sub.href : undefined}
                          href={sub.isRoute ? undefined : sub.href}
                          onClick={(e) => handleLinkClick(e, sub)}
                        >
                          {sub.name}
                        </DropdownLink>
                      ))}
                    </DesktopDropdown>
                  )}
                </AnimatePresence>
              )}
            </NavPillContainer>
          ))}
        </NavPill>

        <RightSection>
          {user ? (
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setUserDropdownOpen(true)}
              onMouseLeave={() => setUserDropdownOpen(false)}
            >
              <UserDropdown>
                <UserAvatar>{user.name.charAt(0).toUpperCase()}</UserAvatar>
                <UserName>{user.name}</UserName>
                <FiChevronDown color="#fff" />
              </UserDropdown>

              <AnimatePresence>
                {userDropdownOpen && (
                  <DropdownMenu
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DropdownItem to={user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}>
                      <FaColumns /> Dashboard
                    </DropdownItem>
                    <div style={{ padding: '0 10px' }}>
                      <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', margin: '5px 0' }} />
                    </div>
                    <DropdownItem as="div" onClick={handleLogout} className="logout" style={{ cursor: 'pointer' }}>
                      <FaSignOutAlt /> Logout
                    </DropdownItem>
                  </DropdownMenu>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <LoginLink to="/login" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Login</LoginLink>
          )}

          <DesktopOnlyBtn>
            <RegisterButton
              to="/inquiry"
              style={{ padding: "10px 24px", fontSize: "0.95rem" }}
            >
              Inquire Now
            </RegisterButton>
          </DesktopOnlyBtn>
          <MobileMenuBtn type="button" aria-label="Open navigation menu" onClick={() => setMobileMenuOpen(true)}>
            <FaBars aria-hidden="true" />
          </MobileMenuBtn>
        </RightSection>
      </Nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100vh",
                background: "rgba(0,0,0,0.6)", zIndex: 1999, backdropFilter: "blur(4px)"
              }}
            />
            <MobileMenuContainer
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <MobileMenuHeader>
                <MobileLogo>
                  <Image src={logoImg} alt="Deep Skills" width={160} height={45} unoptimized />
                </MobileLogo>
                <CloseBtn type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)}>
                  <FaTimes aria-hidden="true" />
                </CloseBtn>
              </MobileMenuHeader>

              <MobileControls>
                {user ? (
                  <MobileCta
                    $primary
                    onClick={handleLogout}
                  >
                    Logout
                  </MobileCta>
                ) : (
                  <>
                    <MobileCta
                      as={Link}
                      to="/inquiry"
                      $primary
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FaUserTie style={{ fontSize: "1rem" }} />
                      Inquire Now
                    </MobileCta>
                    <MobileCta
                      as={Link}
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FaUser style={{ fontSize: "1rem" }} />
                      Login
                    </MobileCta>
                  </>
                )}
              </MobileControls>

              <MobileTitle>
                <FaHome style={{ color: "rgba(255,255,255,0.7)" }} />
                {user ? `Hello, ${user.name}` : "Navigate Deep Skills"}
              </MobileTitle>

              {user && (
                <div style={{ marginBottom: '20px' }}>
                  <MobileLinkWrapper>
                    <MainLink as={Link} to={user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} onClick={() => setMobileMenuOpen(false)}>
                      <LinkLeft><FaColumns /> <span>Dashboard</span></LinkLeft>
                      <FiChevronRight />
                    </MainLink>
                  </MobileLinkWrapper>
                  
                  <MobileLinkWrapper>
                    <MainLink as="button" type="button" onClick={handleLogout} style={{ cursor: 'pointer', background: 'rgba(255, 78, 78, 0.1)', width: '100%', border: 0 }}>
                      <LinkLeft style={{ color: '#ff4e4e' }}><FaSignOutAlt /> <span style={{ color: '#ff4e4e' }}>Logout</span></LinkLeft>
                      <FiChevronRight color="#ff4e4e" />
                    </MainLink>
                  </MobileLinkWrapper>
                </div>
              )}

              {links.map((link, index) => (
                <MobileLinkWrapper
                  key={link.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <MainLink
                    as={link.isRoute ? Link : "a"}
                    to={link.isRoute ? link.href : undefined}
                    href={link.isRoute ? undefined : (link.hasDropdown ? undefined : link.href)}
                    onClick={(e) => {
                      if (link.hasDropdown) {
                        e.preventDefault();
                        setExpandedMobileItem(expandedMobileItem === link.name ? null : link.name);
                      } else {
                        handleLinkClick(e, link);
                      }
                    }}
                    style={{
                      borderRadius: link.hasDropdown && expandedMobileItem === link.name ? "10px 10px 0 0" : "10px"
                    }}
                  >
                    <LinkLeft>
                      {link.icon}
                      <span>{link.name}</span>
                    </LinkLeft>
                    {link.hasDropdown ? (
                      <motion.div animate={{ rotate: expandedMobileItem === link.name ? 180 : 0 }}>
                        <FiChevronDown />
                      </motion.div>
                    ) : (
                      <FiChevronRight />
                    )}
                  </MainLink>

                  {link.hasDropdown && (
                    <AnimatePresence>
                      {expandedMobileItem === link.name && (
                        <DropdownContent
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          {link.sublinks.map((sub, idx) => (
                            <SubLink
                              key={sub.name}
                              as={Link}
                              to={sub.href}
                              onClick={(e) => handleLinkClick(e, sub)}
                            >
                              {sub.name}
                            </SubLink>
                          ))}
                        </DropdownContent>
                      )}
                    </AnimatePresence>
                  )}
                </MobileLinkWrapper>
              ))}
            </MobileMenuContainer>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;

