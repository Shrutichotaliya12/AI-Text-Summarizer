import React from "react";
import { AppRouter } from "./presentation/router";
import { TranslationProvider, ToastProvider } from "./context";

const App: React.FC = () => {
  return (
    <TranslationProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </TranslationProvider>
  );
};

export default App;
