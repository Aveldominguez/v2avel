import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installPwaResumeRecovery } from "./lib/pwaResume";
import { registerAppServiceWorker } from "./lib/registerSW";
import { pruneDrafts } from "./lib/turnaroundDraft";
import { aplicarClasesTema, igualarTemaDeLaCasa } from "./lib/theme";

// El tema se aplica ANTES del primer render, para que las rutas sin botón de
// tema (p. ej. el formulario) no parpadeen con el aspecto equivocado.
// igualarTemaDeLaCasa pone a todo el mundo en el tema de la casa la primera
// vez; después manda lo que cada uno elija.
aplicarClasesTema(igualarTemaDeLaCasa());

installPwaResumeRecovery();
registerAppServiceWorker();

// Los borradores de escalas que se abrieron y se dejaron a medias no se
// borraban nunca y acababan llenando el almacén del navegador; a partir de ahí
// dejaba de guardarse el borrador de la escala en curso, en silencio.
try { pruneDrafts(); } catch { /* almacén no disponible */ }

createRoot(document.getElementById("root")!).render(<App />);
