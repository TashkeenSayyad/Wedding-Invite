import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import "./styles.css"
createRoot(document.getElementById("root")).render(<App />)

// Offline support, so the invitation still opens at the hall and on the road. Registered only in
// the built site — in dev there is no sw.js and a stale cache would be a nuisance.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}))
}
