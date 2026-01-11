import { createTheme } from "@mui/material/styles";

const themeForm = createTheme({
  
  typography: {
    fontFamily: "Roboto, Arial, sans-serif", 
  },

  palette: {
    primary: {
      main: "hotpink",
      light: "#7F9FC1",
      dark: "#022952",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#C30000",
      light: "#FF0000",
      dark: "#790000",
      contrastText: "#ffffff",
    },
    success: {
      main: "#72E128",
    },
    error: {
      main: "#FF0000",
    },
    warning: {
      main: "#FFC403",
    },
    info: {
      main: "#004084",
    },
  },
});

export default themeForm;
