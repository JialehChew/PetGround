import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {TextField, Button, Typography, Paper, Box, Alert, Container, Grid} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.error || "Login failed");
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
              Welcome Back
            </Typography>
            <Typography variant="body1" align="center" color="textSecondary" gutterBottom>
              Sign in to your account
            </Typography>

            {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

            <TextField
              margin="normal"
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <TextField
              margin="normal"
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              size="large"
              sx={{ mt: 3, mb: 2 }}
            >
              Login
            </Button>

            <Box mt={2} textAlign="center">
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Typography color="primary">
                  Don't have an account? Register
                </Typography>
              </Link>
            </Box>
          </Box>
        </Paper>
      </Grid>
    </Container>
  );
};

export default LoginPage; 
