/* =============================================================================
   RENDER LAYER
   Every screen is a pure function from state to HTML. app.js owns transitions
   and event wiring. All copy goes through FORGE.t() / FORGE.f().
   ============================================================================= */

window.FORGE = window.FORGE || {};

FORGE.ui = (function () {

  var T = function (k, v) { return FORGE.t(k, v); };
  var F = function (o, f) { return FORGE.f(o, f); };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  var CHECK = '<svg viewBox="0 0 12 10" width="10" height="8" aria-hidden="true">' +
    '<path d="M1 5l3.2 3.2L11 1.5" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- shared ----------------------------------------------------- */

  function head(step) {
    return (step.n ? '<p class="eyebrow">' + step.n + ' ' + esc(T("of")) + ' 5</p>' : '') +
      '<h1 class="q">' + step.question + '</h1>' +
      (step.help ? '<p class="q-help">' + esc(step.help) + '</p>' : '');
  }

  /* Compact tile. Label only unless the option carries a description —
     the whole point is that a grid of short labels is scanned, not read. */
  function tile(o, on) {
    var desc = F(o, "desc");
    return '<button type="button" class="tile' + (on ? ' is-on' : '') +
      (desc ? ' tile--desc' : '') + '" data-opt="' + esc(o.id) + '" ' +
      'role="radio" aria-checked="' + (on ? 'true' : 'false') + '">' +
      '<span class="tile__label">' + esc(F(o, "label")) + '</span>' +
      (desc ? '<span class="tile__desc">' + esc(desc) + '</span>' : '') +
      '<span class="tile__tick" aria-hidden="true">' + CHECK + '</span>' +
      '</button>';
  }

  /* ---------- screens ---------------------------------------------------- */

  function intro() {
    return '<section class="screen hero">' +
      '<span class="hero__tag"><i></i> ' + esc(T("heroTag")) + '</span>' +
      '<h1 class="hero__title">' + T("heroTitle") + '</h1>' +
      '<p class="hero__lead">' + esc(T("heroLead")) + '</p>' +
      '<div class="hero__cta">' +
      '<button class="btn btn--primary btn--lg" id="startBtn" type="button">' + esc(T("heroCta")) +
      '<svg class="arrow" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>' +
      '<span class="hero__meta">' + esc(T("heroMeta")) + '</span>' +
      '</div>' +
      '<ul class="hero__proof">' +
      '<li>' + esc(T("proof1t")) + '</li>' +
      '<li>' + esc(T("proof2t")) + '</li>' +
      '<li>' + esc(T("proof3t")) + '</li>' +
      '</ul></section>';
  }

  function single(step, a) {
    var current = a[step.key];
    var html = '<section class="screen">' + head(step) +
      '<div class="tiles' + (step.wide ? ' tiles--wide' : '') + '" role="radiogroup">' +
      step.options.map(function (o) { return tile(o, current === o.id); }).join("") +
      '</div>';

    if (step.otherFor && current === step.otherFor) {
      html += '<div class="opt-other"><input class="textinput" id="otherInput" ' +
        'placeholder="' + esc(step.otherLabel) + '" value="' + esc(a[step.otherKey] || "") + '" ' +
        'aria-label="' + esc(step.otherLabel) + '"></div>';
    }
    return html + '<div class="actionbar-space"></div></section>';
  }

  function fields(step, a) {
    return '<section class="screen">' + head(step) +
      '<div class="fields">' +
      step.fields.map(function (f) {
        var v = esc((a.about || {})[f.key] || "");
        return '<textarea class="textarea" data-field="' + f.key + '" id="f_' + f.key +
          '" placeholder="' + esc(f.ph) + '" aria-label="' + esc(f.ph) + '">' + v + '</textarea>';
      }).join("") +
      '</div><div class="actionbar-space"></div></section>';
  }

  function gate(a, promptText) {
    var preview = promptText.split("\n").slice(0, 18).join("\n");
    var lines = promptText.split("\n").length;
    var words = promptText.split(/\s+/).filter(Boolean).length;
    var toolName = F(FORGE.toolById(a.tool) || {}, "label");

    return '<section class="screen screen--wide">' +
      '<p class="eyebrow">' + esc(T("gateEyebrow")) + '</p>' +
      '<h1 class="q">' + T("gateTitle") + '</h1>' +
      '<p class="q-help">' + esc(T("gateLead", { lines: lines, words: words, tool: toolName })) + '</p>' +

      '<div class="paper gate">' +
      '<div class="paper__head"><span class="paper__title"><span class="paper__dot"></span>' +
      esc(FORGE.compose.title(a)) + '.md</span></div>' +
      '<pre class="promptbox">' + esc(preview) + '</pre>' +
      '<div class="gate__fade"></div>' +
      '</div>' +

      '<div class="gatecard">' +
      '<div class="gatecard__t">' + esc(T("gateAsk")) + '</div>' +
      '<p class="gatecard__s">' + esc(T("gateSub")) + '</p>' +
      '<form id="gateForm" novalidate>' +
      '<input class="textinput" type="email" id="emailInput" inputmode="email" autocomplete="email" ' +
      'placeholder="' + esc(T("emailPh")) + '" aria-label="' + esc(T("gateAsk")) + '" required>' +
      (FORGE_CONFIG.askConsent
        ? '<label class="check"><input type="checkbox" id="consentInput"> ' + esc(T("consent")) + '</label>'
        : '') +
      '<p class="errline" id="gateErr" role="alert"></p>' +
      '<button class="btn btn--primary btn--block btn--lg" type="submit" id="unlockBtn">' + esc(T("unlock")) + '</button>' +
      '</form>' +
      '<p class="fineprint">' + esc(T("fineprint")) + '</p>' +
      '</div>' +
      '<p class="gate__community">' + esc(T("gateCommunity")) + '</p>' +
      '</section>';
  }

  /* ---------- refine panel ------------------------------------------------ */

  function chipRow(label, key, list, selected, multi) {
    return '<div class="rrow">' +
      '<div class="rrow__t">' + esc(label) + '</div>' +
      '<div class="rrow__chips">' +
      list.map(function (o) {
        var on = multi ? selected.indexOf(o.id) !== -1 : selected === o.id;
        return '<button type="button" class="rchip' + (on ? ' is-on' : '') + '" ' +
          'data-rkey="' + esc(key) + '" data-rval="' + esc(o.id) + '" ' +
          'data-rmulti="' + (multi ? "1" : "0") + '" aria-pressed="' + (on ? 'true' : 'false') + '" ' +
          'title="' + esc(F(o, "desc")) + '">' + esc(F(o, "label")) + '</button>';
      }).join("") +
      '</div></div>';
  }

  function refinePanel(a) {
    return '<div class="refine" id="refine" hidden>' +
      '<p class="refine__lead">' + esc(T("refineLead")) + '</p>' +
      chipRow(T("rFormat"), "format", FORGE.FORMATS, a.format, false) +
      chipRow(T("rTone"), "traits", FORGE.TRAITS, a.traits || [], true) +
      chipRow(T("rTools"), "tools", FORGE.TOOLACCESS, a.tools || [], true) +
      chipRow(T("rGuards"), "guards", FORGE.GUARDRAILS, a.guards || [], true) +
      chipRow(T("rPlan"), "plan", FORGE.PLANS, a.plan, false) +
      '<div class="rrow"><div class="rrow__t">' + esc(T("rAlways")) + '</div>' +
      '<textarea class="textarea textarea--sm" id="alwaysInput" placeholder="' +
      esc(T("rAlwaysPh")) + '">' + esc((a.about || {}).always || "") + '</textarea></div>' +
      '</div>';
  }

  /* One quiet line naming the single change that would most improve this
     prompt. Deliberately one sentence — the page is meant to be scanned. */
  function nudgeLine(a) {
    var s = FORGE.compose.suggest(a);
    if (!s) return "";
    var text = s.text || T("nudge" + s.key.charAt(0).toUpperCase() + s.key.slice(1));
    if (!text) return "";
    return '<p class="nudge"><span class="nudge__dot"></span>' + esc(text) +
      ' <button type="button" class="nudge__cta" id="nudgeBtn">' + esc(T("nudgeCta")) + '</button></p>';
  }

  /* ---------- result ------------------------------------------------------ */

  function result(a, promptText) {
    var tool = FORGE.toolById(a.tool) || { label: "your tool", install: [], tips: [] };
    var toolName = F(tool, "label");
    var model = FORGE.CLAUDE_MODELS.find(function (m) { return m.id === a.model; });
    var plan = FORGE.PLANS.find(function (p) { return p.id === a.plan; });
    var chips = FORGE.compose.summary(a);
    var skool = FORGE.lead.skoolUrl();

    var notes = [];
    if (model && F(model, "note")) notes.push(F(model, "note"));
    if (plan && F(plan, "note")) notes.push(F(plan, "note"));
    FORGE.fa(tool, "tips").forEach(function (t) { notes.push(t); });

    var bullets = (FORGE_CONFIG.skoolBullets || []).map(function (b) {
      return '<li>' + esc(FORGE.i18n.lang() === "ar" && b.ar ? b.ar : b.en) + '</li>';
    }).join("");

    return '<section class="screen screen--wide">' +
      '<p class="eyebrow">' + esc(T("doneEyebrow")) + '</p>' +
      '<h1 class="q">' + T("resultTitle") + '</h1>' +
      '<div class="chips">' + chips.map(function (c) {
        return '<span class="chip">' + esc(c.k) + ' <b>' + esc(c.v) + '</b></span>';
      }).join("") + '</div>' +

      '<div class="paper">' +
      '<div class="paper__head">' +
      '<span class="paper__title"><span class="paper__dot"></span>' + esc(FORGE.compose.title(a)) + '.md</span>' +
      '<span class="paper__tools">' +
      '<button class="btn btn--quiet" id="copyBtn" type="button">' + esc(T("copy")) + '</button>' +
      '<button class="btn btn--quiet" id="dlBtn" type="button">' + esc(T("download")) + '</button>' +
      '<button class="btn btn--quiet" id="revertBtn" type="button">' + esc(T("resetEdits")) + '</button>' +
      '</span></div>' +
      '<textarea class="promptbox" id="promptBox" spellcheck="false" dir="ltr" aria-label="system prompt">' +
      esc(promptText) + '</textarea>' +
      '</div>' +

      nudgeLine(a) +

      '<div class="refinebar">' +
      '<button class="btn btn--quiet" id="refineBtn" type="button">' + esc(T("refineOpen")) + '</button>' +
      '</div>' +
      refinePanel(a) +

      (FORGE.i18n.lang() === "ar"
        ? '<div class="langnote"><div class="langnote__t">' + esc(T("langNoteT")) + '</div>' +
          '<p>' + esc(T("langNoteB")) + '</p></div>'
        : '') +

      '<div class="howto">' +
      '<div class="howto__t">' + esc(T("howTo", { tool: toolName })) + '</div>' +
      '<div class="steps">' +
      FORGE.fa(tool, "install").map(function (s) { return '<div class="step"><span>' + s + '</span></div>'; }).join("") +
      '</div>' +
      (notes.length
        ? '<div class="howto__t" style="margin-top:28px">' + esc(T("worthKnowing")) + '</div>' +
          '<div class="steps steps--notes">' +
          notes.map(function (n) { return '<div class="step"><span>' + n + '</span></div>'; }).join("") +
          '</div>'
        : '') +
      '</div>' +

      '<div class="handoff">' +
      '<div class="handoff__mascot"><img src="assets/img/aibh-mascot.png" alt="" width="52" height="52"></div>' +
      '<h2 class="handoff__t">' + T("handoffT") + '</h2>' +
      (bullets ? '<ul class="handoff__list">' + bullets + '</ul>' : '') +
      (skool
        ? '<a class="btn btn--primary btn--lg" href="' + esc(skool) + '" target="_blank" rel="noopener">' +
          esc(T("handoffCta", { name: FORGE_CONFIG.skoolName })) + '</a>'
        : '<button class="btn btn--primary btn--lg" type="button" disabled>' + esc(T("linkMissing")) + '</button>') +
      '<p class="handoff__note">' + esc(T("handoffNote")) + '</p>' +
      '</div>' +

      '<div class="againwrap">' +
      '<button class="btn btn--ghost" id="againBtn" type="button">' + esc(T("buildAnother")) + '</button>' +
      '</div>' +
      '</section>';
  }

  return {
    esc: esc, intro: intro, single: single, fields: fields,
    gate: gate, result: result
  };
})();
