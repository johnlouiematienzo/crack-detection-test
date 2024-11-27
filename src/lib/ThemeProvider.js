"use client";

import {
  createTheme,
  ThemeProvider,
  responsiveFontSizes,
} from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { CssBaseline, Zoom } from "@mui/material";
// import { LicenseInfo } from '@mui/x-license-pro';
import { SnackbarProvider } from "notistack";

// All default styles
const themeBase = createTheme({
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Oxygen",
      "Ubuntu",
      "Cantarell",
      "Fira Sans",
      "Droid Sans",
      "Helvetica Neue",
      "sans-serif",
    ].join(","),
  },
});

// Component default styles
const componentTheme = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        TransitionComponent: Zoom,
      },
    },
  },
});

let appTheme = createTheme({
  ...themeBase,
  components: componentTheme.components,
});
appTheme = responsiveFontSizes(appTheme);

const ClientThemeProvider = ({ children }) => {
  // LicenseInfo.setLicenseKey(
  // 	'73fe0fd962cd7f5f3726f0d941213f8dTz04MjM1OSxFPTE3MzcxMDUzNjIwMDAsUz1wcm8sTE09c3Vic2NyaXB0aW9uLEtWPTI='
  // );

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={3000}
          onClose={() => {}}
          anchorOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
        >
          {children}
        </SnackbarProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
};

export default ClientThemeProvider;
