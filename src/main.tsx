import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installPwaResumeRecovery } from "./lib/pwaResume";
import { registerAppServiceWorker } from "./lib/registerSW";

// Aplica el tema guardado ANTES del primer render, para que rutas sin el
// botón de tema (p. ej. el formulario) también respeten la preferencia.
const savedTheme = localStorage.getItem('theme');
document.documentElement.classList.toggle('light', savedTheme === 'light' || savedTheme === 'exterior');
document.documentElement.classList.toggle('exterior', savedTheme === 'exterior');

installPwaResumeRecovery();
registerAppServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
