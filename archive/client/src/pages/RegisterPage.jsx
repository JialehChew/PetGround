import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {TextField, Button, Typography, Paper, Box, Alert, MenuItem, Container, Grid} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "owner",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { name, email, password, confirmPassword, role } = formData;

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      await register({ name, email, password, role });
      navigate("/dashboard");
    } catch (err) {
      setError(err.error || "Registration failed");
    }
  };

  return (
    <Container maxWidth="sm">
      <Grid 
        container 
        direction="column" 
        justifyContent="center" 
        style={{ minHeight: "80vh" }}
      >
        <Paper elevation={3}>
          <Box p={4} component="form" onSubmit={handleSubmit}>
            <Typography variant="h4" align="center" gutterBottom>
              Create user account
            </Typography>
            <Typography variant="body1" align="center" color="textSecondary" gutterBottom>
              Join as a pet owner or groomer
            </Typography>

            {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

            <TextField
              margin="normal"
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <TextField
              margin="normal"
              fullWidth
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <TextField
              margin="normal"
              fullWidth
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <TextField
              margin="normal"
              fullWidth
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

            <TextField
              select
              margin="normal"
              fullWidth
              label="I am a"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <MenuItem value="owner">Pet Owner</MenuItem>
              <MenuItem value="groomer">Groomer</MenuItem>
            </TextField>

            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              size="large"
              sx={{ mt: 3, mb: 2 }}
            >
              Register
            </Button>

            <Box mt={2} textAlign="center">
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Typography color="primary">
                  Already have an account? Login
                </Typography>
              </Link>
            </Box>
          </Box>
        </Paper>
      </Grid>
    </Container>
  );
};

export default RegisterPage; 
