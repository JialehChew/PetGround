import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/button';
import LanguageSwitcher from './LanguageSwitcher';
import logoImage from '../../assets/logo.png';

type NavItem = { labelKey: string; href: string; isScroll?: boolean };

const NavBar = () => {
  const { t } = useTranslation('common');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getNavigationItems = (): NavItem[] => {
    const publicItems: NavItem[] = [
      { labelKey: 'serviceRates', href: '/service-rates' },
      { labelKey: 'groomingPolicy', href: '/grooming-policy' },
      { labelKey: 'contactUs', href: '#footer', isScroll: true },
    ];

    if (!user) {
      return publicItems;
    }

    if (user.role === 'owner') {
      return [
        { labelKey: 'dashboard', href: '/dashboard' },
        { labelKey: 'pets', href: '/pets' },
        { labelKey: 'appointments', href: '/appointments' },
        { labelKey: 'myAccount', href: '/profile' },
        ...publicItems,
      ];
    }

    if (user.role === 'admin') {
      return [
        { labelKey: 'dashboard', href: '/dashboard' },
        { labelKey: 'calendar', href: '/calendar' },
        { labelKey: 'clients', href: '/admin/clients' },
        ...publicItems,
      ];
    }

    return [
      { labelKey: 'dashboard', href: '/dashboard' },
      { labelKey: 'calendar', href: '/calendar' },
      { labelKey: 'clients', href: '/clients' },
      ...publicItems,
    ];
  };

  const navigationItems = getNavigationItems();

  const handleNavClick = (item: NavItem) => {
    if (item.isScroll && item.href.startsWith('#')) {
      const element = document.getElementById(item.href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo(0, 0);
    }
  };

  const navLabel = (key: string) => t(`nav.${key}`);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 border-b-2 border-[#F9C74F]/50 bg-gradient-to-r from-[#FFCC00] via-[#FFE8A3] to-[#F9C74F] shadow-lg shadow-[#E6A800]/20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-[4.25rem]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center"
          >
            <Link to="/" className="flex items-center space-x-2">
              <img
                src={logoImage}
                alt={t('appName')}
                className="h-9 w-9 rounded-3xl object-cover shadow-md ring-2 ring-white/90"
              />
              <span className="text-xl font-bold text-[#3F2A1E] drop-shadow-sm">{t('appName')}</span>
            </Link>
          </motion.div>

          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item, index) => (
              <motion.div
                key={item.labelKey + item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {item.isScroll ? (
                  <button
                    type="button"
                    onClick={() => handleNavClick(item)}
                    className="rounded-full px-4 py-2 text-sm font-medium text-[#3F2A1E] transition-all duration-200 hover:bg-white/50 hover:text-[#3F2A1E] hover:shadow-md hover:shadow-[#D9A008]/20"
                  >
                    {navLabel(item.labelKey)}
                  </button>
                ) : (
                  <Link
                    to={item.href}
                    onClick={() => handleNavClick(item)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? 'border-2 border-white/80 bg-white/65 text-[#3F2A1E] shadow-md shadow-[#D9A008]/15'
                        : 'text-[#3F2A1E] hover:scale-[1.02] hover:bg-white/50 hover:text-[#3F2A1E] hover:shadow-md hover:shadow-[#D9A008]/18'
                    }`}
                  >
                    {navLabel(item.labelKey)}
                  </Link>
                )}
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-[#3F2A1E] font-medium max-w-[10rem] truncate">
                    {user.name || user.email}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-[#3F2A1E]/30 bg-white/60 text-[#3F2A1E] shadow-sm transition-all duration-200 hover:bg-white/90 hover:shadow-md hover:shadow-[#D9A008]/20"
                  >
                    <button type="button" onClick={handleLogout}>
                      {t('auth.logout')}
                    </button>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" asChild className="border-[#3F2A1E]/30 bg-white/55 text-[#3F2A1E] shadow-sm transition-all duration-200 hover:bg-white/90 hover:shadow-md hover:shadow-[#D9A008]/20">
                    <Link to="/login">{t('auth.login')}</Link>
                  </Button>
                  <Button size="sm" asChild className="bg-[#3F2A1E] text-[#FFFBEB] shadow-md hover:bg-[#2A2415]">
                    <Link to="/register">{t('auth.register')}</Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="rounded-2xl text-[#3F2A1E] transition-all duration-200 hover:bg-white/50 hover:shadow-md hover:shadow-[#D9A008]/15 focus:outline-none"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-[#FFCC00]/45"
          >
            <div className="space-y-1 rounded-b-3xl border-t border-[#FFCC00]/40 bg-gradient-to-b from-[#FFDE42]/90 via-[#FFE8A3]/95 to-[#FFCC00]/85 px-2 pb-3 pt-2 backdrop-blur-md">
              {navigationItems.map((item) => (
                <div key={item.labelKey + item.href + '-m'}>
                  {item.isScroll ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleNavClick(item);
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full rounded-2xl px-3 py-2 text-left text-[#3F2A1E] transition-all duration-200 hover:bg-white/50 hover:shadow-sm hover:shadow-[#D9A008]/12"
                    >
                      {navLabel(item.labelKey)}
                    </button>
                  ) : (
                    <Link
                      to={item.href}
                      onClick={() => {
                        handleNavClick(item);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`block rounded-2xl px-3 py-2 transition-all duration-200 ${
                        isActive(item.href)
                          ? 'border border-white/75 bg-white/60 text-[#3F2A1E] shadow-sm'
                          : 'text-[#3F2A1E] hover:bg-white/50 hover:shadow-sm hover:shadow-[#D9A008]/12'
                      }`}
                    >
                      {navLabel(item.labelKey)}
                    </Link>
                  )}
                </div>
              ))}

              <div className="border-t border-[#F9C74F]/40 pt-4">
                {user ? (
                  <div className="space-y-2">
                    {user.role === "owner" && (
                      <Link
                        to="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block rounded-2xl px-3 py-2 text-[#3F2A1E] transition-all duration-200 hover:bg-white/50 hover:shadow-sm hover:shadow-[#D9A008]/12"
                      >
                        {t("nav.myAccount")}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full px-3 py-2 text-[#3F2A1E] hover:bg-white/40 rounded-2xl transition-colors duration-200"
                    >
                      {t('auth.logout')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block rounded-2xl px-3 py-2 text-[#3F2A1E] transition-all duration-200 hover:bg-white/50 hover:shadow-sm hover:shadow-[#D9A008]/12"
                    >
                      {t('auth.login')}
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block rounded-2xl bg-[#3F2A1E] px-3 py-2 text-center font-medium text-[#FFFBEB] transition-colors duration-200 hover:bg-[#2A2415]"
                    >
                      {t('auth.signUp')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default NavBar;
