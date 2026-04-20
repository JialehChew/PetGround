//  https://mui.com/material-ui/customization/palette/?srsltid=AfmBOopM15k_45t1SqKSQcMrF455Q1yN_se8_RlEmc1TDgx77vvHn6yR
// import { createTheme } from "@mui/material/styles";

// const theme = createTheme({
//   palette: {
//     primary: {
//       main: "#0c343d",
//     },
//     secondary: {
//       main: "#f50057",
//     },
//   },
//   typography: {
//     fontFamily: ["-apple-system", '"Segoe UI"', "Roboto", "sans-serif"].join(","),
//   },
// });

// export default theme;

// prompt: create more visually appealing theme that is warm, friendly and professional for WCAG compliance
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      light: "#5B9EAD", // lighter teal/blue - good for hover states
      main: "#2E7D8C", // teal/blue - good contrast ratio
      dark: "#1A5F6D", // darker teal/blue - good for active states
      contrastText: "#ffffff",
    },
    secondary: {
      light: "#F9A27B", // lighter orange - good for accents
      main: "#F27D52", // warm orange - good contrast ratio
      dark: "#D25E35", // darker orange - good for active states
      contrastText: "#000000",
    },
    background: {
      default: "#FAFAFA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#303030",
      secondary: "#5A5A5A",
    },
    error: {
      main: "#D32F2F", // accessible red
    },
    success: {
      main: "#2E7D32", // accessible green
    },
    info: {
      main: "#0288D1", // accessible blue
    },
    warning: {
      main: "#ED6C02", // accessible orange
    },
  },
  typography: {
    fontFamily: [
      "Nunito", // Friendly, rounded font
      "-apple-system",
      '"Segoe UI"',
      "Roboto",
      "sans-serif",
    ].join(","),
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: "none", // More modern look without all-caps
    },
  },
  shape: {
    borderRadius: 8, // Slightly rounded corners for a friendly feel
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: "8px 16px",
        },
      },
    },
  },
});

export default theme;
