import React from "react";
import { Typography, Paper, Box, Button, Container } from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ServiceRates from "../components/ServiceRates";

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 4, textAlign: "center" }}>
        <Typography variant="h3" component="h1" gutterBottom>
          PetGround Booking App
        </Typography>
        
        <Typography variant="h6" color="text.secondary">
          Book grooming appointments for your pets with your preferred groomers
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          {isAuthenticated ? (
            <Button
              variant="contained"
              color="primary"
              size="large"
              component={Link}
              to="/dashboard"
            >
              Go to Dashboard
            </Button>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                component={Link}
                to="/login"
              >
                Book Now
              </Button>
            </Box>
          )}
        </Box>
        <ServiceRates />
      </Paper>
    </Container>
  );
};

export default HomePage;
