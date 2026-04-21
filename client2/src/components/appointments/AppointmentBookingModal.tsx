import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  XMarkIcon,
  CalendarDaysIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import { DatePicker } from '../ui/date-picker';
import LoadingSpinner from '../ui/loading-spinner';
import appointmentService from '../../services/appointmentService';
import groomerService from '../../services/groomerService';
import { petService } from '../../services/petService';
import type { Pet, User, Appointment, CreateAppointmentData } from '../../types';
import {
  groomingMinutesForSize,
  formatDateYmdInput,
  addOneCalendarDayYmd,
  getLocalYmdToday,
  getLocalYmdWithMonthOffset,
} from '../../utils/booking';
import { BookingTermsAgreementDialog } from './BookingTermsAgreementDialog';
import { toast } from "sonner"

interface AppointmentBookingModalProps {
  pets: Pet[];
  selectedPetId?: string;
  editingAppointment?: Appointment | null;
  onClose: () => void;
  onSuccess: (appointment: Appointment) => void;
  /** Groomer reschedule: fixed groomer, hide selector */
  lockGroomerId?: string;
  lockGroomerName?: string;
}

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

type BookingStep = 'selection' | 'summary' | 'confirmation';
const MAX_BOARDING_DAYS = 14;

function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  if ([y, m, d].some((n) => Number.isNaN(n))) return '';
  const dt = new Date(y, m - 1, d + days);
  return formatDateYmdInput(dt);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

