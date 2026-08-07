/* =============================================================
   FORGE — configuration
   Edit this file. Nothing else needs touching to go live.
   ============================================================= */
window.FORGE_CONFIG = {

  /* ---------------------------------------------------------
     1. WHERE LEADS GO
     Paste the Google Apps Script /exec URL here.
     Setup instructions: apps-script/README-SETUP.md
     Leave as-is and the form still works — leads are kept in
     the visitor's browser only and a warning prints to console.
     --------------------------------------------------------- */
  leadsEndpoint: "PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE",

  /* ---------------------------------------------------------
     2. WHERE THEY GO NEXT
     Your Skool community invite link.
     --------------------------------------------------------- */
  skoolUrl: "PASTE_YOUR_SKOOL_INVITE_LINK_HERE",
  skoolName: "Bahrain AI",
  skoolPitch: "Free intro course + the room where this stuff gets built.",

  /* ---------------------------------------------------------
     3. BRAND
     --------------------------------------------------------- */
  productName: "Forge",
  community: "Bahrain AI",
  communityTag: "AIBH",

  /* ---------------------------------------------------------
     4. BEHAVIOUR
     --------------------------------------------------------- */
  // Require an email before revealing the full prompt.
  gateEnabled: true,
  // Ask permission to email them (recommended — keeps you clean under
  // consent rules and gives you a warmer list).
  askConsent: true,
  // Resume a half-finished session if they come back.
  persistSession: true
};
