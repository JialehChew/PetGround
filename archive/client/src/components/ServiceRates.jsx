import React from "react";
import { Box, Typography, Paper, Grid } from "@mui/material";

const ServiceRates = () => {
  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Our Grooming Services
      </Typography>
      
      <Grid container spacing={2}>
        {/* Basic Grooming */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
              Basic Grooming ~ 60 mins
            </Typography>
            <Typography variant="body2" paragraph>
              Includes: Bathing, Drying & Brushing • Nail clipping & filing • 
              Shaving of paw pad fur & fur around belly, genital & butt area • 
              Ear cleaning & removing of ear fur • Anal glands express
            </Typography>
            
            <Typography variant="subtitle1" gutterBottom>
              Small Breed
            </Typography>
            <Typography variant="body2" paragraph>
              RM35-50
            </Typography>
            <Typography variant="body2" paragraph>
              Chihuahua, Toy Poodle, Maltese, Shitzu, Pomeranian, Jack Russell, 
              Silky Terrier, Yorkshire Terrier, Pug, Frenchie, Miniature Schnauzer, etc.
            </Typography>
            
            <Typography variant="subtitle1" gutterBottom>
              Medium Breed
            </Typography>
            <Typography variant="body2" paragraph>
              RM55-75
            </Typography>
            <Typography variant="body2" paragraph>
              Bichon, Jap Spitz, Beagle, Miniature Poodle, Lhasa Apso, 
              Shetland Sheepdog, English Cocker Spaniel, etc.
            </Typography>
            
            <Typography variant="subtitle1" gutterBottom>
              Large Breed
            </Typography>
            <Typography variant="body2" paragraph>
              RM80-120
            </Typography>
            <Typography variant="body2" paragraph>
              Chowchow, Husky, Springer Spaniel, Golden Retriever, 
              Rough Collie, Boxer, Keeshond, Samoyed, Border Collie, etc.
            </Typography>
          </Paper>
        </Grid>
        
        {/* Full Grooming */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
              Full Grooming ~ 120 mins
            </Typography>
            <Typography variant="body2" paragraph>
              Includes: Overall clipping & styling or shaving • Bathing, Drying & Brushing • 
              Nail clipping & filing • Shaving of paw pad fur & fur around belly, 
              genital & butt area • Ear cleaning & removing of ear fur • Anal glands express
            </Typography>
            
            <Typography variant="subtitle1" gutterBottom>
              Small Breed
            </Typography>
            <Typography variant="body2" paragraph>
              RM60-75
            </Typography>
            <Typography variant="body2" paragraph>
              Chihuahua, Toy Poodle, Maltese, Shitzu, Pomeranian, Jack Russell, 
              Silky Terrier, Yorkshire Terrier, Pug, Frenchie, Miniature Schnauzer, etc.
            </Typography>
            
            <Typography variant="subtitle1" gutterBottom>
              Medium Breed
            </Typography>
            <Typography variant="body2" paragraph>
              RM80-95
            </Typography>
            <Typography variant="body2" paragraph>
              Bichon, Jap Spitz, Beagle, Miniature Poodle, Lhasa Apso, 
              Shetland Sheepdog, English Cocker Spaniel, etc.
            </Typography>
            
            <Typography variant="subtitle1" gutterBottom>
              Large Breed
            </Typography>
            <Typography variant="body2" paragraph>
              RM100-150
            </Typography>
            <Typography variant="body2" paragraph>
              Chowchow, Husky, Springer Spaniel, Golden Retriever, 
              Rough Collie, Boxer, Keeshond, Samoyed, Border Collie, etc.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ServiceRates;
