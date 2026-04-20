import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import { DatePicker } from '../ui/date-picker';
import LoadingSpinner from '../ui/loading-spinner';
import appointmentService from '../../services/appointmentService';
import groomerService from '../../services/groomerService';
import { petService } from '../../services/petService';
import type { PetStaffSearchResult, GroomerBookingSource, Appointment, PetSize } from '../../types';
import { groomingMinutesForSize, getLocalYmdToday, getLocalYmdWithMonthOffset } from '../../utils/booking';
import { toast } from 'sonner';

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface GroomerManualBookingModalProps {
  open: boolean;
  groomerId: string;
  groomerName?: string;
  onClose: () => void;
  onSuccess: (appointment: Appointment) => void;
}

const GroomerManualBookingModal = ({
  open,
  groomerId,
  groomerName,
  onClose,
  onSuccess,
}: GroomerManualBookingModalProps) => {
  const { t } = useTranslation('booking');
  const { t: tc } = useTranslation('common');
  const locale = 'zh-CN';

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<PetStaffSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPet, setSelectedPet] = useState<PetStaffSearchResult | null>(null);
  const [appointmentSource, setAppointmentSource] = useState<GroomerBookingSource>('groomer_created');
  const [serviceType, setServiceType] = useState<'basic' | 'full' | 'boarding' | ''>('');
  const [walkInPetSize, setWalkInPetSize] = useState<PetSize>('medium');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setSearchQ('');
    setSearchResults([]);
    setSelectedPet(null);
    setAppointmentSource('groomer_created');
    setServiceType('');
    setSelectedDate('');
    setSelectedTimeSlot('');
    setSpecialInstructions('');
    setAvailableSlots([]);
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  // debounced pet search
  useEffect(() => {
    if (!open) return;
    const q = searchQ.trim();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    const tmr = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const rows = await petService.searchPetsForStaffBooking(q);
        setSearchResults(rows);
      } catch {
        setSearchResults([]);
        toast.error(t('groomerManualBooking.searchFailed'));
      } finally {
        setSearchLoading(false);
      }
    }, 320);
    return () => clearTimeout(tmr);
  }, [searchQ, open, t]);

  useEffect(() => {
    if (!open || !groomerId || !selectedDate || !serviceType || serviceType === 'boarding') {
      setAvailableSlots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingSlots(true);
        const size = selectedPet?.size ?? walkInPetSize;
        const duration = groomingMinutesForSize(size) ?? (serviceType === 'basic' ? 60 : 120);
        const slots = await groomerService.getGroomerAvailability(groomerId, selectedDate, duration);
        if (!cancelled) setAvailableSlots(slots);
      } catch {
        if (!cancelled) setAvailableSlots([]);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, groomerId, selectedDate, serviceType, selectedPet, walkInPetSize]);

  const getMinDate = () => getLocalYmdToday();
  const getMaxDate = () => getLocalYmdWithMonthOffset(3);

  const formatTimeSlot = (slot: TimeSlot) => {
    const opt = { hour: 'numeric' as const, minute: '2-digit' as const, hour12: true, timeZone: 'Asia/Kuala_Lumpur' };
    const a = slot.start.toLocaleTimeString(locale, opt);
    const b = slot.end.toLocaleTimeString(locale, opt);
    return `${a} – ${b}`;
  };

  const ownerLabel = (pet: PetStaffSearchResult) => {
    const o = pet.ownerId;
    if (typeof o === 'object' && o !== null && 'name' in o) return o.name;
    return '';
  };
  const noPhotoText = t('petForm.avatarNoPhoto', { defaultValue: '暂无照片' });

  const sourceOptions = useMemo(
    () =>
      [
        { value: 'online' as const, label: t('groomerManualBooking.sourceOnline'), hint: t('groomerManualBooking.sourceOnlineHint') },
        { value: 'phone' as const, label: t('groomerManualBooking.sourcePhone'), hint: t('groomerManualBooking.sourcePhoneHint') },
        {
          value: 'groomer_created' as const,
          label: t('groomerManualBooking.sourceStore'),
          hint: t('groomerManualBooking.sourceStoreHint'),
        },
      ],
    [t]
  );

  const handleSubmit = async () => {
    if (!serviceType || !selectedDate) {
      toast.error(t('groomerManualBooking.fillAll'));
      return;
    }
    if (serviceType !== 'boarding' && !selectedTimeSlot) {
      toast.error(t('groomerManualBooking.fillAll'));
      return;
    }
    if (selectedPet && !selectedPet.size && (serviceType === 'boarding' || serviceType === 'basic' || serviceType === 'full')) {
      toast.error(t('modal.validation.petSize'));
      return;
    }
    try {
      setSubmitting(true);
      const apt = await appointmentService.createGroomerBooking({
        petId: selectedPet?._id,
        startTime: serviceType === 'boarding' ? undefined : selectedTimeSlot,
        checkInDate: serviceType === 'boarding' ? selectedDate : undefined,
        serviceType,
        appointmentSource,
        petSize: selectedPet ? undefined : walkInPetSize,
        specialInstructions: specialInstructions.trim() || undefined,
      });
      toast.success(t('groomerManualBooking.toastCreated'), { description: t('groomerManualBooking.toastCreatedDesc') });
      onSuccess(apt);
      onClose();
    } catch (err: unknown) {
      const o = err as { code?: string; message?: string; error?: string };
      if (o?.code === 'SLOT_CONFLICT') {
        toast.error(t('modal.slotConflictFriendly'));
      } else {
        toast.error(t('groomerManualBooking.toastFailed'), {
          description: o?.message || o?.error || tc('actions.retry'),
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            onClick={() => !submitting && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-amber-200 bg-gradient-to-b from-[#FFFDF7] via-[#FFFCF2] to-[#FAF6EB] shadow-[0_22px_55px_rgba(120,80,20,0.16)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-amber-200 bg-gradient-to-r from-amber-100/60 to-yellow-100/55 px-5 py-4 backdrop-blur-sm">
              <div>
                <h2 className="text-lg font-bold text-[#3F2A1E]">{t('groomerManualBooking.title')}</h2>
                <p className="text-xs text-amber-900/80">{t('groomerManualBooking.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-full p-1 text-amber-700 hover:bg-amber-100"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#3F2A1E]">{t('groomerManualBooking.groomerLabel')}</label>
                <p className="rounded-2xl border border-amber-200 bg-white/95 px-3 py-2 text-sm text-[#3F2A1E]">
                  {groomerName || t('appointmentDialog.na')}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#3F2A1E]">{t('groomerManualBooking.sourceLabel')}</label>
                <div className="space-y-2">
                  {sourceOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-3xl border-2 p-3 transition-colors ${
                        appointmentSource === opt.value
                          ? 'border-amber-400 bg-gradient-to-r from-amber-100/80 to-yellow-100/75 shadow-[0_8px_20px_rgba(245,158,11,0.15)]'
                          : 'border-amber-200 bg-white/90 hover:border-amber-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="appointmentSource"
                        value={opt.value}
                        checked={appointmentSource === opt.value}
                        onChange={() => setAppointmentSource(opt.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-[#3F2A1E]">{opt.label}</p>
                        <p className="text-xs text-amber-900/75">{opt.hint}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-[#3F2A1E]">
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  {t('groomerManualBooking.searchPetOptional')}
                </label>
                <input
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder={t('groomerManualBooking.searchPlaceholder')}
                  className="w-full rounded-2xl border border-amber-200 bg-white/95 px-3 py-2 text-sm text-[#3F2A1E] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                {searchLoading && (
                  <div className="mt-2 flex justify-center py-2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
                {!searchLoading && searchResults.length > 0 && !selectedPet && (
                  <ul className="mt-2 max-h-36 overflow-y-auto rounded-2xl border border-amber-200 bg-white/95 shadow-inner">
                    {searchResults.map((p) => (
                      <li key={p._id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPet(p);
                            setSpecialInstructions(p.notesForGroomer || p.notes || '');
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-[#3F2A1E] hover:bg-amber-50/70"
                        >
                          <div className="flex items-start gap-3">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="h-11 w-11 rounded-lg border border-amber-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-[10px] text-amber-800">
                                {noPhotoText}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-medium capitalize">{p.name}</span>
                              <span className="text-amber-900/75"> · {p.species} / {p.breed}</span>
                              {ownerLabel(p) && (
                                <span className="block text-xs text-amber-900/70">
                                  {t('groomerManualBooking.owner')}: {ownerLabel(p)}
                                </span>
                              )}
                              {(p.notesForGroomer || p.notes) && (
                                <span className="block truncate text-xs text-amber-900/75">
                                  {t('groomerManualBooking.groomerNote')}: {p.notesForGroomer || p.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!searchLoading && searchQ.trim() === '' && !selectedPet && (
                  <p className="mt-2 text-xs text-amber-900/75">
                    {t('groomerManualBooking.petOptionalHint')}
                  </p>
                )}
                {selectedPet && (
                  <div className="mt-2 flex items-center justify-between rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-100/70 to-yellow-100/70 px-3 py-2">
                    <div className="flex items-center gap-3">
                      {selectedPet.imageUrl ? (
                        <img
                          src={selectedPet.imageUrl}
                          alt={selectedPet.name}
                          className="h-11 w-11 rounded-lg border border-amber-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-amber-200 bg-white text-[10px] text-amber-800">
                          {noPhotoText}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-amber-950 capitalize">{selectedPet.name}</p>
                        <p className="text-xs text-amber-900/80">
                          {ownerLabel(selectedPet) && `${t('groomerManualBooking.owner')}: ${ownerLabel(selectedPet)}`}
                        </p>
                        {(selectedPet.notesForGroomer || selectedPet.notes) && (
                          <p className="mt-1 line-clamp-2 text-xs text-amber-900/80">
                            {t('groomerManualBooking.groomerNote')}: {selectedPet.notesForGroomer || selectedPet.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedPet(null)}>
                      {t('groomerManualBooking.changePet')}
                    </Button>
                  </div>
                )}

                {!selectedPet && (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-[#3F2A1E]">{t('petSize.label')}</label>
                    <select
                      value={walkInPetSize}
                      onChange={(e) => setWalkInPetSize(e.target.value as PetSize)}
                      className="w-full rounded-2xl border border-amber-200 bg-white/95 px-3 py-2 text-sm text-[#3F2A1E] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      <option value="small">{t('petSize.small')}</option>
                      <option value="medium">{t('petSize.medium')}</option>
                      <option value="large">{t('petSize.large')}</option>
                      <option value="xlarge">{t('petSize.xlarge')}</option>
                    </select>
                    <p className="mt-1 text-xs text-amber-900/75">{t('groomerManualBooking.walkInSizeHint')}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-[#3F2A1E]">{t('modal.serviceType')}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(['basic', 'full', 'boarding'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setServiceType(st);
                        if (st === 'boarding') setSelectedTimeSlot('');
                      }}
                      className={`rounded-3xl border-2 px-3 py-2 text-sm font-medium transition-colors ${
                        serviceType === st
                          ? 'border-amber-500 bg-gradient-to-br from-amber-100/80 to-yellow-100/70 text-amber-950 shadow-[0_8px_20px_rgba(245,158,11,0.16)]'
                          : 'border-amber-200 bg-white/90 text-[#3F2A1E] hover:border-amber-300'
                      }`}
                    >
                      {t(`serviceTypes.${st}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#3F2A1E]">{t('modal.preferredDate')}</label>
                <DatePicker
                  disableDate={(d) => d.getDay() === 3}
                  value={selectedDate}
                  onChange={(v) => {
                    setSelectedDate(v);
                    setSelectedTimeSlot('');
                  }}
                  placeholder={t('modal.datePlaceholder')}
                  minDate={getMinDate()}
                  maxDate={getMaxDate()}
                  contentClassName="z-[80]"
                />
              </div>

              {groomerId && selectedDate && serviceType && serviceType === 'boarding' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3 text-sm text-amber-950">
                  {t('modal.boardingSlotHint')}
                  <p className="mt-2 text-xs text-amber-900/85">{t('serviceTypes.boardingNoPrice')}</p>
                </div>
              )}

              {groomerId && selectedDate && serviceType && serviceType !== 'boarding' && (
                <div>
                  <p className="mb-2 text-sm font-medium text-[#3F2A1E]">{t('modal.timeSlots')}</p>
                  {loadingSlots ? (
                    <div className="flex justify-center py-6">
                      <LoadingSpinner />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="rounded-2xl bg-white/80 py-4 text-center text-sm text-amber-900/75">{t('modal.noSlots')}</p>
                  ) : (
                    <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                      {availableSlots.map((slot, i) => {
                        const val = slot.start.toISOString();
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedTimeSlot(val)}
                            className={`rounded-2xl border px-2 py-2 text-xs font-medium ${
                              selectedTimeSlot === val
                                ? 'border-amber-500 bg-amber-200 text-amber-950'
                                : 'border-amber-200 bg-white/90 text-[#3F2A1E] hover:border-amber-300'
                            }`}
                          >
                            {formatTimeSlot(slot)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-[#3F2A1E]">{t('modal.specialInstructions')}</label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-2xl border border-amber-200 bg-white/95 px-3 py-2 text-sm text-[#3F2A1E] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder={t('modal.instructionsPlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-amber-100 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  {tc('actions.cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    !serviceType ||
                    !selectedDate ||
                    (serviceType !== 'boarding' && !selectedTimeSlot)
                  }
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                >
                  {submitting ? <LoadingSpinner size="sm" /> : t('groomerManualBooking.submit')}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default GroomerManualBookingModal;
