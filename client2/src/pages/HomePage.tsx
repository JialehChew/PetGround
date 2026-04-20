import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../store/authStore';
import PageTransition from '../components/layout/PageTransition';
import HeroBanner from '../components/home/HeroBanner';
import HeroDecorations from '../components/home/HeroDecorations';
import PromotionsSection from '../components/home/PromotionsSection';
import AppointmentBookingModal from '../components/appointments/AppointmentBookingModal';
import { petService } from '../services/petService';
import type { Pet } from '../types';
import lovingCareImage from '../assets/loving-unsplash.jpg';
import professionalServiceImage from '../assets/professional-unsplash.jpg';
import convenientBookingImage from '../assets/convenient-unsplash.jpg';
import licensedInsuredImage from '../assets/insured.png';
import experiencedTeamImage from '../assets/team.png';
import stressFreeImage from '../assets/nostress-unsplash.jpg';
import basicGroomingImage from '../assets/basic-unsplash.jpg';
import fullGroomingImage from '../assets/full-unsplash.jpg';

type FeatureCopy = { title: string; description: string };
type ServiceCopy = { title: string; duration: string; features: string[] };

const HomePage = () => {
  const { t } = useTranslation('home');
  const { t: tc } = useTranslation('common');
  const { isAuthenticated, user } = useAuthStore();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const navigate = useNavigate();

  // load user pets if authenticated
  useEffect(() => {
    const loadUserPets = async () => {
      if (isAuthenticated && user?.role === 'owner') {
        try {
          const pets = await petService.getUserPets();
          setUserPets(pets);
        } catch (error) {
          console.error('Error loading user pets:', error);
        }
      }
    };

    loadUserPets();
  }, [isAuthenticated, user]);

      const handleBookingSuccess = () => {
    setShowBookingModal(false);
  };

  const handleBookAppointment = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (user?.role === 'owner') {
      setShowBookingModal(true);
    }
  };

  const featureCopy = t('featureList', { returnObjects: true }) as FeatureCopy[];
  const serviceCopy = t('serviceList', { returnObjects: true }) as ServiceCopy[];

  const featureImages = [
    { image: lovingCareImage },
    { image: professionalServiceImage },
    { image: convenientBookingImage },
    { image: licensedInsuredImage },
    { image: experiencedTeamImage },
    { image: stressFreeImage },
  ];

  const combinedFeatures = featureImages.map((item, i) => ({
    ...item,
    ...featureCopy[i],
    alt: featureCopy[i]?.title ?? '',
  }));

  const serviceImages = [basicGroomingImage, fullGroomingImage];
  const services = serviceCopy.map((svc, i) => ({
    ...svc,
    image: serviceImages[i],
    alt: svc.title,
  }));

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDF7] via-[#FAF6EB] to-[#FFE8A3]/35">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="relative rounded-3xl md:rounded-[2rem] border-2 border-[#F9C74F]/55 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FAF6EB] shadow-xl shadow-[#F9C74F]/25 overflow-hidden"
            >
              <HeroDecorations />
              <div className="relative z-[1] grid lg:grid-cols-2 gap-8 lg:gap-12 items-center p-6 sm:p-10 lg:p-14">
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.08 }}
                  className="order-2 lg:order-1 flex justify-center lg:justify-start"
                >
                  <div className="relative w-full max-w-xl">
                    <div
                      className="pointer-events-none absolute -left-4 -bottom-4 w-40 h-40 rounded-full bg-[#FFCC00]/25 blur-2xl"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute -right-2 top-0 w-32 h-32 rounded-full bg-[#F9C74F]/30 blur-xl"
                      aria-hidden
                    />
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      className="rounded-3xl bg-gradient-to-b from-white to-[#FFF9E8] p-3 sm:p-5 border-2 border-[#FFE8A3] shadow-lg shadow-[#F9C74F]/20"
                    >
                      <HeroBanner
                        cropLeft
                        title={t('hero.bannerAriaLabel')}
                        className="drop-shadow-md"
                      />
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.12 }}
                  className="order-1 lg:order-2 text-center lg:text-left space-y-6"
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#FFE8A3]/90 px-4 py-1.5 text-sm font-semibold text-[#3F2A1E] border-2 border-[#F9C74F]/45 shadow-sm">
                    <SparklesIcon className="h-5 w-5 text-[#C9A000]" aria-hidden />
                    <span>{tc('appName')}</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#3F2A1E] leading-tight tracking-tight whitespace-pre-line drop-shadow-sm">
                    {t('hero.title')}
                  </h1>
                  <p className="text-lg text-[#5C4A3A] max-w-xl mx-auto lg:mx-0 leading-relaxed">
                    {t('hero.subtitle')}
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-4 pt-2">
                    <Button
                      size="lg"
                      className="bg-[#FFCC00] hover:bg-[#FFE566] text-[#3F2A1E] font-bold shadow-xl border-2 border-[#F9C74F]/70"
                      onClick={handleBookAppointment}
                    >
                      {t('hero.bookAppointment')}
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="border-2 border-[#F9C74F]/75 bg-white/90 text-[#3F2A1E] hover:bg-[#FFE8A3]/50 font-semibold shadow-lg"
                    >
                      <Link to="/service-rates">{t('hero.viewServices')}</Link>
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        <PromotionsSection />

        {/* Features */}
        <section className="py-16 bg-gradient-to-b from-background via-[#FAF6EB]/80 to-[#FFE8A3]/25">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-[#3F2A1E] mb-4">
                {t('sections.whyTitle')}
              </h2>
              <p className="text-xl text-[#5C4A3A] max-w-3xl mx-auto">
                {t('sections.whySubtitle')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {combinedFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden shadow-lg border-2 border-[#F9C74F]/30 hover:shadow-xl hover:border-[#FFCC00]/55 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 group"
                >
                  {/* Image - top */}
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={feature.image} 
                      alt={feature.alt} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Content - bottom */}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-[#3F2A1E] mb-3 text-center group-hover:text-[#C9A000] transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-[#5C4A3A] text-center leading-relaxed text-sm">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="py-16 bg-gradient-to-b from-[#FAF6EB]/90 via-[#FFFDF7] to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-[#3F2A1E] mb-4">
                {t('sections.servicesTitle')}
              </h2>
              <p className="text-xl text-[#5C4A3A] max-w-3xl mx-auto">
                {t('sections.servicesSubtitle')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden shadow-lg border-2 border-[#F9C74F]/30 hover:shadow-xl hover:border-[#FFCC00]/50 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 group"
                >
                  {/* Image */}
                  <div className="w-full h-48 overflow-hidden relative">
                    <img 
                      src={service.image} 
                      alt={service.alt} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* Duration badge */}
                    <div className="absolute top-4 right-4 bg-[#FFCC00] text-[#3F2A1E] px-3 py-1.5 rounded-2xl text-sm font-bold shadow-lg border-2 border-[#F9C74F]/60">
                      {service.duration}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-[#3F2A1E] mb-4 text-center group-hover:text-[#C9A000] transition-colors duration-300">
                      {service.title}
                    </h3>
                    
                    {/* Features list */}
                    <ul className="space-y-2 mb-6">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-[#5C4A3A] text-sm">
                          <SparklesIcon className="h-4 w-4 text-[#E6A800] mr-3 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    {/* Book button */}
                    <Button
                      className="w-full bg-[#FFCC00] hover:bg-[#FFE566] text-[#3F2A1E] font-bold shadow-lg border-2 border-[#F9C74F]/55"
                      onClick={handleBookAppointment}
                    >
                      {t('bookService', { name: service.title })}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <Button asChild variant="outline" size="lg" className="border-2 border-[#F9C74F]/75 bg-white/90 text-[#3F2A1E] hover:bg-[#FFE8A3]/40 font-semibold shadow-lg">
                <Link to="/service-rates">{t('sections.viewAllPricing')}</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Booking modal */}
        {showBookingModal && isAuthenticated && user?.role === 'owner' && (
          <AppointmentBookingModal
            pets={userPets}
            onClose={() => setShowBookingModal(false)}
            onSuccess={handleBookingSuccess}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default HomePage;
