/* =============================================================================
   FORGE — configuration
   Edit this file. Nothing else needs touching to go live.
   ============================================================================= */
window.FORGE_CONFIG = {

  /* ---------------------------------------------------------
     1. WHERE LEADS GO  (and where the welcome email is sent from)
     Paste the Google Apps Script /exec URL here.
     Setup: apps-script/README-SETUP.md
     Leave as-is and the form still works — leads are kept in the
     visitor's browser only and a warning prints to console.
     --------------------------------------------------------- */
  leadsEndpoint: "PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE",

  /* ---------------------------------------------------------
     2. WHERE THEY GO NEXT
     Both links are also used in the welcome email — set them in
     apps-script/Code.gs too, since that runs on Google's side.
     --------------------------------------------------------- */
  skoolUrl: "PASTE_YOUR_SKOOL_INVITE_LINK_HERE",
  whatsappUrl: "PASTE_YOUR_WHATSAPP_GROUP_INVITE_LINK_HERE",
  skoolName: "MENA AI Community",

  /* What joining actually gives someone. Keep this honest — it's the
     difference between an invitation and an advert. Add to it as the
     community grows; don't claim anything that isn't true yet. */
  skoolBullets: [
    { en: "A free introductory course to get you started.",
      ar: "دورة تمهيدية مجانية تبدأ بها." },
    { en: "People who help you get better at using AI — ask anything.",
      ar: "أشخاص يساعدونك على إتقان استخدام الذكاء الاصطناعي — اسأل عن أي شيء." },
    { en: "Free to join, and free to stay.",
      ar: "الانضمام مجاني، والبقاء مجاني." }
  ],

  /* ---------------------------------------------------------
     3. LANGUAGE
     "auto" follows the visitor's browser and falls back to English.
     Force it with "en" or "ar" if you'd rather.
     --------------------------------------------------------- */
  defaultLang: "auto",

  /* ---------------------------------------------------------
     4. BEHAVIOUR
     --------------------------------------------------------- */
  gateEnabled: true,
  askConsent: true,
  persistSession: true
};
