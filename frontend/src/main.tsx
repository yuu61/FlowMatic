import "dayjs/locale/ja";
import "react-datepicker/dist/react-datepicker.css";
import "./styles/datepicker.css";

import dayjs from "dayjs";
import { createRoot } from "react-dom/client";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";

dayjs.locale("ja");

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
