import { useMemo, forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DatesSetArg, DateSelectArg } from '@fullcalendar/core';
import { type GroomerSchedule, type TimeBlock } from '../../services/groomerService';
import type { Appointment } from '../../types';
import AppointmentDetailsDialog from './AppointmentDetailsDialog';
import TimeBlockCreationDialog from './TimeBlockCreationDialog';
import TimeBlockDetailsDialog from './TimeBlockDetailsDialog';
import './GroomerCalendar.css';

// FullCalendar event interface
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  className?: string; // add className for CSS styling
  extendedProps: {
    type: 'appointment' | 'timeblock';
    status?: string;
    blockType?: string;
    data: Appointment | TimeBlock;
    deletable?: boolean;
    visualStatus?: string;
  };
}

interface GroomerCalendarProps {
  schedule: GroomerSchedule | null;
  loading: boolean;
  onDatesSet: (start: Date, end: Date) => void;
  onScheduleUpdate: () => void;
  onStaffReschedule?: (appointment: Appointment) => void;
}

const GroomerCalendar = forwardRef<FullCalendar, GroomerCalendarProps>(({
  schedule,
  loading,
  onDatesSet,
  onScheduleUpdate,
  onStaffReschedule,
}, ref) => {
  const { t } = useTranslation('booking');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTimeBlockDialogOpen, setIsTimeBlockDialogOpen] = useState(false);
  const [isTimeBlockDetailsDialogOpen, setIsTimeBlockDetailsDialogOpen] = useState(false);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<TimeBlock | null>(null);
  const [selectedDateInfo, setSelectedDateInfo] = useState<{
    date: Date | null;
    startTime: Date | null;
    endTime: Date | null;
  }>({
    date: null,
    startTime: null,
    endTime: null
  });

  // transform data into FullCalendar events
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    if (!schedule) return [];
    
    const events: CalendarEvent[] = [];
    
    // helper function to get visual status based on time (for display only)
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
      
      // auto-complete if past end time (but don't change actual status)
      if (now > end && appointment.status === 'confirmed') {
        return 'completed';
      }
      
      return appointment.status; // use actual status as fallback
    };

    // add appointments
    schedule.appointments.forEach(appointment => {
      const petName =
        typeof appointment.petId === 'object' && appointment.petId !== null
          ? appointment.petId.name
          : t('unknownPet');
      const formattedPetName = petName.charAt(0).toUpperCase() + petName.slice(1);
      const serviceTypeDisplay = t(`serviceTypes.${appointment.serviceType}`);
      const bookingRef = appointment._id.slice(-8).toUpperCase();
      const title = t('calendar.appointmentTitle', {
        petName: formattedPetName,
        service: serviceTypeDisplay,
        ref: bookingRef,
      });
      
      // get visual status for color determination
      const visualStatus = getVisualStatus(appointment);
      
      // set colors and CSS class based on visual status
      let backgroundColor = '#3b82f6'; // blue for confirmed
      let borderColor = '#2563eb';
      let cssClass = 'appointment-confirmed';
      
      if (visualStatus === 'completed') {
        backgroundColor = '#10b981'; // green for completed
        borderColor = '#059669';
        cssClass = 'appointment-completed';
      } else if (visualStatus === 'in_progress') {
        backgroundColor = '#f59e0b'; // amber for in progress
        borderColor = '#d97706';
        cssClass = 'appointment-in-progress';
      } else if (visualStatus === 'cancelled') {
        backgroundColor = '#6b7280'; // gray for cancelled
        borderColor = '#4b5563';
        cssClass = 'appointment-cancelled';
      } else if (visualStatus === 'no_show') {
        backgroundColor = '#660000'; // red for no show
        borderColor = '#990000';
        cssClass = 'appointment-no-show';
      }
      
      events.push({
        id: appointment._id,
        title,
        start: appointment.startTime,
        end: appointment.endTime,
        backgroundColor,
        borderColor,
        textColor: '#ffffff',
        className: cssClass, // add CSS class for styling
        extendedProps: {
          type: 'appointment',
          status: appointment.status, // keep actual status for business logic
          visualStatus, // add visual status for reference
          data: appointment,
          deletable: false
        }
      });
    });
    
    // add time blocks
    schedule.timeBlocks.forEach(timeBlock => {
      const typeLabel = t(`blockTypes.${timeBlock.blockType}.label`);
      const title = timeBlock.reason ? `${typeLabel} - ${timeBlock.reason}` : typeLabel;
      
      events.push({
        id: timeBlock._id,
        title,
        start: timeBlock.startTime,
        end: timeBlock.endTime,
        backgroundColor: '#ef4444', // red for time blocks
        borderColor: '#dc2626',
        textColor: '#ffffff',
        className: 'time-block', // add CSS class
        extendedProps: {
          type: 'timeblock',
          blockType: timeBlock.blockType,
          data: timeBlock,
          deletable: true
        }
      });
    });
    
    return events;
  }, [schedule, t]);

  // handle date range changes (when user navigates calendar)
  const handleDatesSet = (arg: DatesSetArg) => {
    onDatesSet(arg.start, arg.end);
  };

  // handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    const { extendedProps } = clickInfo.event;
    
    if (extendedProps.type === 'timeblock' && extendedProps.deletable) {
      const timeBlock = extendedProps.data as TimeBlock;
      setSelectedTimeBlock(timeBlock);
      setIsTimeBlockDetailsDialogOpen(true);
    } else if (extendedProps.type === 'appointment') {
      const appointment = extendedProps.data as Appointment;
      setSelectedAppointment(appointment);
      setIsDialogOpen(true);
    }
  };

  // handle date selection (for time block creation)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDateInfo({
      date: selectInfo.start,
      startTime: selectInfo.start,
      endTime: selectInfo.end
    });
    setIsTimeBlockDialogOpen(true);
  };

  const handleCloseTimeBlockDialog = () => {
    setIsTimeBlockDialogOpen(false);
    setSelectedDateInfo({
      date: null,
      startTime: null,
      endTime: null
    });
  };

  const handleCloseTimeBlockDetailsDialog = () => {
    setIsTimeBlockDetailsDialogOpen(false);
    setSelectedTimeBlock(null);
  };

  const handleTimeBlockSuccess = () => {
    onScheduleUpdate();
  };

  // handle appointment updates from dialog - triggers schedule refresh and closes dialog
  const handleAppointmentDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedAppointment(null);
    onScheduleUpdate();
  };

  return (
    <>
      <div className="fullcalendar-container">
        <FullCalendar
          ref={ref}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={calendarEvents}
          editable={false}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          select={handleDateSelect}
          slotMinTime="09:00:00"
          slotMaxTime="21:00:00"
          height="auto"
          eventTextColor="#ffffff"
          eventDisplay="block"
          displayEventTime={true}
          allDaySlot={false}
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          nowIndicator={true}
          businessHours={[
            {
              daysOfWeek: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
              startTime: '11:00',
              endTime: '20:00',
            },
            {
              daysOfWeek: [6, 0], // Sat, Sun
              startTime: '10:00',
              endTime: '19:00',
            }
          ]}
          loading={(isLoading) => loading || isLoading}
        />
      </div>

      {/* Appointment details dialog */}
      {selectedAppointment && (
        <AppointmentDetailsDialog
          isOpen={isDialogOpen}
          onClose={handleAppointmentDialogClose}
          appointment={selectedAppointment}
          staffMode
          onStaffReschedule={onStaffReschedule}
          onStaffCancelled={onScheduleUpdate}
        />
      )}

      {/* Time Block creation dialog */}
      <TimeBlockCreationDialog
        isOpen={isTimeBlockDialogOpen}
        onClose={handleCloseTimeBlockDialog}
        onSuccess={handleTimeBlockSuccess}
        selectedDate={selectedDateInfo.date}
        selectedStartTime={selectedDateInfo.startTime}
        selectedEndTime={selectedDateInfo.endTime}
      />

      {/* Time Block details dialog */}
      <TimeBlockDetailsDialog
        isOpen={isTimeBlockDetailsDialogOpen}
        onClose={handleCloseTimeBlockDetailsDialog}
        onSuccess={handleTimeBlockSuccess}
        timeBlock={selectedTimeBlock}
      />
    </>
  );
});

GroomerCalendar.displayName = 'GroomerCalendar';

export default GroomerCalendar;
