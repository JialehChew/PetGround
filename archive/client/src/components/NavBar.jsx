import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton, Drawer, List, ListItem, ListItemText, Divider
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "../contexts/AuthContext";

const NavBar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Navigation links for owner and groomer
  const ownerLinks = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Pets", to: "/pets" },
    { label: "Appointments", to: "/appointments" },
  ];
  const groomerLinks = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Schedule", to: "/schedule" },
    { label: "Calendar", to: "/calendar" },
  ];

  const navLinks = user?.role === "groomer" ? groomerLinks : ownerLinks;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, textDecoration: "none", color: "white", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
          >
            PetGround
          </Typography>
          {/* Desktop Nav */}
          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
            {isAuthenticated ? (
              <>
                {navLinks.map(link => (
                  <Button key={link.to} color="inherit" component={Link} to={link.to}>
                    {link.label}
                  </Button>
                ))}
                <Button color="inherit" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button color="inherit" component={Link} to="/login">
                  Login
                </Button>
                <Button color="inherit" component={Link} to="/register">
                  Register
                </Button>
              </>
            )}
          </Box>
          {/* Mobile Nav */}
          <IconButton
            color="inherit"
            edge="end"
            sx={{ display: { xs: "flex", md: "none" } }}
            onClick={() => setDrawerOpen(true)}
            aria-label="menu"
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      {/* Drawer for mobile */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 220 } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            PetGround
          </Typography>
          <Divider />
          <List>
            {isAuthenticated ? (
              <>
                {navLinks.map(link => (
                  <ListItem button component={Link} to={link.to} key={link.to} onClick={() => setDrawerOpen(false)}>
                    <ListItemText primary={link.label} />
                  </ListItem>
                ))}
                <ListItem button onClick={() => { setDrawerOpen(false); handleLogout(); }}>
                  <ListItemText primary="Logout" />
                </ListItem>
              </>
            ) : (
              <>
                <ListItem button component={Link} to="/login" onClick={() => setDrawerOpen(false)}>
                  <ListItemText primary="Login" />
                </ListItem>
                <ListItem button component={Link} to="/register" onClick={() => setDrawerOpen(false)}>
                  <ListItemText primary="Register" />
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default NavBar;
