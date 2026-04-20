import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import type { Pet } from '../../types';

interface PetCardProps {
  pet: Pet;
  onView: (pet: Pet) => void;
  onEdit: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
}

const PetCard = ({ pet, onView, onEdit, onDelete }: PetCardProps) => {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US';

  const getSpeciesEmoji = (species: string) => {
    return species === 'dog' ? '🐶' : '😸';
  };

  const formatAge = (age: number) =>
    age === 1 ? t('pets.ageOne') : t('pets.ageYears', { n: age });

  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-6">
        <div className="flex items-start mb-5">
          {pet.imageUrl ? (
            <img
              src={pet.imageUrl}
              alt={pet.name}
              className="mr-4 h-16 w-16 flex-shrink-0 rounded-xl border border-amber-200 object-cover"
            />
          ) : (
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center mr-4 border border-blue-100">
              <span className="text-2xl">{getSpeciesEmoji(pet.species)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">{pet.name}</h3>
            <p className="text-sm text-gray-600 capitalize font-medium">
              {pet.breed}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatAge(pet.age)}
            </p>
          </div>
        </div>

        {pet.notes && (
          <div className="mb-5">
            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-200">
              <p className="text-sm text-gray-700 line-clamp-2 font-medium">
                &ldquo;{pet.notes}&rdquo;
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center text-xs text-gray-500 mb-5 bg-gray-50 rounded-lg px-3 py-2">
          <CalendarDaysIcon className="h-4 w-4 mr-2" />
          <span className="font-medium">
            {t('pets.addedLabel')}{' '}
            {new Date(pet.createdAt).toLocaleDateString(locale, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onView(pet)}
            className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 font-medium text-sm shadow-sm"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            {t('pets.viewDetails')}
          </button>
          <button
            type="button"
            onClick={() => onEdit(pet)}
            className="flex items-center justify-center px-3 py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all duration-200 border border-blue-200 hover:border-blue-300"
            title={t('actions.edit')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(pet)}
            className="flex items-center justify-center px-3 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200 border border-red-200 hover:border-red-300"
            title={t('actions.delete')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PetCard;
