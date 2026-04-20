import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import { 
  CalendarDaysIcon, 
  PlusIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import PageTransition from '../components/layout/PageTransition';
import LoadingSpinner from '../components/ui/loading-spinner';
import GroomerCalendar from '../components/calendar/GroomerCalendar';
import TimeBlockCreationDialog from '../components/calendar/TimeBlockCreationDialog';
import AppointmentBookingModal from '../components/appointments/AppointmentBookingModal';
import GroomerManualBookingModal from '../components/appointments/GroomerManualBookingModal';
import groomerService, { type GroomerSchedule } from '../services/groomerService';
import { toast } from "sonner";
import type { Appointment, User } from '../types';
import { petsForStaffReschedule } from '../utils/staffBooking';

const GroomerCalendarPage = () => {
  const { t } = useTranslation('booking');
  const { t: tAdmin } = useTranslation('admin');
  const { user } = useAuthStore();
  const [schedule, setSchedule] = useState<GroomerSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTimeBlockDialogOpen, setIsTimeBlockDialogOpen] = useState(false);
  const [manualBookOpen, setManualBookOpen] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [allGroomers, setAllGroomers] = useState<User[]>([]);
  const calendarRef = useRef<FullCalendar>(null);

  const bookingTargetGroomer = user?.role === 'admin' ? allGroomers[0] : user;

  // load groomer schedule for date range
  const loadSchedule = useCallback(async (start: Date, end: Date) => {
    if (!user?._id) return;
    
    try {
      setLoading(true);
      setError(null);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];
      const scheduleTarget = user.role === 'owner' ? user._id : 'all';
      const scheduleData = await groomerService.getGroomerSchedule(scheduleTarget, startDate, endDate);
      setSchedule(scheduleData);
    } catch (err) {
      console.error('Error loading schedule:', err);
      setError(t('calendarPage.loadError'));
      toast.error(t('calendarPage.toastLoadTitle'), {
        description: t('calendarPage.toastLoadDesc')
      });
    } finally {
      setLoading(false);
    }
  }, [user?._id, t]);

  // handle date range changes (when user navigates calendar)
  const handleDatesSet = useCallback((start: Date, end: Date) => {
    loadSchedule(start, end);
  }, [loadSchedule]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    (async () => {
      try {
        const rows = await groomerService.getAllGroomers();
        setAllGroomers(rows);
      } catch (err) {
        console.error('Error loading groomers for admin calendar:', err);
      }
    })();
  }, [user?.role]);

  // handle schedule updates (after time block deletion, etc.)
  const handleScheduleUpdate = useCallback(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      const currentStart = calendarApi.view.activeStart;
      const currentEnd = calendarApi.view.activeEnd;
      loadSchedule(currentStart, currentEnd);
    }
  }, [loadSchedule]);

  const handleOpenTimeBlockDialog = () => {
    setIsTimeBlockDialogOpen(true);
  };

  const handleCloseTimeBlockDialog = () => {
    setIsTimeBlockDialogOpen(false);
  };

  const handleTimeBlockSuccess = () => {
    handleScheduleUpdate();
  };

  // initial load
  useEffect(() => {
    // load initial month view
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    loadSchedule(start, end);
  }, [loadSchedule]);

  if (loading && !schedule) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <CalendarDaysIcon className="h-8 w-8" />
                  {t('calendarPage.title')}
                </h1>
                <p className="mt-2 text-gray-600">
                  {t('calendarPage.subtitle')}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2 sm:gap-4">
                <Button
                  type="button"
                  onClick={() => setManualBookOpen(true)}
                  className="border-amber-300 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 hover:from-amber-500 hover:to-yellow-500"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {tAdmin('groomerDashboard.fabManualBook')}
                </Button>
                <Button onClick={handleOpenTimeBlockDialog}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {t('calendarPage.blockTime')}
                </Button>
              </div>
            </div>
          </motion.div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* FullCalendar */}
          <Card>
            <CardContent className="p-6">
              <GroomerCalendar
                ref={calendarRef}
                schedule={schedule}
                loading={loading}
                onDatesSet={handleDatesSet}
                onScheduleUpdate={handleScheduleUpdate}
                onStaffReschedule={(a) => setRescheduleAppt(a)}
              />
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">{t('calendarPage.legend')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm">{t('calendarPage.legConfirmed')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-500 rounded"></div>
                  <span className="text-sm">{t('calendarPage.legInProgress')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm">{t('calendarPage.legCompleted')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm">{t('calendarPage.legBlocked')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded"></div>
                  <span className="text-sm">{t('calendarPage.legCancelled')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-dashed border-amber-300 bg-amber-50" />
                  <span className="text-sm">{t('calendarPage.legAvailable')}</span>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>• {t('calendarPage.hintBlocks')}</p>
                <p>• {t('calendarPage.hintAppts')}</p>
                <p>• {t('calendarPage.hintViews')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">{t('calendarPage.featuresTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-2">
                <p>{t('calendarPage.featNav')}</p>
                <p>{t('calendarPage.featViews')}</p>
                <p>{t('calendarPage.featCreate')}</p>
                <p>{t('calendarPage.featDelete')}</p>
                <p>{t('calendarPage.featAppts')}</p>
                <p>{t('calendarPage.featHours')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Time Block Creation Dialog */}
          <TimeBlockCreationDialog
            isOpen={isTimeBlockDialogOpen}
            onClose={handleCloseTimeBlockDialog}
            onSuccess={handleTimeBlockSuccess}
          />

          {bookingTargetGroomer?._id && (
            <GroomerManualBookingModal
              open={manualBookOpen}
              groomerId={bookingTargetGroomer._id}
              groomerName={bookingTargetGroomer.name}
              onClose={() => setManualBookOpen(false)}
              onSuccess={() => {
                setManualBookOpen(false);
                handleScheduleUpdate();
              }}
            />
          )}

          {rescheduleAppt && petsForStaffReschedule(rescheduleAppt).length > 0 && user?._id && (
            <AppointmentBookingModal
              pets={petsForStaffReschedule(rescheduleAppt)}
              editingAppointment={rescheduleAppt}
              lockGroomerId={user._id}
              lockGroomerName={user.name}
              onClose={() => setRescheduleAppt(null)}
              onSuccess={() => {
                setRescheduleAppt(null);
                handleScheduleUpdate();
              }}
            />
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default GroomerCalendarPage;
