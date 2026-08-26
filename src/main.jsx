import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import "./styles.css"

// An invitation that renders a blank screen is worse than a plain one. If anything in the app
// throws — a browser without a Canvas 2D context, a font API that behaves oddly, a bug we did not
// catch — the guest still gets the evening in full. Deliberately built from literals: if the
// failure were in i18n.js, a fallback that read from it would fail with it.
class Fallback extends React.Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error(err) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="bare">
        <p className="bare-k">Request the honour of your presence</p>
        <h1>Tashkeen &amp; Anusha</h1>
        <hr />
        <p className="bare-t">Rukhsati &amp; Walima</p>
        <p>Sunday, 27 December 2026<br />Nerunkot Hall, Qasimabad, Hyderabad, Sindh</p>
        <p>7:00 PM · Guests arrive<br />8:00 PM · Entrance of the bride &amp; groom<br />
          9:00 PM · Dinner is served<br />10:30 PM · Rasms<br />12:00 AM · Rukhsati</p>
        <p>Kindly be seated by 7:00 PM — the programme begins promptly and follows the times
          above exactly.</p>
        <p><a href="https://www.google.com/maps/search/?api=1&query=Nerunkot%20Hall%20Qasimabad%20Hyderabad">
          Directions to Nerunkot Hall</a></p>
        <p className="bare-t">With love and prayers,<br />Tashkeen &amp; Anusha</p>
      </div>
    )
  }
}

createRoot(document.getElementById("root")).render(
  <Fallback><App /></Fallback>
)

// Offline support, so the invitation still opens at the hall and on the road. Registered only in
// the built site — in dev there is no sw.js and a stale cache would be a nuisance.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}))
}
