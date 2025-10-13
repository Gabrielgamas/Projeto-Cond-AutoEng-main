// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppStateProvider } from "./state/AppStateContext";
import Home from "./pages/Home";
import CondominioPage from "./pages/CondominioPage";

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/condominio/:condId" element={<CondominioPage />} />
        </Routes>
      </BrowserRouter>
    </AppStateProvider>
  );
}
