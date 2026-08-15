import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installPwaResumeRecovery } from "./lib/pwaResume";
import { registerAppServiceWorker } from "./lib/registerSW";
import { pruneDrafts } from "./hooks/useOfflineSync";

// Aplica el tema guardado ANTES del primer render, para que rutas sin el
// botón de tema (p. ej. el formulario) también respeten la preferencia.
const savedTheme = localStorage.getItem('theme');
document.documentElement.classList.toggle('light', savedTheme === 'light' || savedTheme === 'exterior');
document.documentElement.classList.toggle('exterior', savedTheme === 'exterior');
document.documentElement.classList.toggle('sky', savedTheme === 'sky');
document.documentElement.classList.toggle('aero', savedTheme === 'aero');

installPwaResumeRecovery();
registerAppServiceWorker();

// Los borradores de escalas que se abrieron y se dejaron a medias no se
// borraban nunca y acababan llenando el almacén del navegador; a partir de ahí
// dejaba de guardarse el borrador de la escala en curso, en silencio.
try { pruneDrafts(); } catch { /* almacén no disponible */ }

createRoot(document.getElementById("root")!).render(<App />);
