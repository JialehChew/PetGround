import React, { useState, useEffect } from "react";
import { Paper, Typography, Box, Button, Alert } from "@mui/material";
import { formatDateForInput, formatDateWithDay } from "../utils/dateUtils";
import appointmentService from "../services/appointmentService";
import petService from "../services/petService";
import ScheduledAppointments from "../components/ScheduledAppointments";
import AppointmentPetDetails from "../components/AppointmentPetDetails";
import { isSameDay } from "date-fns";

// groomer schedule page
// manages overall state (appts, selected date, pet details)
// fetches appt data
// handles date navigation
// coordinate communication between child components

const GroomerSchedulePage = () => {
  const [appointments, setAppointments] = useState([]); // stores filtered list of appts for selected date
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date())); // tracks currently selected date for filtering
  const [petDetailsOpen, setPetDetailsOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null); // store details of the selected pet
  const [petLoading, setPetLoading] = useState(false);
  const [petError, setPetError] = useState(null);
  
  // maps appt statuses to color codes for ui display
  const statusColors = {
    confirmed: "warning",
    completed: "success"
  };
  
  // fetch appts when component mounts or date changes
  useEffect(() => {
    // define fetchAppointments directly inside the useEffect
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const data = await appointmentService.getUserAppointments();
        
        // simplified date comparison using isSameDay from date-fns
        // filter to only show appts by selected date
        const dateAppointments = data.filter(appointment =>
          isSameDay(new Date(appointment.startTime), new Date(selectedDate))
        );
        // sorts filtered appts by asc order
        dateAppointments.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        // updates the appointments state with date appt
        setAppointments(dateAppointments); // set state to filtered appts for passing to child components
        setError(null);
      } catch (err) {
        setError(err.error || "Failed to load appointments"); 
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [selectedDate]); // selectedDate serves as dependency for use hook, triggering re-fetch when date changes
  
  // navigate to prev/next day, update selected date state
  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(formatDateForInput(date));
  };
  
  // handles appt card click to view pet details
  const handleAppointmentClick = async (appointment) => {
    try {
      setPetLoading(true);
      setPetError(null);
      // get petId from appt
      const petId = appointment.petId._id || appointment.petId;
      // fetch pet details by petId
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
    } catch (err) {
      setPetError(err.error || "Failed to load pet details");
    } finally {
      setPetLoading(false);
    }
  };
  
  // Close pet details modal
  const handleClosePetDetails = () => {
    setPetDetailsOpen(false);
    setSelectedPet(null);
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Daily Schedule
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          View your grooming appointments for the day
        </Typography>
      </Box>
      
      {/* Date Navigation */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
        <Button variant="outlined" onClick={() => changeDate(-1)}>
          Prev
        </Button>
        
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ padding: "8px", borderRadius: "4px", border: "1px solid" }}
        />
        
        <Button variant="outlined" onClick={() => changeDate(1)}>
          Next
        </Button>
      </Box>
      
      {/* Display selected date */}
      <Typography variant="h5" sx={{ mb: 3 }}>
        {formatDateWithDay(selectedDate)}
      </Typography>
      
      {/* Scheduled daily appts */}
      <ScheduledAppointments 
        appointments={appointments}
        loading={loading}
        error={error}
        onAppointmentClick={handleAppointmentClick}
        statusColors={statusColors}
      />
      
      {/* Pet details  */}
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

export default GroomerSchedulePage;
