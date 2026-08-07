/* =============================================================================
   LEAD CAPTURE
   Posts to a Google Apps Script web app.

   Note the content type: text/plain. Apps Script web apps don't answer CORS
   preflight, and application/json triggers one. text/plain is a "simple
   request" — no preflight, no CORS failure. The script reads the raw body
   and JSON.parses it.

   The unlock NEVER depends on this succeeding. A prospect who reaches the
   result screen gets the result screen.
   ============================================================================= */

window.FORGE = window.FORGE || {};

FORGE.lead = (function () {

  var LOCAL_KEY = "forge_leads_v1";
  var UNLOCK_KEY = "forge_unlocked_v1";

  function isPlaceholder(v) {
    return !v || /^PASTE_/.test(v) || v.indexOf("YOUR_") !== -1;
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test((v || "").trim());
  }

  /* Keep a local copy regardless — if the endpoint was misconfigured on launch
     day, the owner can still recover leads from a visitor's console. */
  function stash(row) {
    try {
      var list = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      list.push(row);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-50)));
    } catch (e) { /* private mode */ }
  }

  function post(row) {
    var url = FORGE_CONFIG.leadsEndpoint;
    if (isPlaceholder(url)) {
      console.warn(
        "[Forge] leadsEndpoint is not configured — this lead was saved to " +
        "localStorage only.\nSet it in assets/js/config.js. See apps-script/README-SETUP.md.",
        row
      );
      return Promise.resolve({ stored: false, reason: "not-configured" });
    }

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(row)
    })
      .then(function (r) { return { stored: r.ok, status: r.status }; })
      .catch(function () {
        // Last resort: opaque request. We can't read the result, but the row lands.
        return fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(row)
        })
          .then(function () { return { stored: true, opaque: true }; })
          .catch(function () { return { stored: false, reason: "network" }; });
      });
  }

  function submit(email, consent, meta) {
    var row = {
      email: (email || "").trim().toLowerCase(),
      consent: !!consent,
      at: new Date().toISOString(),
      source: location.hostname || "local",
      ref: document.referrer || "",
      meta: meta || {}
    };
    stash(row);
    return post(row);
  }

  function markUnlocked(email) {
    try { localStorage.setItem(UNLOCK_KEY, email || "1"); } catch (e) { /* noop */ }
  }

  function alreadyUnlocked() {
    try { return !!localStorage.getItem(UNLOCK_KEY); } catch (e) { return false; }
  }

  function skoolUrl() {
    var u = FORGE_CONFIG.skoolUrl;
    return isPlaceholder(u) ? null : u;
  }

  return {
    submit: submit,
    validEmail: validEmail,
    markUnlocked: markUnlocked,
    alreadyUnlocked: alreadyUnlocked,
    skoolUrl: skoolUrl,
    isPlaceholder: isPlaceholder
  };
})();
