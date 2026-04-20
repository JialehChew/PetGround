import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';

type PolicyItem = { title: string; body: string };

const GroomingPolicyPage = () => {
  const { t } = useTranslation('services');
  const items = t('groomingPolicy.items', { returnObjects: true }) as PolicyItem[];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50">
        <section className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {t('groomingPolicy.pageTitle')}
              </h1>
              <p className="text-lg text-gray-600">
                {t('groomingPolicy.intro')}
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
              {Array.isArray(items) &&
                items.map((policy, index) => (
                  <motion.div
                    key={policy.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-lg p-6 shadow-sm border"
                  >
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {policy.title}
                    </h3>
                    <div className="text-gray-700 leading-relaxed space-y-2">
                      {policy.body.split('\n\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  </motion.div>
                ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center"
            >
              <p className="text-lg font-medium text-blue-900 mb-2">
                {t('groomingPolicy.closingLine1')}
              </p>
              <p className="text-blue-700">
                {t('groomingPolicy.closingLine2')}
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
};

export default GroomingPolicyPage;
