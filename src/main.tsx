import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installPwaResumeRecovery } from "./lib/pwaResume";

installPwaResumeRecovery();

createRoot(document.getElementById("root")!).render(<App />);
