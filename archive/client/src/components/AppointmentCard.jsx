import React, { useState } from "react";
import { Box, Typography, Card, CardContent, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { formatDateWithDay } from "../utils/dateUtils";

const AppointmentCard = ({ appointment, statusColors, onReschedule, onDelete }) => {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  
  // format dates and check if appointment can be modified
  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);
  const currentTime = new Date();
  
  // minute = 1000 * 60
  // hour = minute * 60
  // day = hour * 24
  // year = day * 365
  // business logic for reschedule and cancellations
  const isUpcoming = startTime > currentTime;
  const isConfirmed = appointment.status === "confirmed";
  const hoursDifference = (startTime - currentTime) / (1000 * 60 * 60);
  const canModify = isUpcoming && isConfirmed && hoursDifference > 24;
  
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">
              {formatDateWithDay(startTime)}, {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}-
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
              Groomer: {appointment.groomerId?.name || "Assigned Groomer"}
            </Typography>
            
            {isUpcoming && isConfirmed && (
              <>
                <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    size="small"
                    onClick={() => onReschedule(appointment)}
                    disabled={!canModify}
                  >
                    Reschedule
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small"
                    onClick={() => setIsCancelDialogOpen(true)}
                    disabled={!canModify}
                  >
                    Cancel
                  </Button>
                </Box>
                {!canModify && hoursDifference <= 24 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", maxWidth: 220, wordBreak: "break-word" }}
                    >
                      Cannot modify less than 24 hours before appointment
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
          
          <Chip 
            label={appointment.status} 
            color={statusColors[appointment.status] || "default"} 
            sx={{ ml: 2, mt: 1 }}
          />
        </Box>
      </CardContent>
      
      <Dialog open={isCancelDialogOpen} onClose={() => setIsCancelDialogOpen(false)}>
        <DialogTitle>Cancel Appointment</DialogTitle>
        <DialogContent>
          Sure to cancel this appointment? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCancelDialogOpen(false)}>Keep</Button>
          <Button 
            onClick={() => {
              onDelete(appointment._id);
              setIsCancelDialogOpen(false);
            }} 
            color="error" 
            variant="contained"
          >
            Cancel Appointment
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default AppointmentCard;
