import { useTranslation } from 'react-i18next';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa6';

/** Place link query (open in Google Maps app / web). */
const MAP_QUERY =
  '15, Jalan Rodat 11/KU6, Bandar Bukit Raja, 41050 Klang, Selangor';

/** Official embed from Google Maps (place pin). */
const GOOGLE_MAPS_EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3984.034815903253!2d101.43848059999999!3d3.0853829999999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31cc53901fdc53d9%3A0x445a26109923d1db!2sPetGround!5e0!3m2!1sen!2smy!4v1774505338932!5m2!1sen!2smy';

const WHATSAPP_URL = 'https://wa.me/601160663211';
const INSTAGRAM_URL =
  'https://www.instagram.com/sweety.b.diary?igsh=amk0bDBpejQzbnJm';

const Footer = () => {
  const { t } = useTranslation('common');

  const mapAddress = encodeURIComponent(MAP_QUERY);

  const schedule: Array<{ dayKey: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'; closed?: boolean }> = [
    { dayKey: 'mon' },
    { dayKey: 'tue' },
    { dayKey: 'wed', closed: true },
    { dayKey: 'thu' },
    { dayKey: 'fri' },
    { dayKey: 'sat' },
    { dayKey: 'sun' },
  ];

  const socialBtnClass =
    'inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#F9C74F]/45 bg-white/95 text-[1.35rem] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F9C74F] hover:bg-[#FFFDF7] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6A800]';

  return (
    <footer
      id="footer"
      className="bg-gradient-to-b from-[#FFF9E8] to-[#FFF3D6] text-[#4A3B2A] py-12 rounded-t-[2.5rem] border-t-2 border-[#F9C74F]/40 shadow-[0_-16px_48px_-24px_rgba(249,199,79,0.35)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#B8860B]">{t('footer.contactTitle')}</h3>
            <div className="text-[#6B5A45] space-y-3">
              <div className="flex items-start">
                <span className="text-[#E6A800] mr-2">📍</span>
                <div>
                  <p className="font-medium text-[#4A3B2A] text-sm">{t('footer.venueName')}</p>
                  <p className="text-sm">{t('footer.addressLine1')}</p>
                  <p className="text-sm">{t('footer.addressLine2')}</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-[#E6A800] mr-2 shrink-0">📞</span>
                <div className="text-sm space-y-2">
                  <a
                    href="tel:+601160663211"
                    className="block font-medium text-[#4A3B2A] hover:text-[#B8860B] transition-colors w-fit"
                  >
                    {t('footer.phoneDisplay')}
                  </a>
                  <p className="text-xs text-[#6B5A45]/90 leading-snug">{t('footer.socialHint')}</p>
                  <div className="flex flex-wrap items-center gap-3 pt-0.5">
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${socialBtnClass} text-[#25D366]`}
                      aria-label={t('footer.whatsappAria')}
                    >
                      <FaWhatsapp className="h-7 w-7" aria-hidden />
                    </a>
                    <a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${socialBtnClass} text-[#E4405F]`}
                      aria-label={t('footer.instagramAria')}
                    >
                      <FaInstagram className="h-6 w-6" aria-hidden />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4 text-[#B8860B]">{t('footer.findUs')}</h4>
            <div className="relative">
              <div className="aspect-w-16 aspect-h-12 rounded-2xl overflow-hidden border-2 border-[#F9C74F]/35">
                <iframe
                  src={GOOGLE_MAPS_EMBED_SRC}
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={t('footer.mapTitle')}
                  className="h-[200px] w-full rounded-2xl"
                />
              </div>
              <div className="mt-3">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#B8860B] hover:text-[#8B6914] transition-colors text-sm flex items-center font-medium"
                >
                  📍 {t('footer.mapDirections')}
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4 text-[#B8860B]">{t('footer.hoursTitle')}</h4>
            <div className="space-y-2 text-[#6B5A45] text-sm">
              {schedule.map((row) => (
                <div key={row.dayKey} className="flex justify-between items-center gap-2">
                  <span className="font-medium text-[#4A3B2A]">{t(`weekdays.${row.dayKey}`)}</span>
                  <span
                    className={
                      row.closed ? 'text-[#C9A000] font-medium shrink-0' : 'text-[#6B5A45] shrink-0'
                    }
                  >
                    {t(`hours.${row.dayKey}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[#F9C74F]/35 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-[#8A7968] text-sm mb-4 md:mb-0">
              <p>{t('footer.copyright')}</p>
            </div>
            <div className="flex space-x-6 text-[#B8860B] text-sm font-medium">
              <p>{t('footer.tagline')}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
