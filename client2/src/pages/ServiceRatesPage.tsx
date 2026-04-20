import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ClockIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  ScissorsIcon,
} from '@heroicons/react/24/outline';
import PageTransition from '../components/layout/PageTransition';
import serviceRatesImage from '../assets/service_rates.webp';

type PricingRow = { category: string; price: string; breeds: string };

const ServiceRatesPage = () => {
  const { t } = useTranslation('services');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  const dogBasicIncludes = t('dogBasic.includes', { returnObjects: true }) as string[];
  const dogBasicPricing = t('dogBasicPricing', { returnObjects: true }) as PricingRow[];
  const dogFullIncludes = t('dogFull.includes', { returnObjects: true }) as string[];
  const dogFullPricing = t('dogFullPricing', { returnObjects: true }) as PricingRow[];
  const catBasicItems = t('catBasic.items', { returnObjects: true }) as string[];
  const catFullItems = t('catFull.items', { returnObjects: true }) as string[];

  const ServiceCard = ({
    title,
    duration,
    description,
    includes,
    pricing,
  }: {
    title: string;
    duration: string;
    description?: string;
    includes: string[];
    pricing: PricingRow[];
  }) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="bg-white rounded-3xl shadow-lg border-2 border-[#F9C74F]/25 p-6 mb-6 hover:shadow-xl"
    >
      <div className="flex items-center mb-4">
        <ScissorsIcon className="h-6 w-6 text-[#C9A000] mr-3" />
        <div>
          <h3 className="text-xl font-semibold text-[#3F2A1E]">{title}</h3>
          <div className="flex items-center text-[#5C4A3A] mt-1">
            <ClockIcon className="h-4 w-4 mr-1 text-[#F9C74F]" />
            <span className="text-sm">{duration}</span>
          </div>
        </div>
      </div>

      {description && <p className="text-[#5C4A3A] mb-4">{description}</p>}

      <div className="mb-6">
        <h4 className="font-medium text-[#3F2A1E] mb-2">{t('labels.includes')}</h4>
        <ul className="text-sm text-[#5C4A3A] space-y-1">
          {includes.map((item, index) => (
            <li key={index} className="flex items-start">
              <span className="text-[#FFCC00] mr-2 font-bold">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pricing.map((priceInfo, index) => (
          <div
            key={index}
            className="border-2 border-[#FFE8A3] rounded-3xl p-4 bg-[#FFFCF5] shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-2">
              <CurrencyDollarIcon className="h-5 w-5 text-[#C9A000] mr-2" />
              <h5 className="font-semibold text-[#3F2A1E]">{priceInfo.category}</h5>
            </div>
            <p className="text-2xl font-bold text-[#B8860B] mb-2">{priceInfo.price}</p>
            <p className="text-xs text-[#6B5A4A] leading-relaxed">{priceInfo.breeds}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF7] via-[#FAF6EB] to-[#FFE8A3]/20 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl font-bold text-[#3F2A1E] mb-2 drop-shadow-sm">{t('pageTitle')}</h1>
            <p className="text-[#5C4A3A] mb-8 text-lg">{t('pageSubtitle')}</p>
            <div className="max-w-4xl mx-auto">
              <img
                src={serviceRatesImage}
                alt={t('heroAlt')}
                className="w-full h-auto rounded-3xl shadow-xl border-2 border-[#F9C74F]/30"
              />
            </div>
          </motion.div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <motion.div
              variants={itemVariants}
              className="bg-[#FFE8A3]/50 border-2 border-[#F9C74F]/40 rounded-3xl p-6 mb-8 shadow-lg"
            >
              <div className="flex items-start">
                <InformationCircleIcon className="h-6 w-6 text-[#B8860B] mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-[#3F2A1E] mb-2">{t('notice.title')}</h3>
                  <p className="text-[#5C4A3A] text-sm leading-relaxed">{t('notice.body')}</p>
                </div>
              </div>
            </motion.div>

            <ServiceCard
              title={t('dogBasic.title')}
              duration={t('dogBasic.duration')}
              includes={dogBasicIncludes}
              pricing={dogBasicPricing}
            />

            <ServiceCard
              title={t('dogFull.title')}
              duration={t('dogFull.duration')}
              includes={dogFullIncludes}
              pricing={dogFullPricing}
            />

            <motion.div
              variants={itemVariants}
              className="bg-white rounded-3xl shadow-lg border-2 border-[#F9C74F]/25 p-6 mb-8"
            >
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">🐱</span>
                <h3 className="text-xl font-semibold text-[#3F2A1E]">{t('cat.title')}</h3>
              </div>

              <p className="text-[#5C4A3A] mb-6">{t('cat.intro')}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-[#FFE8A3] rounded-3xl p-6 bg-[#FFFCF5] shadow-md">
                  <div className="flex items-center mb-3">
                    <ClockIcon className="h-5 w-5 text-[#F9C74F] mr-2" />
                    <h4 className="font-semibold text-[#3F2A1E]">{t('catBasic.title')}</h4>
                  </div>
                  <p className="text-2xl font-bold text-[#B8860B] mb-3">{t('catBasic.price')}</p>
                  <div className="text-sm text-[#5C4A3A]">
                    <p className="font-medium mb-2">{t('labels.includes')}</p>
                    <ul className="space-y-1">
                      {catBasicItems.map((line, i) => (
                        <li key={i}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-2 border-[#FFE8A3] rounded-3xl p-6 bg-[#FFFCF5] shadow-md">
                  <div className="flex items-center mb-3">
                    <ClockIcon className="h-5 w-5 text-[#F9C74F] mr-2" />
                    <h4 className="font-semibold text-[#3F2A1E]">{t('catFull.title')}</h4>
                  </div>
                  <p className="text-2xl font-bold text-[#B8860B] mb-3">{t('catFull.price')}</p>
                  <div className="text-sm text-[#5C4A3A]">
                    <p className="font-medium mb-2">{t('labels.includes')}</p>
                    <ul className="space-y-1">
                      {catFullItems.map((line, i) => (
                        <li key={i}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white rounded-3xl shadow-lg border-2 border-[#F9C74F]/25 p-6">
              <h3 className="text-xl font-semibold text-[#3F2A1E] mb-6">{t('sizeGroups.title')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="border-l-4 border-[#FFCC00] pl-4 rounded-r-2xl bg-[#FFFCF5]/80 py-2">
                  <h4 className="font-semibold text-[#3F2A1E] mb-2">{t('sizeGroups.small')}</h4>
                  <p className="text-sm text-[#5C4A3A] leading-relaxed">{t('sizeGroups.smallBreeds')}</p>
                </div>
                <div className="border-l-4 border-[#F9C74F] pl-4 rounded-r-2xl bg-[#FFFCF5]/80 py-2">
                  <h4 className="font-semibold text-[#3F2A1E] mb-2">{t('sizeGroups.medium')}</h4>
                  <p className="text-sm text-[#5C4A3A] leading-relaxed">{t('sizeGroups.mediumBreeds')}</p>
                </div>
                <div className="border-l-4 border-[#E6A800] pl-4 rounded-r-2xl bg-[#FFFCF5]/80 py-2">
                  <h4 className="font-semibold text-[#3F2A1E] mb-2">{t('sizeGroups.large')}</h4>
                  <p className="text-sm text-[#5C4A3A] leading-relaxed">{t('sizeGroups.largeBreeds')}</p>
                </div>
                <div className="border-l-4 border-[#C9A000] pl-4 rounded-r-2xl bg-[#FFFCF5]/80 py-2">
                  <h4 className="font-semibold text-[#3F2A1E] mb-2">{t('sizeGroups.xlarge')}</h4>
                  <p className="text-sm text-[#5C4A3A] leading-relaxed">{t('sizeGroups.xlargeBreeds')}</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-[#FAF6EB] rounded-3xl border border-[#FFE8A3]">
                <p className="text-sm text-[#5C4A3A] italic">
                  <strong>{t('labels.notePrefix')}</strong> {t('sizeGroups.note')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ServiceRatesPage;
