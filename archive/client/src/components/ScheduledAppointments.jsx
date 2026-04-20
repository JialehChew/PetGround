import React from "react";
import { Grid, CircularProgress, Alert, Chip, Card, CardContent, Box, Typography } from "@mui/material";

const ScheduledAppointments = ({ appointments, loading, error, onAppointmentClick, statusColors }) => {
  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (appointments.length === 0) return <Alert severity="info">No appointments scheduled for this day</Alert>;

  return (
    <Grid container spacing={2}>
      {appointments.map((appointment) => {
        const startTime = new Date(appointment.startTime);
        const endTime = new Date(appointment.endTime);
        
        return (
          <Grid item xs={12} key={appointment._id}>
            <Card sx={{ cursor: 'pointer'}} onClick={() => onAppointmentClick(appointment)}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="h6">
                      {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                    
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {appointment.serviceType.charAt(0).toUpperCase() + appointment.serviceType.slice(1)} Grooming 
                      ({appointment.duration / 60} hours)
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Pet: {appointment.petId?.name || "Pet"} ({appointment.petId?.species || "Unknown"})
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Owner: {appointment.ownerId?.name || "Pet Owner"}
                    </Typography>
                  </Box>
                  
                  <Chip 
                    label={appointment.status} 
                    color={statusColors[appointment.status] || "default"} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default ScheduledAppointments;
