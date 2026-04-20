import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, 
  TextField, Stack, FormHelperText, CircularProgress, Alert, Grid, Typography, Box, Paper } from "@mui/material";
import appointmentService from "../services/appointmentService";
import useInitialData from "../hooks/useInitialData";
import useAvailability from "../hooks/useAvailability";
import { formatDateForInput, filterPastTimeSlots, formatTimeSlot } from "../utils/dateUtils";

const BookingForm = ({ open, onClose, onSuccess, onError, isRescheduling = false, appointmentToReschedule = null }) => {
  // uses useInitialData custom hook for fetching initial data required for the form
  const { pets, groomers, loading: dataLoading, error: dataError } = useInitialData(open);
  
  // form state, date appropriately formatted (YYYY-MM-DD)
  const [formData, setFormData] = useState({
    petId: "",
    groomerId: "",
    serviceType: "basic",
    date: formatDateForInput(new Date()),
    startTime: ""
  });
  
  // uses useAvailability custom hook for fetching available time slots based on: selected groomer, chosen date, and service type
  const { 
    slots, 
    loading: slotsLoading, 
    error: slotsError 
  } = useAvailability(formData.groomerId, formData.date, formData.serviceType);
  
  const [submitting, setSubmitting] = useState(false); // indicates if form submission in progress
  const [error, setError] = useState(null); // captures any error that occurs during submission
  
  // combines loading and error states
  const loading = dataLoading || slotsLoading || submitting; // initial data, time slot availability, or submission
  const formError = error || dataError || slotsError; // submission, initial data, or slot fetching

  // useEffect for initializing form data when form is open or if rescheduling mode is active
  useEffect(() => {
    // prevents race conditions when intializing form data
    // only set form data when both the form is open AND the required data is loaded
    if (open && !dataLoading && pets.length > 0 && groomers.length > 0) {
    if (isRescheduling && appointmentToReschedule) {
      const appointmentDate = new Date(appointmentToReschedule.startTime);
        const petId = appointmentToReschedule.petId._id || appointmentToReschedule.petId;
        const groomerId = appointmentToReschedule.groomerId._id || appointmentToReschedule.groomerId;
        
        // verify that the petId and groomerId exist in our loaded data
        const petExists = pets.some(pet => pet._id === petId);
        const groomerExists = groomers.some(groomer => groomer._id === groomerId);
        
      setFormData({
          petId: petExists ? petId : "",
          groomerId: groomerExists ? groomerId : "",
        serviceType: appointmentToReschedule.serviceType,
          date: formatDateForInput(appointmentDate),
        startTime: ""
      });
      } else {
        // default values for new booking
      setFormData({
          petId: pets.length > 0 ? pets[0]._id : "",
        groomerId: "",
        serviceType: "basic",
        date: formatDateForInput(new Date()),
        startTime: ""
      });
    }
    }
  }, [isRescheduling, appointmentToReschedule, open, dataLoading, pets, groomers]);

  // Handle selection of a time slot
  const handleTimeSlotSelect = (slotTime) => {
    setFormData(prev => ({ ...prev, startTime: slotTime }));
  };

  // changes to input field updates formData state
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // also resets startTime if any of the fields affecting availability are changed
    if (["date", "groomerId", "serviceType"].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value, startTime: "" }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      // constructs appointmentData obj with necessary details
      const appointmentData = {
        petId: formData.petId,
        groomerId: formData.groomerId,
        serviceType: formData.serviceType,
        startTime: formData.startTime
      };
      // based on mode, calls appointmentService methods to reschedule or create appt
      if (isRescheduling && appointmentToReschedule) {
        await appointmentService.updateAppointment(
          appointmentToReschedule._id,
          appointmentData
        );
      } else {
        await appointmentService.createAppointment(appointmentData);
      }
      // triggers onSuccess callback which calls fetchAppointments and resets reschedule data, 
      onSuccess();
    } catch (err) { // sets error msg accordingly
      const errorMessage = err.message || `Failed to ${isRescheduling ? 'reschedule' : 'book'} appointment`;
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter past time slots using the utility function
  const validTimeSlots = filterPastTimeSlots(slots, formData.date);
  
  // Sort time slots chronologically
  const sortedTimeSlots = [...validTimeSlots].sort((a, b) => {
    return new Date(a.start) - new Date(b.start);
  });

  // form is valid if pet, groomer and startTime are selected
  const isFormValid = formData.petId && formData.groomerId && formData.startTime;
  const today = formatDateForInput(new Date()); // date fields restricted to dates not earlier than today via form input props below

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isRescheduling ? "Reschedule Appointment" : "Book an Appointment"}
      </DialogTitle>
      
      <DialogContent>
        {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
        
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Pet selection field */}
          <FormControl fullWidth required>
            <InputLabel>Pet</InputLabel>
            <Select
              name="petId"
              value={formData.petId}
              onChange={handleChange}
              disabled={loading || pets.length === 0}
            >
              {pets.map(pet => (
                <MenuItem key={pet._id} value={pet._id}>
                  {pet.name} ({pet.species})
                </MenuItem>
              ))}
            </Select>
            {pets.length === 0 && (
              <FormHelperText error>You need to add a pet first</FormHelperText>
            )}
          </FormControl>
          
          {/* Groomer selection field */}
          <FormControl fullWidth required>
            <InputLabel>Groomer</InputLabel>
            <Select
              name="groomerId"
              value={formData.groomerId}
              onChange={handleChange}
              disabled={loading}
            >
              {groomers.map(groomer => (
                <MenuItem key={groomer._id} value={groomer._id}>
                  {groomer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Service type selection */}
          <FormControl fullWidth required>
            <InputLabel>Service Type</InputLabel>
            <Select
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              disabled={loading}
            >
              <MenuItem value="basic">Basic Grooming - 60 min</MenuItem>
              <MenuItem value="full">Full Grooming 120 min</MenuItem>
            </Select>
          </FormControl>
          
          {/* Date selection field */}
          <TextField
            label="Date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: today }}
            disabled={loading}
          />
          
          {/* Time Slot Selection UI */}
          {formData.groomerId && formData.date && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Select a Time
              </Typography>
              
              {slotsLoading ? (
                <Box display="flex" justifyContent="center" my={3}>
                  <CircularProgress />
                </Box>
              ) : sortedTimeSlots.length === 0 ? (
                <Alert severity="info">No available slots for this date</Alert>
              ) : (
                <Box mb={2}>
                  <Grid container spacing={1}>
                    {sortedTimeSlots.map((slot) => (
                      <Grid item xs={6} sm={4} md={3} lg={2} key={slot.start}>
                        <Paper 
                          elevation={formData.startTime === slot.start ? 3 : 1}
                          sx={{
                            p: 1.5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: formData.startTime === slot.start ? 'primary.light' : 'background.paper',
                            color: formData.startTime === slot.start ? 'white' : 'text.primary',
                            '&:hover': {
                              bgcolor: formData.startTime === slot.start ? 'primary.main' : 'grey.100',
                            },
                            transition: 'all 0.2s'
                          }}
                          onClick={() => handleTimeSlotSelect(slot.start)}
                        >
                          {formatTimeSlot(slot.start)}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
              
              {formData.startTime && (
                <Typography variant="body2" sx={{ mt: 2, color: 'primary.main' }}>
                  Selected time: {formatTimeSlot(formData.startTime)}
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading || !isFormValid}
        >
          {loading ? <CircularProgress size={24} /> : (isRescheduling ? "Reschedule" : "Book")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookingForm;

// Vertical Stack of form controls
// pet & groomer selection populated with pets and groomers from useInitialData
// type="date" to render a HTML5 date input element telling browsers to display a calendar picker
//  setting min value to current date prevents users from selecting past dates
// time slot dropdown displays available time slots fetched from useAvailability
//  time slot selection only appears once a groomer and a date have been chosen

// TODO: https://mui.com/x/react-date-pickers/getting-started/ change calendar to datepicker
