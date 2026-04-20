import React, { useState, useEffect } from "react";
import { Box, Tabs, Tab, Typography, CircularProgress, Alert } from "@mui/material";
import AppointmentCard from "./AppointmentCard";
import BookingForm from "./BookingForm";
import appointmentService from "../services/appointmentService";

const AppointmentList = ({ onRescheduleSuccess, onDeleteSuccess, onError }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [rescheduleData, setRescheduleData] = useState({ open: false, appointment: null });

  // fetch appointments on component mount
  useEffect(() => {
    // define fetchAppointments inside useEffect
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const data = await appointmentService.getUserAppointments();
        setAppointments(data);
        setError(null);
      } catch (err) {
        setError(err.error || "Failed to load appointments");
        if (onError) onError(err.error || "Failed to load appointments");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty dependency array with lint disable comment

  // separate fetchAppointments for event handlers
  // defined at component level, to fix ESLint dependency warning React Hook useEffect has a missing dependency
  // useCallback was producing weird behaviour
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentService.getUserAppointments();
      setAppointments(data);
      setError(null);
    } catch (err) {
      setError(err.error || "Failed to load appointments");
      if (onError) onError(err.error || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await appointmentService.deleteAppointment(id);
      await fetchAppointments();
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (err) {
      setError(err.error || "Failed to cancel appointment");
      if (onError) onError(err.error || "Failed to cancel appointment");
      setLoading(false);
    }
  };

  const handleRescheduleSuccess = () => {
    fetchAppointments();
    setRescheduleData({ open: false, appointment: null });
    if (onRescheduleSuccess) onRescheduleSuccess();
  };

  // sorted by startTime in asc order
  const currentDate = new Date();
  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime)
  );

  const upcomingAppointments = sortedAppointments.filter(
    appt => new Date(appt.startTime) >= currentDate
  );
  
  const pastAppointments = sortedAppointments.filter(
    appt => new Date(appt.startTime) < currentDate
  ).reverse();

  // status color mapping - primary, secondary, error, info (blue)
  const statusColors = {
    confirmed: "warning",
    completed: "success"
  };

  // render upcoming appointment cards
  const renderUpcomingAppointments = () => {
    if (upcomingAppointments.length === 0) {
      return (
        <Typography variant="body1" sx={{ textAlign: "center", mt: 3 }}>
          No upcoming appointments
        </Typography>
      );
    }

    return upcomingAppointments.map(appointment => (
      <AppointmentCard 
        key={appointment._id} 
        appointment={appointment} 
        statusColors={statusColors}
        onReschedule={(appt) => setRescheduleData({ open: true, appointment: appt })}
        onDelete={handleDelete}
      />
    ));
  };

  // render past appointment cards
  const renderPastAppointments = () => {
    if (pastAppointments.length === 0) {
      return (
        <Typography variant="body1" sx={{ textAlign: "center", mt: 3 }}>
          No past appointments
        </Typography>
      );
    }

    return pastAppointments.map(appointment => (
      <AppointmentCard 
        key={appointment._id} 
        appointment={appointment} 
        statusColors={statusColors}
        onReschedule={(appt) => setRescheduleData({ open: true, appointment: appt })}
        onDelete={handleDelete}
      />
    ));
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ width: "100%" }}>
      <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} centered>
        <Tab label={`Upcoming (${upcomingAppointments.length})`} />
        <Tab label={`Past (${pastAppointments.length})`} />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {/* Display appointments based on active tab */}
        {activeTab === 0 ? renderUpcomingAppointments() : renderPastAppointments()}
      </Box>
      
      {/* Reschedule form */}
      {rescheduleData.appointment && (
        <BookingForm
          open={rescheduleData.open}
          onClose={() => setRescheduleData({ open: false, appointment: null })}
          onSuccess={handleRescheduleSuccess}
          onError={onError}
          isRescheduling={true}
          appointmentToReschedule={rescheduleData.appointment}
        />
      )}
    </Box>
  );
};

export default AppointmentList;
