import { useTranslation } from 'react-i18next';

type PolicyItem = { title: string; body: string };

/** Reuses the same i18n strings as the full Grooming policy page (services.groomingPolicy). */
export function GroomingPolicyTermsContent({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation('services');
  const items = t('groomingPolicy.items', { returnObjects: true }) as PolicyItem[];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3 text-center">
        <p className={`font-medium text-amber-950 ${compact ? 'text-xs' : 'text-sm'}`}>
          {t('groomingPolicy.intro')}
        </p>
      </div>
      <div
        className={`pr-1 ${compact ? 'space-y-3' : 'max-h-[min(50vh,380px)] space-y-4 overflow-y-auto'}`}
      >
        {Array.isArray(items) &&
          items.map((policy) => (
            <div
              key={policy.title}
              className="rounded-lg border border-amber-100/80 bg-white/90 px-4 py-3 shadow-sm"
            >
              <h4 className="mb-2 text-sm font-semibold text-amber-950">{policy.title}</h4>
              <div className="space-y-2 text-xs leading-relaxed text-gray-800 sm:text-sm">
                {policy.body.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
      </div>
      <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 px-4 py-3 text-center">
        <p className="text-sm font-medium text-amber-950">{t('groomingPolicy.closingLine1')}</p>
        <p className="text-xs text-amber-900/85 sm:text-sm">{t('groomingPolicy.closingLine2')}</p>
      </div>
    </div>
  );
}
