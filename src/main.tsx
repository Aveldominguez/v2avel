import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installPwaResumeRecovery } from "./lib/pwaResume";

installPwaResumeRecovery();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => registrations.forEach((registration) => registration.unregister()))
    .catch(() => undefined);
}

createRoot(document.getElementById("root")!).render(<App />);
