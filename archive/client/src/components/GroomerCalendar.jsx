import {React, useState} from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import petService from '../services/petService';
import AppointmentPetDetails from './AppointmentPetDetails';
import { Paper, Typography, Box } from '@mui/material';
import './GroomerCalendar.css';

const GroomerCalendar = ({ appointments }) => {
    // state for pet details dialog
    const [petDetailsOpen, setPetDetailsOpen] = useState(false); // control visibility of pet details dialog
    const [selectedPet, setSelectedPet] = useState(null); // stores details of selected pet
    const [petLoading, setPetLoading] = useState(false);
    const [petError, setPetError] = useState(null);

    // transform appointments data into calendar events
    const events = appointments.map(appointment => {
        const color = appointment.serviceType === 'basic' ? 'blue' : 'purple';
        return {
            id: appointment._id,
            title: `${appointment.petId?.name || 'Pet'} - ${appointment.serviceType}`,
            start: appointment.startTime,
            end: appointment.endTime,
            backgroundColor: color,
            borderColor: color,
            extendedProps: { // store original appointment data in extendedProps for later access
                appointment: appointment
            }
        };
    });

    // handle user click on a calendar event
    const handleEventClick = async (clickInfo) => {
        try {
            setPetLoading(true);
            setPetError(null);
            // get appointment details from event extendedProps
            const appointment = clickInfo.event.extendedProps.appointment;
            // get petId from appointment
            const petId = appointment.petId._id || appointment.petId;
            // fetches detailed pet info using petService
            const petDetails = await petService.getPetById(petId);
            
            setSelectedPet({
                ...petDetails,
                ownerName: appointment.ownerId?.name || "Pet Owner",
                appointmentTime: new Date(appointment.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                serviceType: appointment.serviceType
            });
            setPetDetailsOpen(true);
        } catch (error) {
            console.error("Error fetching pet details:", error);
            setPetError(error.message || "Failed to load pet details");
        } finally {
            setPetLoading(false);
        }
    };

    const handleClosePetDetails = () => {
        setPetDetailsOpen(false);
        setSelectedPet(null);
    };
    // render FullCalendar component with configured options
    return (
        <Paper>
            <Box
                sx={{
                    height: { xs: '70vh', sm: 550 },
                    minHeight: 350,
                    maxHeight: '80vh',
                    overflow: 'hidden',
                }}
            >
                <div className="responsive-calendar-wrapper" style={{ height: '100%' }}>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridDay"
                        headerToolbar={{
                            left: 'prev today next',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        events={events}
                        eventClick={handleEventClick}
                        height="100%"
                        slotMinTime={"09:00:00"}
                        slotMaxTime={"18:00:00"}
                        allDaySlot={false}
                        businessHours={{
                            daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
                            startTime: '09:00',
                            endTime: '17:00',
                        }}
                    />
                </div>
            </Box>

            {/* Pet details dialog */}
            <AppointmentPetDetails
                open={petDetailsOpen}
                onClose={handleClosePetDetails}
                pet={selectedPet}
                loading={petLoading}
                error={petError}
            />
        </Paper>
    );  
};

export default GroomerCalendar;
