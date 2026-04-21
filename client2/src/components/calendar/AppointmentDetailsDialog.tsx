import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { Appointment, Pet, User } from '../../types';
import appointmentService from '../../services/appointmentService';
import { petService } from '../../services/petService';
import { toast } from 'sonner';
import LoadingSpinner from '../ui/loading-spinner';
import { toLocalDate, toLocalClock } from '../../utils/time';

// extended interfaces for additional properties that may exist
interface ExtendedUser extends User {
  phone?: string;
}

interface ExtendedPet extends Pet {
  weight?: number;
}

interface AppointmentDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  /** Groomer calendar / dashboard: reschedule & cancel */
  staffMode?: boolean;
  onStaffReschedule?: (appointment: Appointment) => void;
  /** After cancel succeeds (parent should refresh schedule / list) */
  onStaffCancelled?: () => void;
}

function canModifyByPolicy(startTime: string): boolean {
  const hours = (new Date(startTime).getTime() - Date.now()) / (1000 * 60 * 60);
  return hours > 24;
}

const AppointmentDetailsDialog = ({
  isOpen,
  onClose,
  appointment,
  staffMode = false,
  onStaffReschedule,
  onStaffCancelled,
}: AppointmentDetailsDialogProps) => {
  const { t } = useTranslation('booking');
  const { t: tc } = useTranslation('common');
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [petImageBroken, setPetImageBroken] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowCancelConfirm(false);
      setCancelling(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // reset fallback state when opening a new appointment detail
    if (isOpen) {
      setPetImageBroken(false);
    }
  }, [isOpen, appointment._id, appointment.updatedAt]);

  // safely extract pet and owner data - now correctly handles both string and object cases
  const pet = typeof appointment.petId === 'object' && appointment.petId !== null 
    ? appointment.petId as ExtendedPet 
    : null;
  const petImageUrl = pet?.imageUrl ? petService.toAbsoluteImageUrl(pet.imageUrl) : '';
  const groomerNote = pet?.notesForGroomer || pet?.notes || '';
  const owner = typeof appointment.ownerId === 'object' && appointment.ownerId !== null 
    ? appointment.ownerId as ExtendedUser 
    : null;

  const formatDateTime = (dateString: string) => {
    return {
      date: toLocalDate(dateString),
      time: toLocalClock(dateString),
    };
  };

  const getDuration = (serviceType: string) => {
    if (serviceType === 'boarding') return t('serviceTypes.boardingDuration');
    return t(`serviceTypes.${serviceType === 'basic' ? 'basicDuration' : 'fullDuration'}`);
  };

  const rawStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      confirmed: t('rawStatus.confirmed'),
      in_progress: t('rawStatus.in_progress'),
      completed: t('rawStatus.completed'),
      cancelled: t('rawStatus.cancelled'),
      no_show: t('rawStatus.no_show'),
    };
    return map[status] || status;
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-amber-100/85 text-amber-900 border-amber-300';
      case 'in_progress': return 'bg-yellow-100/90 text-amber-900 border-amber-300';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-amber-50 text-amber-900 border-amber-200';
    }
  };

  const { date, time } = formatDateTime(appointment.startTime);
  const endTime = formatDateTime(appointment.endTime).time;

  const modifyOk =
    canModifyByPolicy(appointment.startTime) &&
    ['confirmed', 'in_progress'].includes(appointment.status);

  const handleStaffCancel = async () => {
    try {
      setCancelling(true);
      await appointmentService.deleteAppointment(appointment._id);
      toast.success(t('staff.toastCancelledTitle'), { description: t('staff.toastCancelledDesc') });
      onStaffCancelled?.();
      setShowCancelConfirm(false);
      onClose();
    } catch (err: unknown) {
      const o = err as { message?: string; error?: string };
      toast.error(t('staff.toastCancelFailTitle'), {
        description: o?.message || o?.error || tc('actions.retry'),
      });
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-amber-200 bg-gradient-to-b from-[#FFFDF7] via-[#FFFCF2] to-[#FAF6EB] shadow-[0_22px_55px_rgba(120,80,20,0.16)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-200/80 bg-gradient-to-r from-amber-100/60 to-yellow-100/55 p-6">
              <div>
                <h3 className="text-xl font-bold text-[#3F2A1E]">
                  {pet?.name
                    ? t('appointmentDialog.title', { name: pet.name })
                    : t('appointmentDialog.titleLoading')}
                </h3>
                <p className="text-sm text-amber-900/75">
                  {t('appointmentDialog.bookingRef', { id: appointment._id.slice(-8).toUpperCase() })}
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(appointment.status)}`}>
                  {rawStatusLabel(appointment.status)}
                </span>
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Appointment details */}
              <Card className="rounded-3xl border border-amber-200 bg-gradient-to-br from-[#FFF9EC] to-[#FAF6EB] shadow-[0_12px_30px_rgba(120,80,20,0.1)]">
                <CardHeader>
                  <CardTitle className="text-[#3F2A1E]">{t('appointmentDialog.detailsSection')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-amber-900/75">{t('detail.date')}</p>
                      <p className="text-[#3F2A1E]">{date}</p>
                    </div>
                    <div>
                      <p className="font-medium text-amber-900/75">{t('detail.time')}</p>
                      <p className="text-[#3F2A1E]">{time} - {endTime}</p>
                    </div>
                    <div>
                      <p className="font-medium text-amber-900/75">{t('table.service')}</p>
                      <p className="text-[#3F2A1E] capitalize">{t(`serviceTypes.${appointment.serviceType}`)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-amber-900/75">{t('petDetail.duration')}</p>
                      <p className="text-[#3F2A1E]">{getDuration(appointment.serviceType)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pet information */}
              <Card className="rounded-3xl border border-amber-200 bg-gradient-to-br from-[#FFF9EC] to-[#FAF6EB] shadow-[0_12px_30px_rgba(120,80,20,0.1)]">
                <CardHeader>
                  <CardTitle className="text-[#3F2A1E]">{t('appointmentDialog.petSection')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Pet image / placeholder */}
                    <div className="flex-shrink-0">
                      {petImageUrl && !petImageBroken ? (
                        <img
                          src={petImageUrl}
                          alt={pet?.name || t('appointmentDialog.noPhoto')}
                          className="h-32 w-32 rounded-lg border border-amber-200 object-cover"
                          onError={() => setPetImageBroken(true)}
                        />
                      ) : (
                        <div className="flex h-32 w-32 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/75">
                          <div className="text-center text-amber-900/70">
                            <div className="text-2xl mb-1">{t('appointmentDialog.photoPlaceholder')}</div>
                            <div className="text-xs">{t('appointmentDialog.noPhoto')}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Pet details */}
                    <div className="flex-1 space-y-4">
                      {pet ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="font-medium text-amber-900/75">{t('appointmentDialog.name')}</p>
                            <p className="text-[#3F2A1E] capitalize">{pet.name || t('appointmentDialog.na')}</p>
                          </div>
                          <div>
                            <p className="font-medium text-amber-900/75">{t('appointmentDialog.species')}</p>
                            <p className="text-[#3F2A1E] capitalize">{pet.species || t('appointmentDialog.na')}</p>
                          </div>
                          <div>
                            <p className="font-medium text-amber-900/75">{t('appointmentDialog.breed')}</p>
                            <p className="text-[#3F2A1E] capitalize">{pet.breed || t('appointmentDialog.na')}</p>
                          </div>
                          <div>
                            <p className="font-medium text-amber-900/75">{t('appointmentDialog.age')}</p>
                            <p className="text-[#3F2A1E]">{pet.age != null ? t('appointmentDialog.ageYears', { count: pet.age }) : t('appointmentDialog.na')}</p>
                          </div>
                          
                          {/* Special instructions - spans full width */}
                          {groomerNote && (
                            <div className="col-span-2 md:col-span-4">
                              <p className="mb-2 font-medium text-amber-900/75">
                                {t('appointmentDialog.groomerNote')}
                              </p>
                              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                <p className="whitespace-pre-wrap text-sm text-[#3F2A1E]">{groomerNote}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center">
                          <p className="text-amber-900/80">{t('appointmentDialog.petLoadError')}</p>
                          <p className="mt-1 text-sm text-amber-900/65">
                            ID: {typeof appointment.petId === 'string' ? appointment.petId : t('appointmentDialog.na')}
                          </p>
                        </div>
                      )}

                      {pet?.weight && (
                        <div>
                          <p className="font-medium text-amber-900/75">{t('appointmentDialog.weight')}</p>
                          <p className="text-[#3F2A1E]">{t('appointmentDialog.weightLbs', { n: pet.weight })}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Owner contact */}
              <Card className="rounded-3xl border border-amber-200 bg-gradient-to-br from-[#FFF9EC] to-[#FAF6EB] shadow-[0_12px_30px_rgba(120,80,20,0.1)]">
                <CardHeader>
                  <CardTitle className="text-[#3F2A1E]">{t('appointmentDialog.ownerSection')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {owner ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-lg font-medium text-[#3F2A1E]">{owner.name || t('appointmentDialog.na')}</p>
                        <p className="text-sm text-amber-900/75">{t('appointmentDialog.ownerRole')}</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                        {owner.email && (
                          <div className="flex items-center gap-2">
                            <EnvelopeIcon className="h-4 w-4 text-amber-700/70" />
                            <a href={`mailto:${owner.email}`} className="text-sm text-amber-800 hover:text-amber-950">
                              {owner.email}
                            </a>
                          </div>
                        )}
                        
                        {owner.phone && (
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="h-4 w-4 text-amber-700/70" />
                            <a href={`tel:${owner.phone}`} className="text-sm text-amber-800 hover:text-amber-950">
                              {owner.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center">
                      <p className="text-amber-900/80">{t('appointmentDialog.ownerLoadError')}</p>
                      <p className="mt-1 text-sm text-amber-900/65">
                        ID: {typeof appointment.ownerId === 'string' ? appointment.ownerId : t('appointmentDialog.na')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-amber-200/80 bg-gradient-to-r from-amber-100/45 to-yellow-100/40 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {staffMode && showCancelConfirm && (
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                    <p className="text-sm text-amber-900">{t('staff.cancelConfirm')}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowCancelConfirm(false)} disabled={cancelling}>
                        {tc('actions.back')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleStaffCancel}
                        disabled={cancelling}
                        className="gap-1"
                      >
                        {cancelling ? <LoadingSpinner size="sm" /> : <XCircleIcon className="h-4 w-4" />}
                        {t('staff.confirmCancel')}
                      </Button>
                    </div>
                  </div>
                )}
                {staffMode && !showCancelConfirm && modifyOk && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                      onClick={() => {
                        onStaffReschedule?.(appointment);
                        onClose();
                      }}
                    >
                      <ArrowPathIcon className="mr-2 h-4 w-4" />
                      {t('staff.reschedule')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      <XCircleIcon className="mr-2 h-4 w-4" />
                      {t('staff.cancelAppointment')}
                    </Button>
                  </>
                )}
              </div>
              <Button variant="outline" onClick={onClose} className="shrink-0">
                {tc('actions.close')}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default AppointmentDetailsDialog;
