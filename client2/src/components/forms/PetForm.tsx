import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Formik, Form, Field } from 'formik';
import type { FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import LoadingSpinner from '../ui/loading-spinner';
import type { Pet, CreatePetData, PetSize } from '../../types';

const PET_SIZE_VALUES: PetSize[] = ['small', 'medium', 'large', 'xlarge'];

interface PetFormProps {
  pet?: Pet;
  onSubmit: (data: CreatePetData, imageFile?: File | null) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const PetForm = ({ pet, onSubmit, onCancel, isLoading = false }: PetFormProps) => {
  const { t } = useTranslation('booking');
  const { t: tc } = useTranslation('common');
  const isEditing = !!pet;
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    if (selectedImage) {
      const objectUrl = URL.createObjectURL(selectedImage);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setPreviewUrl('');
    return undefined;
  }, [selectedImage]);

  const PetSchema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string()
          .min(2, t('petForm.valNameMin'))
          .max(50, t('petForm.valNameMax'))
          .required(t('petForm.valNameRequired')),
        species: Yup.string()
          .oneOf(['dog', 'cat'], t('petForm.valSpecies'))
          .required(t('petForm.valSpeciesRequired')),
        breed: Yup.string()
          .min(2, t('petForm.valBreedMin'))
          .max(50, t('petForm.valBreedMax'))
          .required(t('petForm.valBreedRequired')),
        age: Yup.number()
          .min(0, t('petForm.valAgeMin'))
          .max(30, t('petForm.valAgeMax'))
          .required(t('petForm.valAgeRequired')),
        size: Yup.string()
          .oneOf(PET_SIZE_VALUES, t('petForm.valSizeRequired'))
          .required(t('petForm.valSizeRequired')),
        notesForGroomer: Yup.string().max(500, t('petForm.valNotesMax')),
      }),
    [t]
  );

  const initialValues: CreatePetData = {
    name: pet?.name || '',
    species: pet?.species || 'dog',
    breed: pet?.breed || '',
    age: pet?.age ?? 1,
    size: pet?.size || 'small',
    notes: pet?.notes || '',
    notesForGroomer: pet?.notesForGroomer || ''
  };

  const handleSubmit = async (
    values: CreatePetData,
    { setSubmitting, setStatus }: FormikHelpers<CreatePetData>
  ) => {
    try {
      setStatus(null);
      await onSubmit(values, selectedImage);
    } catch (error: unknown) {
      const apiError = error as { error?: string };
      setStatus(apiError.error || t('petForm.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-amber-200 bg-gradient-to-b from-[#FFFDF7] via-[#FFFCF2] to-[#FAF6EB] shadow-[0_22px_55px_rgba(120,80,20,0.16)]"
        variants={formVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <div className="flex items-center justify-between border-b border-amber-200 bg-gradient-to-r from-amber-100/60 to-yellow-100/55 p-6">
          <h2 className="text-xl font-semibold text-[#3F2A1E]">
            {isEditing ? t('petForm.editTitle') : t('petForm.addTitle')}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <Formik
            initialValues={initialValues}
            validationSchema={PetSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ errors, touched, isSubmitting, status }) => (
              <Form className="space-y-4">
                {status && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
                  >
                    {status}
                  </motion.div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#3F2A1E]">
                    {t('petForm.avatar')}
                  </label>
                  <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/45 p-3">
                    <div className="flex items-start gap-3">
                      <div className="h-20 w-20 overflow-hidden rounded-xl border border-amber-200 bg-white">
                        {previewUrl ? (
                          <img src={previewUrl} alt={t('petForm.avatarPreviewAlt')} className="h-full w-full object-cover" />
                        ) : pet?.imageUrl ? (
                          <img src={pet.imageUrl} alt={t('petForm.avatarPreviewAlt')} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl">
                            {pet?.species === 'cat' ? '😸' : '🐶'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          id="pet-avatar"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-amber-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setImageError('');
                            if (!file) {
                              setSelectedImage(null);
                              return;
                            }
                            const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
                            if (!allowed.includes(file.type)) {
                              setImageError(t('petForm.avatarInvalidType'));
                              setSelectedImage(null);
                              return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                              setImageError(t('petForm.avatarTooLarge'));
                              setSelectedImage(null);
                              return;
                            }
                            setSelectedImage(file);
                          }}
                        />
                        <p className="mt-2 text-xs text-amber-900/75">{t('petForm.avatarHint')}</p>
                        {imageError && <p className="mt-1 text-xs text-red-600">{imageError}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-[#3F2A1E]">
                    {t('petForm.name')} *
                  </label>
                  <Field
                    id="name"
                    name="name"
                    type="text"
                    className={`w-full rounded-2xl border bg-white/90 px-3 py-2 text-[#3F2A1E] shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                      errors.name && touched.name
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-300'
                        : 'border-amber-200'
                    }`}
                    placeholder={t('petForm.namePh')}
                  />
                  {errors.name && touched.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="species" className="mb-1 block text-sm font-medium text-[#3F2A1E]">
                    {t('petForm.species')} *
                  </label>
                  <Field
                    as="select"
                    id="species"
                    name="species"
                    className="w-full rounded-2xl border border-amber-200 bg-white/90 px-3 py-2 text-[#3F2A1E] shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    <option value="dog">{t('petForm.dog')}</option>
                    <option value="cat">{t('petForm.cat')}</option>
                  </Field>
                  {errors.species && touched.species && (
                    <p className="mt-1 text-sm text-red-600">{errors.species}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="breed" className="mb-1 block text-sm font-medium text-[#3F2A1E]">
                    {t('petForm.breed')} *
                  </label>
                  <Field
                    id="breed"
                    name="breed"
                    type="text"
                    className={`w-full rounded-2xl border bg-white/90 px-3 py-2 text-[#3F2A1E] shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                      errors.breed && touched.breed
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-300'
                        : 'border-amber-200'
                    }`}
                    placeholder={t('petForm.breedPh')}
                  />
                  {errors.breed && touched.breed && (
                    <p className="mt-1 text-sm text-red-600">{errors.breed}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="age" className="mb-1 block text-sm font-medium text-[#3F2A1E]">
                    {t('petForm.age')} *
                  </label>
                  <Field
                    id="age"
                    name="age"
                    type="number"
                    min="0"
                    max="30"
                    className={`w-full rounded-2xl border bg-white/90 px-3 py-2 text-[#3F2A1E] shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                      errors.age && touched.age
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-300'
                        : 'border-amber-200'
                    }`}
                    placeholder={t('petForm.agePh')}
                  />
                  {errors.age && touched.age && (
                    <p className="mt-1 text-sm text-red-600">{errors.age}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="size" className="mb-1 block text-sm font-medium text-[#3F2A1E]">
                    {t('petForm.size')} *
                  </label>
                  <Field
                    as="select"
                    id="size"
                    name="size"
                    className={`w-full rounded-2xl border bg-white/90 px-3 py-2 text-[#3F2A1E] shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                      errors.size && touched.size ? 'border-red-300' : 'border-amber-200'
                    }`}
                  >
                    <option value="small">{t('petSize.small')}</option>
                    <option value="medium">{t('petSize.medium')}</option>
                    <option value="large">{t('petSize.large')}</option>
                    <option value="xlarge">{t('petSize.xlarge')}</option>
                  </Field>
                  {errors.size && touched.size && (
                    <p className="mt-1 text-sm text-red-600">{errors.size}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="notesForGroomer" className="mb-1 block text-sm font-medium text-[#3F2A1E]">
                    {t('petForm.notes')}
                  </label>
                  <Field
                    as="textarea"
                    id="notesForGroomer"
                    name="notesForGroomer"
                    rows={3}
                    className="w-full rounded-2xl border border-amber-200 bg-white/90 px-3 py-2 text-[#3F2A1E] shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    placeholder={t('petForm.notesPh')}
                  />
                  {errors.notesForGroomer && touched.notesForGroomer && (
                    <p className="mt-1 text-sm text-red-600">{errors.notesForGroomer}</p>
                  )}
                </div>

                <div className="flex gap-3 border-t border-amber-200/80 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting || isLoading}
                    className="flex-1 rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                  >
                    {tc('actions.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                  >
                    {(isSubmitting || isLoading) ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {isEditing ? t('petForm.updating') : t('petForm.adding')}
                      </>
                    ) : (
                      isEditing ? t('petForm.submitEdit') : t('petForm.submitAdd')
                    )}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PetForm;