const AppointmentBookingModal = ({
  pets,
  selectedPetId,
  editingAppointment,
  onClose,
  onSuccess,
  lockGroomerId,
  lockGroomerName,
}: AppointmentBookingModalProps) => {
  const { t, i18n } = useTranslation('booking');
  const { t: tc } = useTranslation('common');
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-MY';

  const [groomers, setGroomers] = useState<User[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentStep, setCurrentStep] = useState<BookingStep>('selection');
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState('');
  const [saveInstructionsLoading, setSaveInstructionsLoading] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [boardingOccupancy, setBoardingOccupancy] = useState<Record<string, { occupied: number; capacity: number }>>(
    {}
  );
  const [loadingBoardingOccupancy, setLoadingBoardingOccupancy] = useState(false);

  const isEditing = !!editingAppointment;

  const validationSchema = useMemo(
    () =>
      Yup.object({
        petId: Yup.string().required(t('modal.validation.pet')),
        serviceType: Yup.string()
          .oneOf(['basic', 'full', 'boarding'])
          .required(t('modal.validation.service')),
        // Must stay YYYY-MM-DD string — same as DatePicker output (Yup.date() + string mix caused boarding validation issues).
        selectedDate: Yup.string()
          .matches(/^\d{4}-\d{2}-\d{2}$/, t('modal.validation.date'))
          .required(t('modal.validation.date')),
        checkOutDate: Yup.string().when('serviceType', ([st], schema) =>
          st === 'boarding'
            ? schema
                .matches(/^\d{4}-\d{2}-\d{2}$/, t('modal.validation.date'))
                .required(t('modal.validation.date'))
            : schema.optional()
        ),
        selectedTimeSlot: Yup.string().when('serviceType', ([st], schema) =>
          st === 'boarding' ? schema.optional() : schema.required(t('modal.validation.slot'))
        ),
        specialInstructions: Yup.string().max(500, t('modal.validation.instructionsMax')),
      }),
    [t]
  );

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      petId: editingAppointment ? 
        (editingAppointment.petId
          ? (typeof editingAppointment.petId === 'string' ? editingAppointment.petId : editingAppointment.petId._id)
          : '') :
        selectedPetId || (pets.length === 1 ? pets[0]._id : ''),
      groomerId: editingAppointment
        ? typeof editingAppointment.groomerId === 'string'
          ? editingAppointment.groomerId
          : editingAppointment.groomerId._id
        : lockGroomerId || '',
      serviceType: editingAppointment?.serviceType || '',
      selectedDate: editingAppointment
        ? editingAppointment.serviceType === 'boarding' && editingAppointment.checkInDate
          ? formatDateYmdInput(editingAppointment.checkInDate)
          : formatDateYmdInput(editingAppointment.startTime)
        : '',
      checkOutDate: editingAppointment
        ? editingAppointment.serviceType === 'boarding'
          ? formatDateYmdInput(
              editingAppointment.checkOutDate ||
                addOneCalendarDayYmd(
                  formatDateYmdInput(editingAppointment.checkInDate || editingAppointment.startTime)
                )
            )
          : ''
        : '',
      selectedTimeSlot:
        editingAppointment?.serviceType === 'boarding' ? '' : editingAppointment?.startTime || '',
      specialInstructions: editingAppointment && typeof editingAppointment.petId === 'object' && editingAppointment.petId !== null ? 
        (editingAppointment.petId.notesForGroomer || editingAppointment.petId.notes || '') : 
        ''
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        
        const appointmentData: CreateAppointmentData = {
          petId: values.petId,
          serviceType: values.serviceType as CreateAppointmentData['serviceType'],
        };

        if (values.groomerId) {
          appointmentData.groomerId = values.groomerId;
        }

        if (values.serviceType === 'boarding') {
          appointmentData.checkInDate = formatDateYmdInput(values.selectedDate);
          appointmentData.checkOutDate = formatDateYmdInput(values.checkOutDate);
        } else {
          appointmentData.startTime = values.selectedTimeSlot;
        }

        // update pet notesForGroomer if special instructions changed
        const currentPet = pets.find(pet => pet._id === values.petId);
        const currentGroomerNote = currentPet?.notesForGroomer || currentPet?.notes || '';
        if (currentPet && values.specialInstructions !== currentGroomerNote) {
          try {
            await petService.updatePet(values.petId, {
              notesForGroomer: values.specialInstructions.trim()
            });
          } catch (error) {
            console.error('Error updating pet notes:', error);
          }
        }

        let updatedAppointment: Appointment;
        
        if (isEditing && editingAppointment) {
          updatedAppointment = await appointmentService.updateAppointment(editingAppointment._id, appointmentData);
        } else {
          updatedAppointment = await appointmentService.createAppointment(appointmentData);
        }
        
        setCurrentStep('confirmation');
        
        // show success toast with email notification
        toast.success(
          isEditing ? t('modal.toastRescheduleOk') : t('modal.toastBookOk'),
          {
            description: t('modal.toastEmailDesc'),
            duration: 10000,
            action: {
              label: t('modal.toastGotIt'),
              onClick: () => {},
            }
          }
        );
        
        // show success for 2 seconds then close
        setTimeout(() => {
          onSuccess(updatedAppointment);
        }, 2000);
      } catch (error: unknown) {
        console.error(`Error ${isEditing ? 'updating' : 'booking'} appointment:`, error);
        const errObj = error as { code?: string; message?: string; error?: string };
        const slotConflict = errObj?.code === 'SLOT_CONFLICT';
        const errorMessage = slotConflict
          ? t('modal.slotConflictFriendly')
          : error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error ||
              (error as { response?: { data?: { error?: string; message?: string } } }).response?.data?.message
            : error instanceof Error
              ? error.message
              : isEditing
                ? t('modal.toastRescheduleFail')
                : t('modal.toastBookFail');

        toast.error(
          slotConflict ? t('modal.slotConflictFriendly') : isEditing ? t('modal.toastRescheduleFail') : t('modal.toastBookFail'),
          {
            description: errorMessage || (isEditing ? t('modal.toastRescheduleFail') : t('modal.toastBookFail')),
            duration: 8000
          }
        );
        
        setCurrentStep('summary');
      } finally {
        setLoading(false);
      }
    }
  });

  // load groomers on component mount (used to compute merged availability for auto-assign flow)
  useEffect(() => {
    if (lockGroomerId) {
      setGroomers([]);
      return;
    }
    const loadGroomers = async () => {
      try {
        const groomersData = await groomerService.getAllGroomers();
        setGroomers(groomersData);
      } catch (error) {
        console.error('Error loading groomers:', error);
      }
    };

    loadGroomers();
  }, [lockGroomerId]);

  // load available time slots when date and service type are selected.
  // - If rescheduling / locked groomer: use that groomer only.
  // - If creating: merge availability across all groomers (show slots where at least one groomer is free).
  useEffect(() => {
    const loadTimeSlots = async () => {
      if (formik.values.serviceType === 'boarding') {
        setAvailableSlots([]);
        setLoadingSlots(false);
        return;
      }
      if (formik.values.selectedDate && formik.values.serviceType) {
        try {
          setLoadingSlots(true);
          const pet = pets.find((p) => p._id === formik.values.petId);
          const duration =
            groomingMinutesForSize(pet?.size) ??
            (formik.values.serviceType === 'basic' ? 60 : 120);

          // Reschedule / locked: keep existing groomer availability.
          if ((isEditing || lockGroomerId) && formik.values.groomerId) {
            const slots = await groomerService.getGroomerAvailability(
              formik.values.groomerId,
              formik.values.selectedDate,
              duration
            );
            setAvailableSlots(slots);
            return;
          }

          // Create: merged availability across all groomers.
          if (groomers.length === 0) {
            setAvailableSlots([]);
            return;
          }

          const allSlots = await Promise.all(
            groomers.map((g) =>
              groomerService.getGroomerAvailability(g._id, formik.values.selectedDate, duration).catch(() => [])
            )
          );

          const byStart = new Map<string, TimeSlot>();
          for (const slots of allSlots) {
            for (const slot of slots) {
              const key = slot.start.toISOString();
              if (!byStart.has(key)) byStart.set(key, slot);
            }
          }
          const merged = Array.from(byStart.values()).sort((a, b) => a.start.getTime() - b.start.getTime());
          setAvailableSlots(merged);
        } catch (error) {
          console.error('Error loading time slots:', error);
          setAvailableSlots([]);
        } finally {
          setLoadingSlots(false);
        }
      } else {
        setAvailableSlots([]);
      }
    };

    loadTimeSlots();
  }, [
    formik.values.groomerId,
    formik.values.selectedDate,
    formik.values.serviceType,
    formik.values.petId,
    pets,
    groomers,
    isEditing,
    lockGroomerId,
  ]);

  // preload boarding occupancy for date-range validation / disabled dates
  useEffect(() => {
    const loadBoardingOccupancy = async () => {
      if (formik.values.serviceType !== 'boarding') {
        setBoardingOccupancy({});
        setLoadingBoardingOccupancy(false);
        return;
      }
      try {
        setLoadingBoardingOccupancy(true);
        const groomerForCheck = (isEditing || lockGroomerId) && formik.values.groomerId ? formik.values.groomerId : undefined;
        const rows = await groomerService.getBoardingOccupancy(groomerForCheck, getMinDate(), getMaxDate());
        const map: Record<string, { occupied: number; capacity: number }> = {};
        rows.forEach((r) => {
          map[r.date] = { occupied: r.occupied, capacity: r.capacity };
        });
        setBoardingOccupancy(map);
      } catch (error) {
        console.error('Error loading boarding occupancy:', error);
        setBoardingOccupancy({});
      } finally {
        setLoadingBoardingOccupancy(false);
      }
    };
    void loadBoardingOccupancy();
  }, [formik.values.serviceType, formik.values.groomerId, isEditing, lockGroomerId]);

  // update special instructions
  useEffect(() => {
    if (formik.values.petId && !isEditing) {
      const selectedPet = pets.find(pet => pet._id === formik.values.petId);
      const selectedPetNote = selectedPet?.notesForGroomer || selectedPet?.notes || '';
      if (selectedPet && selectedPetNote !== formik.values.specialInstructions) {
        formik.setFieldValue('specialInstructions', selectedPetNote);
      }
    }
  }, [formik.values.petId, pets, isEditing]);

  useEffect(() => {
    if (formik.values.serviceType !== 'boarding') return;
    const checkIn = formatDateYmdInput(formik.values.selectedDate);
    if (!checkIn) return;
    const checkOut = formatDateYmdInput(formik.values.checkOutDate);
    const minCheckout = addOneCalendarDayYmd(checkIn);
    if (!checkOut || checkOut <= checkIn) {
      formik.setFieldValue('checkOutDate', minCheckout);
      return;
    }
    if (nightsBetween(checkIn, checkOut) > MAX_BOARDING_DAYS) {
      formik.setFieldValue('checkOutDate', addDaysToYmd(checkIn, MAX_BOARDING_DAYS));
    }
  }, [formik.values.serviceType, formik.values.selectedDate, formik.values.checkOutDate]);

  // helper functions
  const getMinDate = () => getLocalYmdToday();

  const getMaxDate = () => getLocalYmdWithMonthOffset(3);

  const formatTimeSlot = (slot: TimeSlot) => {
    const startTime = slot.start.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kuala_Lumpur'
    });
    const endTime = slot.end.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kuala_Lumpur'
    });
    return `${startTime} - ${endTime}`;
  };

  const formatSelectedTimeSlot = () => {
    if (formik.values.serviceType === 'boarding') {
      return t('serviceTypes.boardingDuration');
    }
    if (!formik.values.selectedTimeSlot) return '';

    const selectedSlot = availableSlots.find(
      (slot) => slot.start.toISOString() === formik.values.selectedTimeSlot
    );

    if (selectedSlot) {
      return formatTimeSlot(selectedSlot);
    }

    const date = new Date(formik.values.selectedTimeSlot);
    return date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kuala_Lumpur',
    });
  };

  const getSelectedPet = () => pets.find(pet => pet._id === formik.values.petId);
  const noPhotoText = t('petForm.avatarNoPhoto', { defaultValue: '暂无照片' });
  const getSelectedGroomer = () => {
    if (lockGroomerId && formik.values.groomerId === lockGroomerId) {
      return { _id: lockGroomerId, name: lockGroomerName || '', email: '' } as User;
    }
    return groomers.find((groomer) => groomer._id === formik.values.groomerId);
  };

  const formatDate = (dateInput: string | Date) => {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isFullOccupancyDay = (ymd: string): boolean => {
    const row = boardingOccupancy[ymd];
    if (!row || row.capacity <= 0) return false;
    return row.occupied >= row.capacity;
  };

  const hasAnyFullDayBetween = (checkIn: string, checkOut: string): boolean => {
    if (!checkIn || !checkOut) return false;
    for (let d = checkIn; d < checkOut; d = addDaysToYmd(d, 1)) {
      if (!d) break;
      if (isFullOccupancyDay(d)) return true;
    }
    return false;
  };

  const getServiceDetails = (svc: string) => {
    if (svc === 'boarding') {
      return {
        name: t('serviceTypes.boarding'),
        duration: t('serviceTypes.boardingDuration'),
        description: t('serviceTypes.boardingNoPrice'),
      };
    }
    const st = svc === 'basic' ? 'basic' : 'full';
    const pet = pets.find((p) => p._id === formik.values.petId);
    const mins = groomingMinutesForSize(pet?.size);
    return {
      name: t(`serviceTypes.${st}`),
      duration: mins
        ? t('modal.durationMinutes', { n: mins })
        : t(`serviceTypes.${st === 'basic' ? 'basicDuration' : 'fullDuration'}`),
      description: t(st === 'basic' ? 'modal.serviceDescriptionBasic' : 'modal.serviceDescriptionFull'),
    };
  };

  const handleProceedToSummary = async () => {
    const errs = await formik.validateForm();
    if (Object.keys(errs).length > 0) {
      formik.setTouched({
        petId: true,
        serviceType: true,
        selectedDate: true,
        checkOutDate: true,
        selectedTimeSlot: true,
      });
      return;
    }
    const pet = pets.find((p) => p._id === formik.values.petId);
    if (!pet?.size) {
      toast.error(t('modal.validation.petSize'));
      return;
    }
    if (formik.values.serviceType !== 'boarding' && !formik.values.selectedTimeSlot) {
      toast.error(t('modal.validation.slot'));
      return;
    }
    if (formik.values.serviceType === 'boarding') {
      const checkIn = formatDateYmdInput(formik.values.selectedDate);
      const checkOut = formatDateYmdInput(formik.values.checkOutDate);
      const nights = nightsBetween(checkIn, checkOut);
      if (!checkIn || !checkOut || nights <= 0) {
        toast.error(t('modal.validation.boardingRange'));
        return;
      }
      if (nights > MAX_BOARDING_DAYS) {
        toast.error(t('modal.validation.boardingMax', { max: MAX_BOARDING_DAYS }));
        return;
      }
      if (hasAnyFullDayBetween(checkIn, checkOut)) {
        toast.error(t('modal.validation.boardingFullRange'));
        return;
      }
    }
    setCurrentStep('summary');
  };

  const handleBackToSelection = () => {
    setCurrentStep('selection');
  };

  const serviceTypes = useMemo(
    () => [
      {
        type: 'basic' as const,
        name: t('serviceTypes.basic'),
        duration: t('serviceTypes.groomingBySize'),
        description: t('modal.serviceDescriptionBasic'),
      },
      {
        type: 'full' as const,
        name: t('serviceTypes.full'),
        duration: t('serviceTypes.groomingBySize'),
        description: t('modal.serviceDescriptionFull'),
      },
      {
        type: 'boarding' as const,
        name: t('serviceTypes.boarding'),
        duration: t('serviceTypes.boardingDuration'),
        description: t('serviceTypes.boardingNoPrice'),
      },
    ],
    [t]
  );

  const selectedDateStr = formatDateYmdInput(formik.values.selectedDate);
  const checkoutYmd = formatDateYmdInput(formik.values.checkOutDate);
  const boardingNights = formik.values.serviceType === 'boarding' ? nightsBetween(selectedDateStr, checkoutYmd) : 0;
  const fullBoardingDays = useMemo(
    () =>
      Object.entries(boardingOccupancy)
        .filter(([, v]) => v.capacity > 0 && v.occupied >= v.capacity)
        .map(([k]) => k),
    [boardingOccupancy]
  );

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
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl rounded-3xl border border-amber-200 bg-gradient-to-b from-[#FFFDF7] via-[#FFFCF2] to-[#FAF6EB] shadow-[0_22px_55px_rgba(120,80,20,0.16)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-200/80 bg-gradient-to-r from-amber-100/55 to-yellow-100/45 p-6">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-[#3F2A1E]">
                  {currentStep === 'selection' && (isEditing ? t('modal.titleReschedule') : t('modal.titleBook'))}
                  {currentStep === 'summary' && (isEditing ? t('modal.summaryReschedule') : t('modal.summaryBook'))}
                  {currentStep === 'confirmation' && (isEditing ? t('modal.confirmReschedule') : t('modal.confirmBook'))}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
                disabled={loading}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="border-b border-amber-200/70 bg-gradient-to-r from-[#FFF9E8] to-[#FAF6EB] px-6 py-4">
              <div className="flex items-center justify-center space-x-4">
                <div className={`flex items-center ${currentStep === 'selection' ? 'text-amber-700' : 'text-green-600'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === 'selection' ? 'bg-amber-100' : 'bg-green-100'
                  }`}>
                    {currentStep === 'selection' ? '1' : '✓'}
                  </div>
                  <span className="ml-2 text-sm font-medium">{t('modal.stepDetails')}</span>
                </div>
                
                <div className={`w-8 h-1 rounded-full ${
                  currentStep === 'selection' ? 'bg-amber-200/70' : 'bg-green-300'
                }`} />
                
                <div className={`flex items-center ${
                  currentStep === 'selection' ? 'text-amber-700/60' : 
                  currentStep === 'summary' ? 'text-amber-700' : 'text-green-600'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === 'selection' ? 'bg-amber-100/80' :
                    currentStep === 'summary' ? 'bg-amber-100' : 'bg-green-100'
                  }`}>
                    {currentStep === 'confirmation' ? '✓' : '2'}
                  </div>
                  <span className="ml-2 text-sm font-medium">{t('modal.stepReview')}</span>
                </div>
                
                <div className={`w-8 h-1 rounded-full ${
                  currentStep === 'confirmation' ? 'bg-green-300' : 'bg-amber-200/70'
                }`} />
                
                <div className={`flex items-center ${
                  currentStep === 'confirmation' ? 'text-green-600' : 'text-amber-700/60'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === 'confirmation' ? 'bg-green-100' : 'bg-amber-100/80'
                  }`}>
                    {currentStep === 'confirmation' ? '✓' : '3'}
                  </div>
                  <span className="ml-2 text-sm font-medium">{t('modal.stepConfirm')}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Selection step */}
              {currentStep === 'selection' && (
                <form className="space-y-6">
                  {/* Pet Selection */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#3F2A1E]">
                      {t('modal.selectPet')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="petId"
                      value={formik.values.petId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full rounded-2xl border border-amber-200 bg-white/90 px-3 py-2 text-[#3F2A1E] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      <option value="">{t('modal.choosePet')}</option>
                      {pets.map((pet) => (
                        <option key={pet._id} value={pet._id}>
                          {pet.name} ({pet.species} - {pet.breed})
                        </option>
                      ))}
                    </select>
                    {formik.touched.petId && formik.errors.petId && (
                      <p className="mt-1 text-sm text-red-600">{formik.errors.petId}</p>
                    )}

                    {getSelectedPet() && (
                      <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                        {getSelectedPet()!.imageUrl ? (
                          <img
                            src={getSelectedPet()!.imageUrl}
                            alt={getSelectedPet()!.name}
                            className="h-14 w-14 rounded-xl border border-amber-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-200 bg-white text-xs text-amber-800">
                            {noPhotoText}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-amber-950">{getSelectedPet()!.name}</p>
                          <p className="truncate text-xs text-amber-900/80 capitalize">
                            {getSelectedPet()!.species} · {getSelectedPet()!.breed}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Service type selection */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-[#3F2A1E]">
                      {t('modal.serviceType')} <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {serviceTypes.map((service) => (
                        <motion.div
                          key={service.type}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            formik.setFieldValue('serviceType', service.type);
                            if (service.type === 'boarding') {
                              formik.setFieldValue('selectedTimeSlot', '');
                              formik.setFieldError('selectedTimeSlot', undefined);
                              const checkIn = formatDateYmdInput(formik.values.selectedDate) || getLocalYmdToday();
                              formik.setFieldValue('selectedDate', checkIn);
                              formik.setFieldValue('checkOutDate', addOneCalendarDayYmd(checkIn));
                            } else {
                              formik.setFieldValue('checkOutDate', '');
                            }
                          }}
                          className={`cursor-pointer rounded-3xl border-2 bg-white/85 p-4 transition-colors ${
                            formik.values.serviceType === service.type
                              ? 'border-amber-500 bg-gradient-to-br from-amber-100/80 to-yellow-100/60 shadow-[0_8px_20px_rgba(245,158,11,0.18)]'
                              : 'border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-[#3F2A1E]">{service.name}</h4>
                            <span className="text-sm text-amber-900/80">{service.duration}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {formik.touched.serviceType && formik.errors.serviceType && (
                      <p className="mt-1 text-sm text-red-600">{formik.errors.serviceType}</p>
                    )}
                  </div>

                  {/* Groomer selection — hidden when groomer is fixed (staff reschedule) */}
                  {lockGroomerId && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#3F2A1E]">
                        {t('table.groomer')}
                      </label>
                      <p className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
                        {lockGroomerName || t('appointmentDialog.na')}
                      </p>
                    </div>
                  )}

                  {/* Date selection */}
                  {formik.values.serviceType === 'boarding' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-[#3F2A1E]">
                            {t('modal.checkInLabel')} <span className="text-red-500">*</span>
                          </label>
                          <DatePicker
                            disableDate={(date) => {
                              const ymd = formatDateYmdInput(date);
                              if (date.getDay() === 3) return true;
                              if (!ymd) return false;
                              return isFullOccupancyDay(ymd);
                            }}
                            value={formik.values.selectedDate}
                            onChange={(value) => {
                              formik.setFieldValue('selectedDate', value);
                              const defaultCheckout = addOneCalendarDayYmd(value);
                              const currentCheckout = formatDateYmdInput(formik.values.checkOutDate);
                              const maxCheckout = addDaysToYmd(value, MAX_BOARDING_DAYS);
                              if (
                                !currentCheckout ||
                                currentCheckout <= value ||
                                currentCheckout > maxCheckout ||
                                hasAnyFullDayBetween(value, currentCheckout)
                              ) {
                                formik.setFieldValue('checkOutDate', defaultCheckout);
                              }
                            }}
                            onBlur={() => formik.setFieldTouched('selectedDate', true)}
                            placeholder={t('modal.datePlaceholder')}
                            minDate={getMinDate()}
                            maxDate={getMaxDate()}
                            error={!!(formik.touched.selectedDate && formik.errors.selectedDate)}
                          />
                          {formik.touched.selectedDate && formik.errors.selectedDate && (
                            <p className="mt-1 text-sm text-red-600">{formik.errors.selectedDate}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-[#3F2A1E]">
                            {t('modal.checkOutLabel')} <span className="text-red-500">*</span>
                          </label>
                          <DatePicker
                            disableDate={(date) => {
                              const checkIn = formatDateYmdInput(formik.values.selectedDate);
                              const ymd = formatDateYmdInput(date);
                              if (!checkIn || !ymd) return true;
                              if (ymd <= checkIn) return true;
                              if (nightsBetween(checkIn, ymd) > MAX_BOARDING_DAYS) return true;
                              if (hasAnyFullDayBetween(checkIn, ymd)) return true;
                              return false;
                            }}
                            value={formik.values.checkOutDate}
                            onChange={(value) => formik.setFieldValue('checkOutDate', value)}
                            onBlur={() => formik.setFieldTouched('checkOutDate', true)}
                            placeholder={t('modal.datePlaceholder')}
                            minDate={addOneCalendarDayYmd(formatDateYmdInput(formik.values.selectedDate || getMinDate()))}
                            maxDate={addDaysToYmd(
                              formatDateYmdInput(formik.values.selectedDate || getMinDate()),
                              MAX_BOARDING_DAYS
                            )}
                            error={!!(formik.touched.checkOutDate && formik.errors.checkOutDate)}
                          />
                          {formik.touched.checkOutDate && formik.errors.checkOutDate && (
                            <p className="mt-1 text-sm text-red-600">{formik.errors.checkOutDate as string}</p>
                          )}
                        </div>
                      </div>
                      {selectedDateStr && checkoutYmd && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
                          <p>{t('modal.checkInSummary', { date: selectedDateStr })}</p>
                          <p>{t('modal.checkOutSummary', { date: checkoutYmd })}</p>
                          <p className="font-semibold">{t('modal.nightsSummary', { nights: boardingNights })}</p>
                          <p className="mt-2 text-xs text-amber-900/85">
                            {t('modal.boardingMaxHint', { max: MAX_BOARDING_DAYS })}
                          </p>
                        </div>
                      )}
                      {loadingBoardingOccupancy ? (
                        <p className="text-xs text-amber-900/70">{t('modal.occupancyLoading')}</p>
                      ) : fullBoardingDays.length > 0 ? (
                        <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-700">
                          <p className="font-semibold">{t('modal.fullDaysTitle')}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {fullBoardingDays.slice(0, 10).map((d) => (
                              <span key={d} className="rounded bg-red-100 px-2 py-0.5">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#3F2A1E]">
                        {t('modal.preferredDate')} <span className="text-red-500">*</span>
                      </label>
                      <DatePicker
                        disableDate={date => date.getDay() === 3}
                        value={formik.values.selectedDate}
                        onChange={(value) => formik.setFieldValue('selectedDate', value)}
                        onBlur={() => formik.setFieldTouched('selectedDate', true)}
                        placeholder={t('modal.datePlaceholder')}
                        minDate={getMinDate()}
                        maxDate={getMaxDate()}
                        error={!!(formik.touched.selectedDate && formik.errors.selectedDate)}
                      />
                      {formik.touched.selectedDate && formik.errors.selectedDate && (
                        <p className="mt-1 text-sm text-red-600">{formik.errors.selectedDate}</p>
                      )}
                    </div>
                  )}

                  {/* Time slot selection */}
                  {formik.values.selectedDate &&
                    formik.values.serviceType &&
                    formik.values.serviceType !== 'boarding' && (
                    <div>
                      <label className="mb-3 block text-sm font-medium text-[#3F2A1E]">
                        {t('modal.timeSlots')} <span className="text-red-500">*</span>
                      </label>
                      
                      {loadingSlots ? (
                        <div className="flex justify-center py-8">
                          <LoadingSpinner />
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <p className="py-4 text-center text-amber-900/75">
                          {t('modal.noSlots')}
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                          {availableSlots.map((slot, index) => {
                            const slotValue = slot.start.toISOString();
                            return (
                              <motion.button
                                key={index}
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => formik.setFieldValue('selectedTimeSlot', slotValue)}
                                className={`rounded-2xl border p-3 text-sm transition-colors ${
                                  formik.values.selectedTimeSlot === slotValue
                                    ? 'border-amber-500 bg-amber-50 text-amber-900'
                                    : 'border-amber-200 bg-white/90 text-[#3F2A1E] hover:border-amber-300'
                                }`}
                              >
                                {formatTimeSlot(slot)}
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                      
                      {formik.touched.selectedTimeSlot && formik.errors.selectedTimeSlot && (
                        <p className="mt-1 text-sm text-red-600">{formik.errors.selectedTimeSlot}</p>
                      )}
                    </div>
                  )}

                  {/* Form actions */}
                  <div className="flex justify-end space-x-3 border-t border-amber-200/70 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                    >
                      {t('timeBlock.cancel')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleProceedToSummary()}
                      disabled={
                        !formik.values.petId ||
                        !formik.values.serviceType ||
                        !formik.values.selectedDate ||
                        (formik.values.serviceType === 'boarding' && !formik.values.checkOutDate) ||
                        (formik.values.serviceType !== 'boarding' && !formik.values.selectedTimeSlot)
                      }
                      className="min-w-[120px] bg-amber-500 text-white hover:bg-amber-600"
                    >
                      {t('modal.continueSummary')}
                    </Button>
                  </div>
                </form>
              )}

              {/* Summary step */}
              {currentStep === 'summary' && (
                <div className="space-y-6">
                  {/* Booking details summary */}
                  <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-[#FFF9EC] to-[#FAF6EB] p-6 shadow-[0_12px_30px_rgba(120,80,20,0.1)]">
                    <h4 className="mb-4 text-lg font-semibold text-[#3F2A1E]">{t('modal.bookingDetails')}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-amber-900/80">{t('table.pet')}</p>
                          <p className="text-[#3F2A1E]">{getSelectedPet()?.name} ({getSelectedPet()?.species} - {getSelectedPet()?.breed})</p>
                          {getSelectedPet()?.size ? (
                            <p className="text-sm text-amber-950/80">
                              {t('petSize.label')}: {t(`petSize.${getSelectedPet()!.size}`)}
                            </p>
                          ) : null}
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-amber-900/80">{t('table.service')}</p>
                          <p className="text-[#3F2A1E]">{getServiceDetails(formik.values.serviceType)?.name}</p>
                          <p className="text-sm text-amber-950/80">{getServiceDetails(formik.values.serviceType)?.duration}</p>
                        </div>
                        
                        {(isEditing || lockGroomerId) && (
                          <div>
                            <p className="text-sm font-medium text-amber-900/80">{t('table.groomer')}</p>
                            <p className="text-[#3F2A1E]">{getSelectedGroomer()?.name}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-amber-900/80">{t('petDetail.date')}</p>
                          {formik.values.serviceType === 'boarding' && checkoutYmd ? (
                            <>
                              <p className="text-[#3F2A1E]">
                                {t('modal.checkInLabel')}: {selectedDateStr}
                              </p>
                              <p className="text-[#3F2A1E]">
                                {t('modal.checkOutLabel')}: {checkoutYmd}
                              </p>
                              <p className="text-[#3F2A1E]">{t('modal.nightsSummary', { nights: boardingNights })}</p>
                            </>
                          ) : (
                            <p className="text-[#3F2A1E]">{formatDate(formik.values.selectedDate as string | Date)}</p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-medium text-amber-900/80">{t('petDetail.time')}</p>
                          <p className="text-[#3F2A1E]">{formatSelectedTimeSlot()}</p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-amber-900/80">{t('petDetail.duration')}</p>
                          <p className="text-[#3F2A1E]">{getServiceDetails(formik.values.serviceType)?.duration}</p>
                        </div>
                      </div>
                    </div>

                    {/* Pet special instructions */}
                    <div className="mt-6 border-t border-amber-200/70 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-amber-900/80">{t('modal.specialInstructions')}</p>
                        {!editingInstructions && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingInstructions(true);
                              setEditedInstructions(formik.values.specialInstructions);
                            }}
                            className="text-sm text-amber-700 hover:text-amber-900 underline"
                          >
                            {t('modal.edit')}
                          </button>
                        )}
                      </div>
                      {editingInstructions ? (
                        <div>
                          <textarea
                            value={editedInstructions}
                            onChange={e => setEditedInstructions(e.target.value)}
                            placeholder={t('modal.instructionsPlaceholder')}
                            className="w-full resize-none rounded-2xl border border-amber-200 bg-white/95 px-3 py-2 text-[#3F2A1E] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                            rows={3}
                            maxLength={500}
                            disabled={saveInstructionsLoading}
                          />
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-amber-900/75">
                              {t('modal.instructionsHint')}
                            </p>
                            <span className="text-xs text-amber-800/60">
                              {editedInstructions.length}/500
                            </span>
                          </div>
                          <div className="flex space-x-2 mt-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={async () => {
                                setSaveInstructionsLoading(true);
                                try {
                                  const petId = formik.values.petId;
                                  await petService.updatePet(petId, {
                                    notesForGroomer: editedInstructions.trim(),
                                  });
                                  formik.setFieldValue('specialInstructions', editedInstructions.trim());
                                  setEditingInstructions(false);
                                } catch {
                                  toast.error(t('modal.saveInstructionsFailed'));
                                } finally {
                                  setSaveInstructionsLoading(false);
                                }
                              }}
                              disabled={saveInstructionsLoading}
                            >
                              {tc('actions.save')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingInstructions(false);
                                setEditedInstructions(formik.values.specialInstructions);
                              }}
                              disabled={saveInstructionsLoading}
                            >
                              {tc('actions.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        formik.values.specialInstructions ? (
                          <div className="rounded-2xl border border-amber-200 bg-white/95 p-3">
                            <p className="whitespace-pre-wrap text-[#3F2A1E]">{formik.values.specialInstructions}</p>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-3">
                            <p className="italic text-amber-900/75">{t('modal.noInstructions')}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingInstructions(true);
                                setEditedInstructions('');
                              }}
                              className="mt-1 text-sm text-amber-700 underline hover:text-amber-900"
                            >
                              {t('modal.addInstructions')}
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Important policy warning */}
                  <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-100/65 to-yellow-100/60 p-4 shadow-[0_10px_20px_rgba(217,119,6,0.12)]">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 flex-shrink-0" />
                      <div className="ml-3">
                        <h4 className="text-sm font-semibold text-amber-800">{t('modal.policyTitle')}</h4>
                        <div className="mt-2 text-sm text-amber-700">
                          <ul className="list-disc pl-5 space-y-1">
                            <li>{t('modal.policyCancel')}</li>
                            <li>{t('modal.policyLate')}</li>
                            <li>{t('modal.policyHealth')}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2 border-t border-amber-200/70 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToSelection}
                      disabled={loading}
                      className="flex-1 min-w-0"
                    >
                      <ArrowLeftIcon className="h-4 w-4 mr-2" />
                      {t('modal.backEdit')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      disabled={loading}
                      className="flex-1 min-w-0 bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                    >
                      {loading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <CalendarDaysIcon className="h-4 w-4 mr-2" />
                          {isEditing ? t('modal.confirmRescheduleBtn') : t('modal.confirmBooking')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Confirmation step */}
              {currentStep === 'confirmation' && (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  </motion.div>
                  
                  <h3 className="mb-2 text-xl font-semibold text-[#3F2A1E]">
                    {isEditing ? t('modal.successRescheduleTitle') : t('modal.successBookTitle')}
                  </h3>
                  
                  <p className="mb-4 text-amber-900/80">
                    {t('modal.successBody', {
                      pet: getSelectedPet()?.name ?? '',
                      action: isEditing ? t('modal.successActionReschedule') : t('modal.successActionBook'),
                    })}
                  </p>
                  
                  <div className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50/90 p-4">
                    <p className="text-sm text-amber-950">
                      {formik.values.serviceType === 'boarding' && checkoutYmd ? (
                        <>
                          <strong>
                            {t('modal.checkInLabel')}: {selectedDateStr}
                          </strong>
                          <br />
                          <strong>
                            {t('modal.checkOutLabel')}: {checkoutYmd}
                          </strong>
                          <br />
                          <strong>{t('modal.nightsSummary', { nights: boardingNights })}</strong>
                          <br />
                        </>
                      ) : (
                        <>
                          <strong>{formatDate(formik.values.selectedDate as string | Date)}</strong>
                          <br />
                        </>
                      )}
                      {formatSelectedTimeSlot()}
                      <br />
                      {getServiceDetails(formik.values.serviceType)?.name}
                      {isEditing || lockGroomerId ? ` · ${getSelectedGroomer()?.name}` : ''}
                    </p>
                  </div>
                  
                  <p className="mt-4 text-sm text-amber-900/70">
                    {t('modal.redirectHint')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <BookingTermsAgreementDialog
        open={termsOpen}
        onOpenChange={setTermsOpen}
        onAgree={() => {
          void formik.submitForm();
        }}
      />
    </AnimatePresence>
  );
};

export default AppointmentBookingModal;
