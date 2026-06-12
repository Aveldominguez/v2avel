import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installPwaResumeRecovery } from "./lib/pwaResume";
import { registerAppServiceWorker } from "./lib/registerSW";

installPwaResumeRecovery();
registerAppServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
