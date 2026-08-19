import React from "react";
import { createRoot } from "react-dom/client";
import UrbanDesignMap from "../app/page";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <UrbanDesignMap />
  </React.StrictMode>,
);
