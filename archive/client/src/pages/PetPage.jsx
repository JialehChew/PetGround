import React, { useState, useEffect } from "react";
import { Typography, Paper, Box, List, ListItem, ListItemText, Divider, Alert, 
  Container, Button, IconButton, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from "@mui/icons-material";
import petService from "../services/petService";
import appointmentService from "../services/appointmentService";
import PetForm from "../components/PetForm";

const PetPage = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState({ form: false, delete: false, pet: null });
  // form controls add/edit form visibility
  // delete controls delete confirmation dialog visibility
  // pet stores the pet being edited or deleted
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      setLoading(true);
      const data = await petService.getUserPets();
      setPets(data);
      setError("");
    } catch (err) {
      setError(err.error || "Failed to load pets");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePet = async (formData, petId) => {
    try {
      if (petId) {
        const { pet } = await petService.updatePet(petId, formData);
        // after updating pet
        setPets(pets.map(p => p._id === petId ? pet : p));
      } else {
        const { pet } = await petService.createPet(formData);
        // after creating a pet
        setPets([...pets, pet]);
      }
      setModal({ ...modal, form: false, pet: null });
    } catch (err) {
      setError(err.error || "Failed to save pet");
    }
  };
  // logic to prevent deleting pets with upcoming appts
  const checkPetAppointments = async (petId) => {
    try {
      // 1. fetch all user appts
      const appointments = await appointmentService.getUserAppointments();
      const currentDate = new Date();
      // 2. check if any appts meet ALL criteria:
      return appointments.some(appointment => 
        // a. the appt is for this pet (handles both obj and ID refs)
        appointment.petId && 
        (appointment.petId._id === petId || appointment.petId === petId) &&
        // b. the appt is in the future
        new Date(appointment.startTime) > currentDate && 
        // c. the appt is confirmed
        appointment.status === "confirmed"
      );
    } catch (err) {
      console.error("Error checking pet appointments:", err);
      throw err;
    }
  };

  const handleOpenDeleteModal = async (pet) => {
    try {
      // check if pet has upcoming appts
      const hasAppointments = await checkPetAppointments(pet._id);      
      if (hasAppointments) {
        // if has appts, set err msg, prevent deletion
        setDeleteError(`Cannot delete ${pet.name} because they have upcoming appointments scheduled. Please cancel all appointments first.`);
      } else {
        // if no appts, allow deletion
        setDeleteError("");
        setModal({ ...modal, delete: true, pet });
      }
    } catch (err) {
      setError("Error checking pet appointments, try again");
      throw err;
    }
  };

  const handleDeletePet = async () => {
    try {
      await petService.deletePet(modal.pet._id);
      // after deleting pet
      setPets(pets.filter(p => p._id !== modal.pet._id));
      setModal({ ...modal, delete: false, pet: null });
      setDeleteError("");
    } catch (err) {
      setError(err.error || "Failed to delete pet");
      setModal({ ...modal, delete: false });
    }
  };

  if (loading) return <Typography sx={{ textAlign: 'center', py: 4 }}>Loading pets...</Typography>;

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">My Pets</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setModal({ ...modal, form: true, pet: null })}
          >
            Add Pet
          </Button>
        </Box>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {deleteError && <Alert severity="warning" sx={{ mb: 2 }}>{deleteError}</Alert>}
        
        <Paper elevation={3} sx={{ p: 3 }}>
          {pets.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              You haven't added any pets yet.
            </Typography>
          ) : (
            <List>
              {pets.map((pet, index) => (
                <React.Fragment key={pet._id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1,
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1, mt: { xs: 1, sm: 0 } }}>
                        <IconButton onClick={() => setModal({ ...modal, form: true, pet })} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={() => handleOpenDeleteModal(pet)} size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
                          {pet.name}
                        </Typography>
                      }
                      secondary={
                        <Box component="div" sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Species:</strong> {pet.species}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Breed:</strong> {pet.breed}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Age:</strong> {pet.age} y/o
                          </Typography>
                          {pet.notes && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>Notes:</strong> {pet.notes}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < pets.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Box>
      
      {/* Pet form modal */}
      <PetForm 
        open={modal.form}
        onClose={() => setModal({ ...modal, form: false, pet: null })}
        pet={modal.pet}
        onSave={handleSavePet}
        error={error}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={modal.delete} onClose={() => setModal({ ...modal, delete: false })}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Confirm deleting {modal.pet?.name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal({ ...modal, delete: false })}>Cancel</Button>
          <Button onClick={handleDeletePet} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PetPage;
