import React from "react";
import { Typography, Paper, Box, Button, Container, Grid } from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PetsIcon from "@mui/icons-material/Pets";
import EventIcon from "@mui/icons-material/Event";
import EventNoteIcon from '@mui/icons-material/EventNote';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>{user?.role === "owner" ? "Owner Dashboard" : "Groomer Dashboard"}</Typography>
        <Typography variant="h6" gutterBottom color="text.secondary">
          Welcome, {user?.name}
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* Pet Owner Dashboard */}
          {user?.role === "owner" && (
            <>
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 3, height: "100%" }}>
                  <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <PetsIcon sx={{ fontSize: 40, mb: 2, color: "primary.main" }} />
                    <Typography variant="h5" gutterBottom>Manage Pets</Typography>
                    <Typography variant="body2" sx={{ mb: 3, flexGrow: 1 }}>
                      Add, edit, or remove your pets from our system.
                    </Typography>
                    <Button 
                      variant="contained" 
                      component={Link} 
                      to="/pets"
                      fullWidth
                    >
                      My Pets
                    </Button>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 3, height: "100%" }}>
                  <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <EventIcon sx={{ fontSize: 40, mb: 2, color: "primary.main" }} />
                    <Typography variant="h5" gutterBottom>Manage Appointments</Typography>
                    <Typography variant="body2" sx={{ mb: 3, flexGrow: 1 }}>
                      Book and manage your pet grooming appointments.
                    </Typography>
                    <Button 
                      variant="contained"
                      component={Link}
                      to="/appointments"
                      fullWidth
                    >
                      My Appointments
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </>
          )}
          
          {/* Groomer Dashboard */}
          {user?.role === "groomer" && (
            <>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <EventNoteIcon sx={{ fontSize: 40, mb: 2, color: "primary.main" }} />
                  <Typography variant="h5" gutterBottom>My Schedule</Typography>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    View your daily schedule.
                  </Typography>
                  <Button 
                    variant="contained"
                    component={Link}
                    to="/schedule"
                    fullWidth
                  >
                    View Schedule
                  </Button>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <CalendarMonthIcon sx={{ fontSize: 40, mb: 2, color: "primary.main" }} />
                  <Typography variant="h5" gutterBottom>My Calendar</Typography>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    View your calendar.
                  </Typography>
                  <Button 
                    variant="contained"
                    component={Link}
                    to="/calendar"
                    fullWidth
                  >
                    View Calendar
                  </Button>
                </Box>
              </Paper>
            </Grid>
            </>
          )}
        </Grid>
      </Box>
    </Container>
  );
};

export default DashboardPage; 
