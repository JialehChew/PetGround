import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Alert, Box, List, ListItem, ListItemText, Divider } from "@mui/material";

const AppointmentPetDetails = ({ open, onClose, pet, loading, error }) => {
  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pet Details</DialogTitle>
      
      <DialogContent>
        {pet && (
          <List>
            <ListItem>
              <ListItemText 
                primary="Pet Name" 
                secondary={pet.name} 
              />
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Species" 
                secondary={pet.species} 
              />
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Breed" 
                secondary={pet.breed} 
              />
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Age" 
                secondary={`${pet.age} years`} 
              />
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Owner" 
                secondary={pet.ownerName} 
              />
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Appointment Time" 
                secondary={pet.appointmentTime} 
              />
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Service Type" 
                secondary={pet.serviceType.charAt(0).toUpperCase() + pet.serviceType.slice(1)} 
              />
            </ListItem>
            <Divider />
                
            <ListItem>
              <ListItemText 
                primary="Notes" 
                secondary={pet.notes} 
              />
            </ListItem>
          </List>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentPetDetails;
