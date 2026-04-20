import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CheckIcon,
  XMarkIcon,
  CalendarIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { petService } from '../services/petService';
import { Button } from '../components/ui/button';
import LoadingSpinner from '../components/ui/loading-spinner';
import PageTransition from '../components/layout/PageTransition';
import AppointmentBookingModal from '../components/appointments/AppointmentBookingModal';
import { useAuthStore } from '../store/authStore';
import type { Pet, Appointment, User } from '../types';

const PetDetailPage = () => {
  const { t, i18n } = useTranslation('booking');
  const { t: tc } = useTranslation('common');
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US';
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [pet, setPet] = useState<Pet | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const isOwner = user?.role === 'owner';

  const loadPetData = useCallback(async () => {
    if (!petId) return;

    try {
      setLoading(true);
      setAppointmentsLoading(true);

      // New dedicated endpoint for better performance
      const [petData, petAppointmentsData] = await Promise.all([
        petService.getPetById(petId),
        petService.getPetAppointments(petId) // use dedicated pet appointments endpoint
      ]);

      setPet(petData);
      setEditedNotes(petData.notesForGroomer || petData.notes || '');
      
      // sort appointments by date (newest first) - with proper typing
      const sortedAppointments = petAppointmentsData.sort((a: Appointment, b: Appointment) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      setAppointments(sortedAppointments);
      
    } catch (error) {
      console.error('Error loading pet data:', error);
      // navigate back if pet not found
      navigate('/pets');
    } finally {
      setLoading(false);
      setAppointmentsLoading(false);
    }
  }, [petId, navigate]);

  useEffect(() => {
    if (petId) {
      loadPetData();
    }
  }, [petId, loadPetData]);

  const handleEditNotes = () => {
    setIsEditingNotes(true);
    setEditedNotes(pet?.notes || '');
  };

  const handleSaveNotes = async () => {
    if (!pet || !petId) return;

    try {
      setSaveLoading(true);
      
      // update pet with new notes
      const updatedPet = await petService.updatePet(pet._id, {
        notesForGroomer: editedNotes.trim(),
      });
      
      // ensure we have valid pet data before updating state
      if (updatedPet && updatedPet._id) {
        setPet(updatedPet);
        setIsEditingNotes(false);
      } else {
        throw new Error('Invalid pet data received from server');
      }
      
    } catch (error) {
      console.error('Error updating pet notes:', error);
      
      // more specific error handling
      let errorMessage = t('petDetail.notesSaveFailed');
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // create a proper type for the error response
        const apiError = error as { response?: { data?: { error?: string } } };
        errorMessage = apiError.response?.data?.error || errorMessage;
      }
      
      alert(errorMessage);
      
      // reset the edited notes to original val on err
      setEditedNotes(pet?.notesForGroomer || pet?.notes || '');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingNotes(false);
    setEditedNotes(pet?.notesForGroomer || pet?.notes || '');
  };

  const handleBookingSuccess = () => {
    setShowBookingModal(false);
    loadPetData(); // rf appts
  };

  const canUploadAvatar = user?.role === 'owner' || user?.role === 'admin';

  const handleAvatarUpload = async (file: File | null) => {
    if (!file || !pet) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      alert(t('petDetail.avatarInvalidType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(t('petDetail.avatarTooLarge'));
      return;
    }
    try {
      setAvatarUploading(true);
      const updated = await petService.uploadPetImage(pet._id, file);
      setPet(updated);
    } catch (error) {
      console.error('Error uploading pet avatar:', error);
      alert(t('petDetail.avatarUploadFailed'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const getSpeciesEmoji = (species: string) => {
    return species === 'dog' ? '🐶' : '😸';
  };

  const formatAge = (age: number | undefined) => {
    if (age === undefined || age === null || isNaN(age)) {
      return t('petDetail.ageUnknown');
    }
    return age === 1 ? t('petDetail.ageOne') : t('petDetail.ageYears', { n: age });
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return t('petDetail.dateUnknown');

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return t('petDetail.invalidDate');
    }

    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // use same visual status based on time (same logic as DashboardPage)
  const getVisualStatus = (appointment: Appointment) => {
    const now = new Date();
    const start = new Date(appointment.startTime);
    const end = new Date(appointment.endTime);
    
    // preserve manual overrides for all final statuses
    if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      return appointment.status;
    }
    
    // time-based visual logic for active appointments
    if (now >= start && now <= end && !['cancelled', 'no_show'].includes(appointment.status)) {
      return 'in_progress';
    }
    
    // change to complete if past end time (visual only)
    if (now > end && appointment.status === 'confirmed') {
      return 'completed';
    }
    
    return appointment.status; // use actual status as fallback
  };

  const getStatusIcon = (appointment: Appointment) => {
    const visualStatus = getVisualStatus(appointment);
    
    switch (visualStatus) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'confirmed':
        return <ClockIcon className="h-5 w-5 text-amber-500" />;
      case 'in_progress':
        return <ClockIcon className="h-5 w-5 text-amber-500" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = (appointment: Appointment) => {
    const visualStatus = getVisualStatus(appointment);

    switch (visualStatus) {
      case 'completed':
        return t('status.completed');
      case 'confirmed':
        return t('status.upcoming');
      case 'in_progress':
        return t('status.inProgress');
      case 'cancelled':
        return t('status.cancelled');
      case 'no_show':
        return t('status.noShow');
      default:
        return t('status.cancelled');
    }
  };

  const getServiceTypeLabel = (serviceType: string) => {
    if (serviceType === 'boarding') return t('serviceTypes.boarding');
    return t(`serviceTypes.${serviceType === 'basic' ? 'basic' : 'full'}`);
  };

  const getDuration = (serviceType: string) => {
    if (serviceType === 'boarding') return t('serviceTypes.boardingDuration');
    return serviceType === 'basic' ? t('petDetail.hourOne') : t('petDetail.hoursTwo');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FFFDF7] via-[#FAF6EB]/90 to-[#FFE8A3]/15">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FFFDF7] via-[#FAF6EB]/90 to-[#FFE8A3]/15">
        <div className="text-center">
          <p className="mb-4 text-amber-900/80">{t('petDetail.notFound')}</p>
          <Button onClick={() => navigate('/pets')}>
            {t('petDetail.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF7] via-[#FAF6EB]/90 to-[#FFE8A3]/15 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Button 
              onClick={() => navigate('/pets')} 
              variant="outline"
              size="sm"
              className="rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              {t('petDetail.back')}
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            
            <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FAF6EB] p-6 shadow-[0_12px_30px_rgba(120,80,20,0.1)]">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  {pet.imageUrl ? (
                    <img
                      src={pet.imageUrl}
                      alt={pet.name}
                      className="mr-4 h-20 w-20 rounded-2xl border border-amber-200 object-cover"
                    />
                  ) : (
                    <span className="text-4xl mr-4">{getSpeciesEmoji(pet.species)}</span>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-[#3F2A1E]">
                      {pet.name || t('petDetail.unknownPet')}
                    </h1>
                    <p className="text-lg capitalize text-amber-900/80">
                      {pet.breed || t('petDetail.unknownBreed')} • {formatAge(pet.age)}
                    </p>
                    <p className="mt-1 text-sm text-amber-900/70">
                      {t('petDetail.addedOn', { date: formatDate(pet.createdAt) })}
                    </p>
                  </div>
                </div>
                
                {isOwner && !isEditingNotes && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditNotes}
                    className="rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                  >
                    {t('petDetail.editNotes')}
                  </Button>
                )}
              </div>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/45 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-amber-900">{t('petDetail.avatarTitle')}</h3>
                    <p className="text-xs text-amber-900/75">{t('petDetail.avatarHint')}</p>
                  </div>
                  {canUploadAvatar && (
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50">
                      <PhotoIcon className="mr-2 h-4 w-4" />
                      {avatarUploading ? t('petDetail.avatarUploading') : t('petDetail.avatarUploadBtn')}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={avatarUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          void handleAvatarUpload(file);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Notes/special instructions section */}
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-[#3F2A1E]">
                    {t('petDetail.notesTitle')}
                  </h3> 
                  {isEditingNotes && (
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={saveLoading}
                        className="rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                      >
                        {saveLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <CheckIcon className="h-4 w-4 mr-1" />
                            {tc('actions.save')}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={saveLoading}
                        className="rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                      >
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        {tc('actions.cancel')}
                      </Button>
                    </div>
                  )}
                </div>
                
                {isEditingNotes ? (
                  <div>
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder={t('petDetail.notesPlaceholder')}
                      className="w-full resize-none rounded-2xl border border-amber-200 bg-white/95 p-3 text-[#3F2A1E] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-amber-900/75">
                        {t('petDetail.notesHint')}
                      </p>
                      <span className="text-xs text-amber-900/65">
                        {editedNotes.length}/500
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    {(pet.notesForGroomer || pet.notes) ? (
                      <p className="text-[#3F2A1E]">{pet.notesForGroomer || pet.notes}</p>
                    ) : (
                      <p className="italic text-amber-900/70">
                        {t('petDetail.notesEmpty')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Grooming history - filtered for the specific pet */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FAF6EB] shadow-[0_12px_30px_rgba(120,80,20,0.1)]"
          >
            <div className="border-b border-amber-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#3F2A1E]">
                  {t('petDetail.historyTitle', { name: pet?.name ?? '' })}
                </h2>
                {isOwner && (
                  <Button onClick={() => setShowBookingModal(true)} size="sm">
                    {t('petDetail.book')}
                  </Button>
                )}
              </div>
            </div>

            <div className="p-6">
              {appointmentsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="mx-auto mb-4 h-16 w-16 text-amber-700/70" />
                  <h3 className="mb-2 text-lg font-medium text-[#3F2A1E]">
                    {t('petDetail.noHistoryTitle')}
                  </h3>
                  <p className="mb-4 text-amber-900/75">
                    {t('petDetail.noHistoryBody', { name: pet?.name ?? '' })}
                  </p>
                  {isOwner && (
                    <Button onClick={() => setShowBookingModal(true)}>
                      {t('petDetail.bookFirst')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Show appointment count */}
                  <div className="mb-4 text-sm text-amber-900/75">
                    {t('petDetail.countFound', { count: appointments.length, name: pet?.name ?? '' })}
                  </div>
                  
                  {appointments.map((appointment, index) => (
                    <motion.div
                      key={appointment._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="rounded-2xl border border-amber-200 bg-white/80 p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {getStatusIcon(appointment)}
                          <span className="ml-2 font-medium text-[#3F2A1E]">
                            {getServiceTypeLabel(appointment.serviceType)}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getVisualStatus(appointment) === 'completed' 
                            ? 'bg-emerald-100 text-emerald-700'
                            : getVisualStatus(appointment) === 'confirmed'
                            ? 'bg-amber-100 text-amber-700'
                            : getVisualStatus(appointment) === 'in_progress'
                            ? 'bg-yellow-100 text-amber-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {getStatusText(appointment)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 text-sm text-amber-900/80 md:grid-cols-3">
                        <div>
                          <span className="font-medium">{t('petDetail.date')}:</span> {formatDate(appointment.startTime)}
                        </div>
                        <div>
                          <span className="font-medium">{t('petDetail.time')}:</span> {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                        </div>
                        <div>
                          <span className="font-medium">{t('petDetail.duration')}:</span> {getDuration(appointment.serviceType)}
                        </div>
                      </div>

                      {/* Show groomer info if available - Fixed typing */}
                      {appointment.groomerId && typeof appointment.groomerId === 'object' && 'name' in appointment.groomerId && (
                        <div className="mt-2 text-sm text-amber-900/80">
                          <span className="font-medium">{t('petDetail.groomer')}:</span> {(appointment.groomerId as User).name}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Booking modal with pre-selected pet */}
      {showBookingModal && user?.role === 'owner' && pet && (
        <AppointmentBookingModal
          pets={[pet]}
          selectedPetId={pet._id} // pre-select the current pet
          onClose={() => setShowBookingModal(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </PageTransition>
  );
};

export default PetDetailPage;
