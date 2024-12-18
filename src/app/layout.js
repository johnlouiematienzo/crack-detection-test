import "@/ui/globals.css";
// import '@fortawesome/fontawesome-free/css/all.min.css';

import ClientThemeProvider from "@/lib/ThemeProvider";

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <ClientThemeProvider>{children}</ClientThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
// export default wrapper.withRedux(RootLayout);
