/* popup-demo.js — discoverability panel for Local Time Everywhere.
 *
 * The core conversion only runs on the manifest's content-script hosts. A CWS
 * reviewer who opens the popup on an unsupported page would otherwise see no
 * evidence of what the extension does. This script renders, above the React
 * root, a self-evident panel: a plain description, a LIVE conversion computed
 * from the reviewer's real time zone, and the exact host list from the
 * manifest. It never touches the React tree (#root) and adds no permissions.
 *
 * All copy flows through chrome.i18n.getMessage; strings live in
 * _locales/en/messages.json.
 */
(function () {
  "use strict";

  function msg(key, subs) {
    try {
      var m = chrome.i18n.getMessage(key, subs);
      return m || "";
    } catch (e) {
      return "";
    }
  }

  // Resolve the reviewer's real time zone. Falls back to UTC if unavailable.
  function localTimeZone() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz || "UTC";
    } catch (e) {
      return "UTC";
    }
  }

  // Format one instant in a given zone: { time: "3:00 PM", abbr: "PDT" }.
  function formatInZone(instant, zone) {
    var out = { time: "", abbr: "" };
    try {
      out.time = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: zone
      }).format(instant);
      var parts = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        timeZoneName: "short",
        timeZone: zone
      }).formatToParts(instant);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === "timeZoneName") {
          out.abbr = parts[i].value;
        }
      }
    } catch (e) {
      /* leave blanks; caller handles empty */
    }
    return out;
  }

  // Build a real conversion for a single instant so both sides are truthful.
  function computeExample() {
    var localZone = localTimeZone();
    var sourceZone = "America/Los_Angeles";
    // Anchor to today at 22:00 UTC → 3:00 PM Pacific (2:00 PM in winter).
    var now = new Date();
    var instant = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      22, 0, 0
    ));
    var src = formatInZone(instant, sourceZone);
    var loc = formatInZone(instant, localZone);
    if (!src.time || !loc.time) {
      return msg("popupDemoExampleFallback");
    }
    var source = src.abbr ? (src.time + " " + src.abbr) : src.time;
    return msg("popupDemoExample", [source, loc.time, localZone]);
  }

  function render() {
    if (document.getElementById("ltd-demo")) {
      return;
    }
    var panel = document.createElement("section");
    panel.id = "ltd-demo";
    panel.setAttribute("aria-label", msg("popupDemoEyebrow"));

    var eyebrow = document.createElement("p");
    eyebrow.className = "ltd-eyebrow";
    eyebrow.textContent = msg("popupDemoEyebrow");

    var what = document.createElement("p");
    what.className = "ltd-what";
    what.textContent = msg("popupDemoWhat");

    var example = document.createElement("div");
    example.className = "ltd-example";
    var exLabel = document.createElement("span");
    exLabel.className = "ltd-example-label";
    exLabel.textContent = msg("popupDemoExampleLabel");
    var exValue = document.createElement("span");
    exValue.className = "ltd-example-value";
    exValue.id = "ltd-example-value";
    exValue.textContent = computeExample();
    example.appendChild(exLabel);
    example.appendChild(exValue);

    var workson = document.createElement("p");
    workson.className = "ltd-workson";
    var wLabel = document.createElement("b");
    wLabel.textContent = msg("popupWorksOnLabel") + ": ";
    workson.appendChild(wLabel);
    workson.appendChild(document.createTextNode(msg("popupWorksOnSites")));

    var hint = document.createElement("p");
    hint.className = "ltd-hint";
    hint.textContent = msg("popupDemoHint");

    panel.appendChild(eyebrow);
    panel.appendChild(what);
    panel.appendChild(example);
    panel.appendChild(workson);
    panel.appendChild(hint);

    // Insert above the React root so the panel is the first thing a reviewer
    // sees and React never manages it.
    var root = document.getElementById("root");
    if (root && root.parentNode) {
      root.parentNode.insertBefore(panel, root);
    } else {
      document.body.insertBefore(panel, document.body.firstChild);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
