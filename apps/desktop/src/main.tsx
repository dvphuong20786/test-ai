import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ChanLoiGiaoDien } from "./ChanLoiGiaoDien";
import "./styles.css";
import "./video-controls.css";
import "./welcome-drop.css";
import "./error-boundary.css";
import "./project-management.css";
import "./processing-center.css";
import "./timeline-editing.css";
import "./subtitle-tools.css";
import "./video-loading.css";
import "./removal-comparison.css";
import "./processing-center-hidden.css";

createRoot(document.getElementById("root")!).render(<StrictMode><ChanLoiGiaoDien><App /></ChanLoiGiaoDien></StrictMode>);
