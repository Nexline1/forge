/* =============================================================================
   LANGUAGE

   Two resolvers:
     FORGE.t('key')        → UI chrome, from the dictionary below
     FORGE.f(obj, 'label') → data-library fields, reads `label_ar` when Arabic

   Both fall back to English when a translation is missing, so a half-finished
   translation degrades to English rather than rendering blanks.

   NOTE: the generated system prompt is ALWAYS English regardless of this
   setting — see the note in compose.js. Only the interface translates.
   ============================================================================= */

window.FORGE = window.FORGE || {};

FORGE.i18n = (function () {

  var KEY = "forge_lang";
  var current = "en";

  var DICT = {
    /* ---- chrome ---- */
    by:            { en: "MENA AI Community",     ar: "مجتمع مينا للذكاء الاصطناعي" },
    startOver:     { en: "Start over",            ar: "من البداية" },
    back:          { en: "Back",                  ar: "رجوع" },
    continue:      { en: "Continue",              ar: "التالي" },
    seePrompt:     { en: "See my prompt",         ar: "اعرض الأمر" },
    buildNow:      { en: "Build it now",          ar: "ابنِه الآن" },
    of:            { en: "of",                    ar: "من" },

    /* ---- landing ---- */
    heroTag:       { en: "Free · from the MENA AI Community",
                     ar: "مجاني · من مجتمع مينا للذكاء الاصطناعي" },
    heroTitle:     { en: "Stop explaining yourself to the AI <em>every single time.</em>",
                     ar: "توقّف عن شرح نفسك للذكاء الاصطناعي <em>في كل مرة.</em>" },
    heroLead:      { en: "Five questions. One prompt, built for your job, your tools and your model.",
                     ar: "خمسة أسئلة. أمر واحد، مبني لمهنتك وأدواتك ونموذجك." },
    heroCta:       { en: "Build my prompt",       ar: "ابنِ الأمر الخاص بي" },
    heroMeta:      { en: "Under a minute. No account.", ar: "أقل من دقيقة. بدون حساب." },
    proof1t:       { en: "Built for your job",    ar: "مبني لمهنتك" },
    proof2t:       { en: "Formatted for your tool", ar: "منسّق لأداتك" },
    proof3t:       { en: "Yours to edit",         ar: "ملكك لتعدّله" },

    /* ---- questions ---- */
    qWork:         { en: "What's your <em>work</em>?",        ar: "ما <em>مجال عملك</em>؟" },
    qDo:           { en: "What should it <em>do</em>?",       ar: "ما الذي تريده أن <em>يفعله</em>؟" },
    qWhere:        { en: "Where will you <em>use</em> it?",   ar: "أين ستستخدمه؟" },
    qWrong:        { en: "If it gets something <em>wrong</em>?", ar: "ماذا لو <em>أخطأ</em>؟" },
    qYou:          { en: "Last one — who are <em>you</em>?",  ar: "الأخير — من <em>أنت</em>؟" },
    qYouHelp:      { en: "One line. Skip it if you like, but this is what stops it sounding generic.",
                     ar: "سطر واحد. تجاوزه إن شئت، لكنه ما يمنع النتيجة من أن تبدو عامة." },
    otherField:    { en: "Type your field — e.g. architecture, logistics",
                     ar: "اكتب مجالك — مثل الهندسة المعمارية أو الخدمات اللوجستية" },
    youPh:         { en: "Finance lead at a family office in Dubai — we report in AED",
                     ar: "مدير مالي في مكتب عائلي بدبي — تقاريرنا بالدرهم الإماراتي" },

    stakesLow:     { en: "No big deal",   ar: "لا مشكلة" },
    stakesLowD:    { en: "I check everything anyway", ar: "أراجع كل شيء على أي حال" },
    stakesMed:     { en: "Embarrassing",  ar: "محرج" },
    stakesMedD:    { en: "Colleagues would see it",  ar: "سيراه الزملاء" },
    stakesHigh:    { en: "Costly",        ar: "مكلف" },
    stakesHighD:   { en: "Clients, money or production", ar: "عملاء أو مال أو بيئة تشغيل" },

    /* ---- gate ---- */
    gateEyebrow:   { en: "Ready",                 ar: "جاهز" },
    gateTitle:     { en: "Your prompt is <em>built.</em>", ar: "أمرك <em>جاهز.</em>" },
    gateLead:      { en: "{lines} lines, {words} words, written for {tool}. Here's the opening — tell me where to send the rest.",
                     ar: "{lines} سطراً و{words} كلمة، مكتوب لأجل {tool}. هذه البداية — أخبرني أين أرسل البقية." },
    gateAsk:       { en: "Where should I send it?", ar: "أين أرسله؟" },
    gateSub:       { en: "You'll get the full prompt on the next screen — plus the setup steps for your tool.",
                     ar: "ستحصل على الأمر كاملاً في الشاشة التالية — مع خطوات الإعداد لأداتك." },
    emailPh:       { en: "you@company.com",       ar: "you@company.com" },
    consent:       { en: "Send me the occasional thing worth reading from the MENA AI Community. No spam, unsubscribe anytime.",
                     ar: "أرسل لي بين حين وآخر ما يستحق القراءة من مجتمع مينا للذكاء الاصطناعي. بلا إزعاج، ويمكنك إلغاء الاشتراك متى شئت." },
    unlock:        { en: "Unlock my prompt",      ar: "افتح الأمر" },
    unlocking:     { en: "Unlocking",             ar: "جارٍ الفتح" },
    fineprint:     { en: "Your email, and nothing else. We never sell or share it.",
                     ar: "بريدك فقط، لا شيء غيره. لن نبيعه أو نشاركه أبداً." },
    badEmail:      { en: "That doesn't look like a working email address.",
                     ar: "لا يبدو هذا بريداً إلكترونياً صالحاً." },
    gateCommunity: { en: "Built by the MENA AI Community — free to join, and you're welcome in it.",
                     ar: "من صناعة مجتمع مينا للذكاء الاصطناعي — الانضمام مجاني، وأنت مرحّب بك فيه." },

    /* ---- result ---- */
    doneEyebrow:   { en: "Done",                  ar: "تم" },
    resultTitle:   { en: "Here it is. <em>Edit anything</em> that doesn't sound like you.",
                     ar: "ها هو. <em>عدّل أي شيء</em> لا يشبه أسلوبك." },
    copy:          { en: "Copy",                  ar: "نسخ" },
    copied:        { en: "Copied — paste it into {tool}", ar: "تم النسخ — الصقه في {tool}" },
    copyFail:      { en: "Couldn't copy — select it and copy manually",
                     ar: "تعذّر النسخ — حدّده وانسخه يدوياً" },
    download:      { en: "Download",              ar: "تنزيل" },
    downloaded:    { en: "Downloaded",            ar: "تم التنزيل" },
    resetEdits:    { en: "Reset edits",           ar: "استرجاع الأصل" },
    reverted:      { en: "Back to the original",  ar: "عاد إلى الأصل" },
    howTo:         { en: "How to use this in {tool}", ar: "كيف تستخدمه في {tool}" },
    worthKnowing:  { en: "Worth knowing",         ar: "جدير بالمعرفة" },
    buildAnother:  { en: "Build another prompt for a different job",
                     ar: "ابنِ أمراً آخر لمهمة مختلفة" },
    forChip:       { en: "For",                   ar: "لـ" },
    toChip:        { en: "To",                    ar: "لكي" },
    inChip:        { en: "In",                    ar: "في" },

    /* ---- language note (Arabic UI only) ---- */
    langNoteT:     { en: "Why is the prompt in English?", ar: "لماذا الأمر باللغة الإنجليزية؟" },
    langNoteB:     { en: "Models follow English instructions more reliably — the nuance, the negations and the format rules hold up better. It costs you nothing: the prompt already tells it to reply in Arabic whenever you write in Arabic. Keep it in English, talk to it in Arabic.",
                     ar: "النماذج تلتزم بالتعليمات الإنجليزية بشكل أكثر موثوقية — تُحفظ الفروق الدقيقة وصيغ النفي وقواعد التنسيق بصورة أفضل. ولا يكلّفك ذلك شيئاً: الأمر يتضمّن أصلاً تعليمة بالرد عليك بالعربية كلما كتبت بالعربية. أبقِه بالإنجليزية، وخاطبه بالعربية." },

    /* ---- refine panel ---- */
    /* one-line nudge on the result screen */
    nudgeBlurb:    { en: "Add a line about who you are and it stops sounding generic.",
                     ar: "أضف سطراً عمّن تكون، فيتوقف عن أن يبدو عاماً." },
    nudgeAlways:   { en: "Tell it the one thing it must always know about your work.",
                     ar: "أخبره بالشيء الذي يجب أن يعرفه دائماً عن عملك." },
    nudgeTools:    { en: "Tell it what it can actually reach — that's where the guardrails come from.",
                     ar: "حدّد ما يمكنه الوصول إليه فعلاً — فمن هناك تأتي الضوابط." },
    nudgeModel:    { en: "Pick your model and I'll tune the wording to it.",
                     ar: "اختر نموذجك وسأضبط الصياغة عليه." },
    nudgeCta:      { en: "Refine",                ar: "اضبط" },

    refineOpen:    { en: "Refine this prompt",    ar: "اضبط هذا الأمر" },
    refineClose:   { en: "Close",                 ar: "إغلاق" },
    refineLead:    { en: "I picked these for you from your answers. Change anything — the prompt updates as you go.",
                     ar: "اخترتُ هذه لك بناءً على إجاباتك. غيّر ما تشاء — يتحدّث الأمر مباشرة." },
    rFormat:       { en: "Output format",         ar: "شكل المخرجات" },
    rTone:         { en: "How it behaves",        ar: "طريقة تعامله" },
    rTools:        { en: "What it can reach",     ar: "ما يمكنه الوصول إليه" },
    rGuards:       { en: "Hard limits",           ar: "حدود صارمة" },
    rPlan:         { en: "Your plan",             ar: "اشتراكك" },
    rAlways:       { en: "Anything it must always know", ar: "ما يجب أن يعرفه دائماً" },
    rAlwaysPh:     { en: "We only take WhatsApp bookings. Never quote a price in chat.",
                     ar: "نستقبل الحجوزات عبر واتساب فقط. لا تذكر سعراً في المحادثة أبداً." },
    maxPicked:     { en: "That's the maximum — deselect one first.",
                     ar: "هذا هو الحد الأقصى — ألغِ اختيار واحد أولاً." },

    /* ---- handoff ---- */
    handoffT:      { en: "This is the <em>easy</em> part.", ar: "هذا هو <em>الجزء السهل</em>." },
    handoffCta:    { en: "Join {name} — free",    ar: "انضم إلى {name} — مجاناً" },
    handoffNote:   { en: "Free. No card, no pitch.", ar: "مجاني. بلا بطاقة، وبلا عروض." },
    linkMissing:   { en: "Community link not set yet", ar: "لم يُضبط رابط المجتمع بعد" },
    copyNudge:     { en: "Copied. The community is where people help you make it better — free.",
                     ar: "تم النسخ. في المجتمع أشخاص يساعدونك على تحسينه — مجاناً." },

    restartConfirm:{ en: "Sure?",                 ar: "متأكد؟" }
  };

  /* ---------- api -------------------------------------------------------- */

  function detect() {
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === "ar" || saved === "en") return saved;
    } catch (e) { /* private mode */ }
    if (FORGE_CONFIG.defaultLang === "ar" || FORGE_CONFIG.defaultLang === "en") {
      return FORGE_CONFIG.defaultLang;
    }
    var nav = (navigator.languages || [navigator.language || "en"]).join(",");
    return /\bar\b|^ar-|,ar-/i.test(nav) ? "ar" : "en";
  }

  function apply() {
    var html = document.documentElement;
    html.setAttribute("lang", current);
    html.setAttribute("dir", current === "ar" ? "rtl" : "ltr");
  }

  function set(lang) {
    current = (lang === "ar") ? "ar" : "en";
    try { localStorage.setItem(KEY, current); } catch (e) { /* noop */ }
    apply();
  }

  function t(key, vars) {
    var entry = DICT[key];
    if (!entry) return key;                       // loud-ish, but never blank
    var s = entry[current] || entry.en || "";
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split("{" + k + "}").join(vars[k]);
      });
    }
    return s;
  }

  /* Field resolver for data-library objects: f(domain, 'label') */
  function f(obj, field) {
    if (!obj) return "";
    if (current === "ar" && obj[field + "_ar"]) return obj[field + "_ar"];
    return obj[field] || "";
  }

  /* Array resolver, for things like install steps */
  function fa(obj, field) {
    if (!obj) return [];
    if (current === "ar" && obj[field + "_ar"] && obj[field + "_ar"].length) return obj[field + "_ar"];
    return obj[field] || [];
  }

  current = detect();
  apply();

  return {
    lang: function () { return current; },
    isRTL: function () { return current === "ar"; },
    set: set, t: t, f: f, fa: fa
  };
})();

FORGE.t = FORGE.i18n.t;
FORGE.f = FORGE.i18n.f;
FORGE.fa = FORGE.i18n.fa;
