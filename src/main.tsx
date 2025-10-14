import "./index.css"; // ✅ mantém o Tailwind ativo

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ensurePersistentStorage } from "./utils/storage";

// PWA
import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

ensurePersistentStorage().then((ok) => {
  if (ok) console.log("Armazenamento persistente ativo ✅");
});
