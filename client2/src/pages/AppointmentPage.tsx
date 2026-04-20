import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  EyeIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import LoadingSpinner from '../components/ui/loading-spinner';
import PageTransition from '../components/layout/PageTransition';
import AppointmentBookingModal from '../components/appointments/AppointmentBookingModal';
import type { Appointment, Pet } from '../types';
import { useAppointmentData, usePetData, useModal } from '../hooks';
import appointmentService from '../services/appointmentService';
import { toast } from "sonner";

const AppointmentPage = () => {
  const { t, i18n } = useTranslation(['booking', 'common']);
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US';
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // Custom hooks for data management
  const {
    appointments,
    loading: appointmentsLoading,
    addAppointment,
    updateAppointment,
    removeAppointment
  } = useAppointmentData();
  
  const {
    pets,
    loading: petsLoading
  } = usePetData(user?.role === 'owner');
  
  const bookingModal = useModal();
  
  const [selectedPetFilter, setSelectedPetFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('upcoming');
  const [bookingType, setBookingType] = useState<'general' | 'specific' | 'reschedule'>('general');
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const loading = appointmentsLoading || petsLoading;

  // get the selected pet object
  const selectedPet = selectedPetFilter !== 'all' 
    ? pets.find(pet => pet._id === selectedPetFilter) 
    : null;

  // filter all appointments by pet first
  const filteredAppointments = appointments.filter(appointment => {
    if (selectedPetFilter === 'all') return true;
    const petId = typeof appointment.petId === 'object' && appointment.petId !== null
      ? appointment.petId._id 
      : appointment.petId;
    return petId === selectedPetFilter;
  });

  // then separate into upcoming and past
  const now = new Date();
  const upcomingAppointments = filteredAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.startTime);
    return appointmentDate >= now && appointment.status === 'confirmed';
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const pastAppointments = filteredAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.startTime);
    return appointmentDate < now || appointment.status === 'completed';
  }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const handleGeneralBooking = () => {
    setBookingType('general');
    setEditingAppointment(null);
    bookingModal.open();
  };

  const handleSpecificPetBooking = () => {
    setBookingType('specific');
    setEditingAppointment(null);
    bookingModal.open();
  };

  const handleReschedule = (appointment: Appointment) => {
    setBookingType('reschedule');
    setEditingAppointment(appointment);
    bookingModal.open();
  };

  const handleCancelClick = (appointment: Appointment) => {
    setCancellingAppointment(appointment);
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancellingAppointment) return;

    try {
      setCancelLoading(true);
      await appointmentService.deleteAppointment(cancellingAppointment._id);
      removeAppointment(cancellingAppointment._id);
      setShowCancelDialog(false);
      setCancellingAppointment(null);
      
      // show success toast
      toast.success(t('toast.cancelledTitle'), {
        description: t('toast.cancelledDesc'),
        duration: 10000,
        action: {
          label: t('toast.cancelledAction'),
          onClick: () => {},
        }
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      const errorMessage = error instanceof Error ? error.message : t('toast.cancelFailedDesc');
      toast.error(t('toast.cancelFailedTitle'), {
        description: errorMessage,
        duration: 8000
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCancelDialogClose = () => {
    setShowCancelDialog(false);
    setCancellingAppointment(null);
  };

  const handleBookingSuccess = (appointment: Appointment) => {
    bookingModal.close();
    if (bookingType === 'reschedule' && editingAppointment) {
      updateAppointment(appointment);
    } else {
      addAppointment(appointment);
    }
    setEditingAppointment(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getPetName = (petId: string | Pet | null) => {
    // handle object case with null check
    if (typeof petId === 'object' && petId !== null) {
      return petId.name || t('unknownPet');
    }
    
    // handle string case
    if (typeof petId === 'string') {
    const pet = pets.find(p => p._id === petId);
    return pet?.name || t('unknownPet');
    }
    
    // add fallback for any other case
    return t('unknownPet');
  };

  const getGroomerName = (groomerId: string | { name?: string; firstName?: string; lastName?: string }) => {
    if (typeof groomerId === 'object' && groomerId !== null) {
      return groomerId.name || 
             (groomerId.firstName && groomerId.lastName ? `${groomerId.firstName} ${groomerId.lastName}` : '') || 
             t('unknownGroomer');
    }
    return t('unknownGroomer');
  };

  // same visual states based on time
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

  const getStatusBadge = (appointment: Appointment) => {
    const visualStatus = getVisualStatus(appointment);
    
    switch (visualStatus) {
      case 'completed':
        return <Badge className="bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] hover:bg-[#E8F5E9]">{t('status.completed')}</Badge>;
      case 'confirmed':
        return <Badge className="bg-[#FFF9E6] text-[#B8860B] border border-[#FFE8A3] hover:bg-[#FFF9E6]">{t('status.upcoming')}</Badge>;
      case 'in_progress':
        return <Badge className="bg-[#FFE8A3]/80 text-[#8B6914] border border-[#F9C74F]/50 hover:bg-[#FFE8A3]/80">{t('status.inProgress')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-600 hover:bg-red-100">{t('status.cancelled')}</Badge>;
      case 'no_show':
        return <Badge className="bg-red-100 text-red-600 hover:bg-red-100">{t('status.noShow')}</Badge>;
      default:
        return <Badge variant="secondary">{t('status.unknown')}</Badge>;
    }
  };

  const getDuration = (serviceType: string) => {
    if (serviceType === 'boarding') return t('serviceTypes.boardingDuration');
    return serviceType === 'basic' ? t('serviceTypes.basicDuration') : t('serviceTypes.fullDuration');
  };

  const serviceLabel = (serviceType: string) => {
    if (serviceType === 'boarding') return t('serviceTypes.boarding');
    return serviceType === 'basic' ? t('serviceTypes.basic') : t('serviceTypes.full');
  };

  const handlePetFilterChange = (value: string) => {
    setSelectedPetFilter(value);
  };

  const getDaysSinceLastAppointment = (petId: string) => {
    const petAppointments = appointments.filter(appointment => {
      const appointmentPetId = typeof appointment.petId === 'object' && appointment.petId !== null
        ? appointment.petId._id 
        : appointment.petId;
      return appointmentPetId === petId && appointment.status === 'completed';
    });

    if (petAppointments.length === 0) return null;

    // get the most recent completed appointment
    const mostRecentAppointment = petAppointments.sort((a, b) => 
      new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
    )[0];

    const lastAppointmentDate = new Date(mostRecentAppointment.endTime);
    const today = new Date();
    const diffTime = today.getTime() - lastAppointmentDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const getEmptyStateDescription = (selectedPet: Pet | null | undefined, isUpcoming: boolean) => {
    if (!selectedPet) {
      if (user?.role === 'groomer') {
        return isUpcoming ? t('empty.groomerNoUpcoming') : t('empty.groomerNoPast');
      }
      return isUpcoming ? t('empty.ownerNoUpcoming') : t('empty.ownerNoPast');
    }

    if (isUpcoming) {
      const daysSinceLastAppointment = getDaysSinceLastAppointment(selectedPet._id);
      if (daysSinceLastAppointment !== null) {
        return (
          <>
            {t('empty.petNoUpcomingLine1', { name: selectedPet.name })}{' '}
            <span className="underline font-semibold text-rose-500">{daysSinceLastAppointment}</span>{' '}
            {t('empty.petNoUpcomingLine2')}
          </>
        );
      }
      return t('empty.petNoUpcoming', { name: selectedPet.name });
    }
    return t('empty.petNoPast', { name: selectedPet.name });
  };

  const AppointmentTableRow = ({ appointment }: { appointment: Appointment }) => {
    const now = new Date();
    const appointmentTime = new Date(appointment.startTime);
    const isUpcoming = appointmentTime > now;
    
    // check if it's less than 24 hours before appointment
    const hoursDifference = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const canModify = hoursDifference > 24;
    
    const handleViewDetails = () => {
      navigate(`/appointments/${appointment._id}`);
    };
    
    return (
      <>
    <TableRow className="hover:bg-[#FFF9E8]/80 transition-colors">
      <TableCell className="font-mono text-sm">
        #{appointment._id.slice(-8).toUpperCase()}
      </TableCell>
      <TableCell className="font-medium">
        {getPetName(appointment.petId)}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {serviceLabel(appointment.serviceType)}
          </span>
          <span className="text-sm text-[#6B5A4A]">
            {getDuration(appointment.serviceType)}
          </span>
        </div>
      </TableCell>
      <TableCell>{getGroomerName(appointment.groomerId)}</TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span>{formatDate(appointment.startTime)}</span>
          <span className="text-sm text-[#6B5A4A]">
            {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {getStatusBadge(appointment)}
      </TableCell>
      {user?.role === 'owner' && (
        <TableCell>
              <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={handleViewDetails}>
              <EyeIcon className="h-4 w-4" />
              {t('actions.view')}
            </Button>
                  {appointment.status === 'confirmed' && isUpcoming && (
                    <>
                      <Button 
                        size="sm" 
                        className={`${
                          canModify 
                            ? 'bg-[#FFCC00] hover:bg-[#FFE566] text-[#3F2A1E] border-2 border-[#F9C74F]/60 shadow-md' 
                            : 'bg-[#EDE8DC] text-[#8A7968] cursor-not-allowed border-2 border-transparent'
                        }`}
                        onClick={canModify ? () => handleReschedule(appointment) : undefined}
                        disabled={!canModify}
                      >
                        {t('actions.reschedule')}
                </Button>
                      <Button 
                        size="sm" 
                        className={`${
                          canModify 
                            ? 'bg-destructive hover:brightness-110 text-white shadow-md border-2 border-red-700/20' 
                            : 'bg-[#EDE8DC] text-[#8A7968] cursor-not-allowed border-2 border-transparent'
                        }`}
                        onClick={canModify ? () => handleCancelClick(appointment) : undefined}
                        disabled={!canModify}
                      >
                        {t('actions.cancel')}
                </Button>
              </>
                  )}
                </div>
                {appointment.status === 'confirmed' && isUpcoming && !canModify && (
                  <p className="text-xs text-amber-600 max-w-xs">
                    {t('modifyWindowHint')}
                  </p>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
      </>
    );
  };

  const EmptyState = ({ 
    message, 
    description, 
    selectedPetName 
  }: { message: string; description: string | React.ReactNode; selectedPetName?: string }) => (
    <div className="text-center py-12">
      <CalendarIcon className="h-16 w-16 mx-auto text-[#F9C74F] mb-4" />
      <h3 className="text-lg font-medium text-[#3F2A1E] mb-2">{message}</h3>
      <p className="text-[#5C4A3A] mb-6">{description}</p>
      {user?.role === 'owner' && (
        <Button onClick={handleSpecificPetBooking}>
          {selectedPetName ? t('bookForPet', { name: selectedPetName }) : t('bookNew')}
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF7]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF7] via-[#FAF6EB]/90 to-[#FFE8A3]/15 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="outline"
              size="sm"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              {t('backToDashboard')}
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-[#3F2A1E] drop-shadow-sm">
                {user?.role === 'groomer' ? t('pageTitleGroomer') : t('pageTitleOwner')}
              </h1>
              <p className="mt-2 text-[#5C4A3A]">
                {user?.role === 'groomer' ? t('pageSubtitleGroomer') : t('pageSubtitleOwner')}
              </p>
            </div>
            {user?.role === 'owner' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button onClick={handleGeneralBooking} className="mt-4 sm:mt-0">
                {t('bookAppointment')}
            </Button>
              </motion.div>
            )}
          </motion.div>

            {/* Filters */}
          {user?.role === 'owner' && pets.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <div className="bg-gradient-to-r from-white to-[#FFFCF5] rounded-3xl border-2 border-[#F9C74F]/30 shadow-lg p-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-bold text-[#3F2A1E]">{t('filterByPet')}</label>
                    <Select value={selectedPetFilter} onValueChange={handlePetFilterChange}>
                    <SelectTrigger className="w-48 border-2 border-[#FFE8A3] bg-white/90 backdrop-blur-sm">
                        <SelectValue placeholder={t('selectPetPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allPets')}</SelectItem>
                        {pets.map((pet) => (
                          <SelectItem key={pet._id} value={pet._id}>
                          {pet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
            </motion.div>
            )}

            {/* Appointments tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-white via-[#FFFCF5] to-[#FFE8A3]/30 rounded-3xl border-2 border-[#F9C74F]/25 shadow-xl hover:shadow-2xl transition-all duration-300"
          >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-[#F9C74F]/25 px-6 pt-6 bg-gradient-to-r from-[#FAF6EB] to-[#FFE8A3]/40 rounded-t-3xl">
                  <TabsList className="grid w-full grid-cols-2 bg-white/90 backdrop-blur-sm border-2 border-[#F9C74F]/20 shadow-inner">
                  <TabsTrigger value="upcoming" className="flex items-center font-semibold">
                    {t('tabs.upcoming')} ({upcomingAppointments.length})
                    </TabsTrigger>
                  <TabsTrigger value="past" className="flex items-center font-semibold">
                    {t('tabs.past')} ({pastAppointments.length})
                    </TabsTrigger>
                  </TabsList>
              </div>

              <TabsContent value="upcoming" className="p-6">
                    {upcomingAppointments.length === 0 ? (
                      <EmptyState
                        message={t('empty.noUpcoming')}
                        description={getEmptyStateDescription(selectedPet, true)}
                        selectedPetName={selectedPet?.name}
                      />
                    ) : (
                  <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('table.bookingId')}</TableHead>
                            <TableHead>{t('table.pet')}</TableHead>
                            <TableHead>{t('table.service')}</TableHead>
                            <TableHead>{t('table.groomer')}</TableHead>
                            <TableHead>{t('table.dateTime')}</TableHead>
                            <TableHead>{t('table.status')}</TableHead>
                            {user?.role === 'owner' && <TableHead>{t('table.actions')}</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upcomingAppointments.map((appointment) => (
                            <AppointmentTableRow key={appointment._id} appointment={appointment} />
                          ))}
                        </TableBody>
                      </Table>
                  </div>
                    )}
                  </TabsContent>

              <TabsContent value="past" className="p-6">
                    {pastAppointments.length === 0 ? (
                      <EmptyState
                        message={t('empty.noPast')}
                        description={getEmptyStateDescription(selectedPet, false)}
                        selectedPetName={selectedPet?.name}
                      />
                    ) : (
                  <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('table.bookingId')}</TableHead>
                            <TableHead>{t('table.pet')}</TableHead>
                            <TableHead>{t('table.service')}</TableHead>
                            <TableHead>{t('table.groomer')}</TableHead>
                            <TableHead>{t('table.dateTime')}</TableHead>
                            <TableHead>{t('table.status')}</TableHead>
                            {user?.role === 'owner' && <TableHead>{t('table.actions')}</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pastAppointments.map((appointment) => (
                            <AppointmentTableRow key={appointment._id} appointment={appointment} />
                          ))}
                        </TableBody>
                      </Table>
                  </div>
                    )}
                  </TabsContent>
                </Tabs>
            </motion.div>
            </div>
          </div>

      {/* Booking modal */}
      {bookingModal.isOpen && user?.role === 'owner' && (
        <AppointmentBookingModal
          pets={pets}
          selectedPetId={bookingType === 'specific' && selectedPetFilter !== 'all' ? selectedPetFilter : undefined}
          editingAppointment={editingAppointment}
          onClose={() => {
            bookingModal.close();
            setEditingAppointment(null);
          }}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Cancel confirmation dialog */}
      {showCancelDialog && cancellingAppointment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleCancelDialogClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl border-2 border-[#F9C74F]/20 max-w-md w-full p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-2xl mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-[#3F2A1E] text-center mb-2">
                {t('cancelDialog.title')}
              </h3>
              <p className="text-[#5C4A3A] text-center mb-6">
                {t('cancelDialog.message', {
                  pet: getPetName(cancellingAppointment.petId),
                  date: formatDate(cancellingAppointment.startTime),
                  time: formatTime(cancellingAppointment.startTime),
                })}
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCancelDialogClose}
                  disabled={cancelLoading}
                  className="flex-1"
                >
                  {t('cancelDialog.keep')}
                </Button>
                <Button
                  onClick={handleCancelConfirm}
                  disabled={cancelLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {cancelLoading ? <LoadingSpinner size="sm" /> : t('cancelDialog.confirmCancel')}
                </Button>
              </div>
                  </div>
                </div>
              </div>
          )}
    </PageTransition>
  );
};

export default AppointmentPage;
