/* =============================================================================
   RENDER LAYER
   Every screen is a pure function from state to HTML. app.js owns the
   transitions and the event wiring.
   ============================================================================= */

window.FORGE = window.FORGE || {};

FORGE.ui = (function () {

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  var CHECK = '<svg viewBox="0 0 12 10" width="11" height="9" aria-hidden="true">' +
    '<path d="M1 5l3.2 3.2L11 1.5" fill="none" stroke="#fff" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- shared bits ------------------------------------------------ */

  function head(step) {
    return '<p class="eyebrow">' + esc(step.eyebrow) + '</p>' +
      '<h1 class="q">' + step.question + '</h1>' +
      (step.help ? '<p class="q-help">' + esc(step.help) + '</p>' : '');
  }

  function optionRow(o, i, on, multi) {
    var key = i < 9 ? String(i + 1) : "";
    return '<button type="button" class="opt' + (multi ? ' opt--multi' : '') +
      (on ? ' is-on' : '') + '" data-opt="' + esc(o.id) + '" ' +
      'role="' + (multi ? 'checkbox' : 'radio') + '" aria-checked="' + (on ? 'true' : 'false') + '">' +
      '<span class="opt__key" aria-hidden="true">' + key + '</span>' +
      '<span class="opt__body">' +
      '<span class="opt__title">' + esc(o.label) + '</span>' +
      (o.desc ? '<span class="opt__desc">' + esc(o.desc) + '</span>' : '') +
      '</span>' +
      '<span class="opt__mark">' + CHECK + '</span>' +
      '</button>';
  }

  /* ---------- screens ---------------------------------------------------- */

  function intro() {
    return '<section class="screen hero">' +
      '<span class="hero__tag"><i></i> Free · from the ' + esc(FORGE_CONFIG.community) + ' community</span>' +
      '<h1 class="hero__title">Stop explaining yourself to the AI <em>every single time.</em></h1>' +
      '<p class="hero__lead">Answer a few questions about your work. Walk away with a system prompt built for your job, your tools and your model — the kind you paste in once and never rewrite.</p>' +
      '<div class="hero__cta">' +
      '<button class="btn btn--primary btn--lg" id="startBtn" type="button">Build my prompt' +
      '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>' +
      '<span class="hero__meta">About two minutes. No account.</span>' +
      '</div>' +
      '<div class="hero__proof">' +
      '<div><div class="proof__n">One job</div><div class="proof__t">Built around what you actually do — not a generic "you are a helpful assistant".</div></div>' +
      '<div><div class="proof__n">Your tools</div><div class="proof__t">Formatted for Claude Code, Claude, ChatGPT, Gemini or your editor, with install steps.</div></div>' +
      '<div><div class="proof__n">Yours to edit</div><div class="proof__t">Editable, downloadable, and readable enough that you can change it later.</div></div>' +
      '</div>' +
      '</section>';
  }

  function single(step, a) {
    var current = step.key.indexOf("clarifier:") === 0
      ? a.clarifiers[step.key.slice(10)]
      : a[step.key];

    var html = '<section class="screen">' + head(step) +
      '<div class="options' + (step.twoUp ? ' options--two' : '') + '" role="radiogroup">' +
      step.options.map(function (o, i) { return optionRow(o, i, current === o.id, false); }).join("") +
      '</div>';

    if (step.otherFor && current === step.otherFor) {
      html += '<div class="opt-other"><input class="textinput" id="otherInput" ' +
        'placeholder="' + esc(step.otherLabel) + '" value="' + esc(a[step.otherKey] || "") + '" ' +
        'aria-label="' + esc(step.otherLabel) + '"></div>';
    }
    return html + '<div class="actionbar-space"></div></section>';
  }

  function multi(step, a) {
    var chosen = a[step.key] || [];
    var tally = step.max
      ? chosen.length + " of " + step.max + " selected"
      : (chosen.length ? chosen.length + " selected" : "Select everything that applies");

    return '<section class="screen">' + head(step) +
      '<div class="options' + (step.twoUp ? ' options--two' : '') + '" role="group">' +
      step.options.map(function (o, i) {
        return optionRow(o, i, chosen.indexOf(o.id) !== -1, true);
      }).join("") +
      '</div>' +
      '<p class="tally" id="tally">' + esc(tally) + '</p>' +
      '<div class="actionbar-space"></div></section>';
  }

  function fields(step, a) {
    return '<section class="screen">' + head(step) +
      '<div class="fields">' +
      step.fields.map(function (f) {
        var v = esc((a.about || {})[f.key] || "");
        var el = f.area
          ? '<textarea class="textarea" data-field="' + f.key + '" id="f_' + f.key + '" placeholder="' + esc(f.ph) + '">' + v + '</textarea>'
          : '<input class="textinput" data-field="' + f.key + '" id="f_' + f.key + '" placeholder="' + esc(f.ph) + '" value="' + v + '">';
        return '<div class="field-row"><label for="f_' + f.key + '">' + esc(f.label) +
          '<span class="optional">optional</span></label>' + el + '</div>';
      }).join("") +
      '</div><div class="actionbar-space"></div></section>';
  }

  function gate(a, promptText) {
    var preview = promptText.split("\n").slice(0, 18).join("\n");
    var lines = promptText.split("\n").length;
    var words = promptText.split(/\s+/).filter(Boolean).length;

    return '<section class="screen screen--wide">' +
      '<p class="eyebrow">Ready</p>' +
      '<h1 class="q">Your prompt is <em>built.</em></h1>' +
      '<p class="q-help">' + lines + ' lines, ' + words + ' words, written for ' +
      esc((FORGE.toolById(a.tool) || {}).label || "your tool") +
      '. Here’s the opening — tell me where to send the rest.</p>' +

      '<div class="paper gate" style="margin-top:24px">' +
      '<div class="paper__head"><span class="paper__title"><span class="paper__dot"></span>' +
      esc(FORGE.compose.title(a)) + '.md</span></div>' +
      '<pre class="promptbox">' + esc(preview) + '</pre>' +
      '<div class="gate__fade"></div>' +
      '</div>' +

      '<div class="gatecard">' +
      '<div class="gatecard__t">Where should I send it?</div>' +
      '<p class="gatecard__s">You’ll get the full prompt on the next screen — plus the setup steps for your tool.</p>' +
      '<form id="gateForm" novalidate>' +
      '<input class="textinput" type="email" id="emailInput" inputmode="email" autocomplete="email" ' +
      'placeholder="you@company.com" aria-label="Your email address" required>' +
      (FORGE_CONFIG.askConsent
        ? '<label class="check"><input type="checkbox" id="consentInput"> ' +
          'Send me the occasional thing worth reading from ' + esc(FORGE_CONFIG.community) + '. No spam, unsubscribe anytime.</label>'
        : '') +
      '<p class="errline" id="gateErr" role="alert"></p>' +
      '<button class="btn btn--primary btn--block btn--lg" type="submit" id="unlockBtn">Unlock my prompt</button>' +
      '</form>' +
      '<p class="fineprint">Your email, and nothing else. We never sell or share it.</p>' +
      '</div>' +
      '</section>';
  }

  function result(a, promptText) {
    var tool = FORGE.toolById(a.tool) || { label: "your tool", install: [], tips: [] };
    var model = FORGE.CLAUDE_MODELS.find(function (m) { return m.id === a.model; });
    var plan = FORGE.PLANS.find(function (p) { return p.id === a.plan; });
    var chips = FORGE.compose.summary(a);
    var skool = FORGE.lead.skoolUrl();

    var notes = [];
    if (model && model.note) notes.push(model.note);
    if (plan && plan.note) notes.push(plan.note);
    tool.tips.forEach(function (t) { notes.push(t); });

    return '<section class="screen screen--wide">' +
      '<p class="eyebrow">Done</p>' +
      '<h1 class="q">Here it is. <em>Edit anything</em> that doesn’t sound like you.</h1>' +
      '<div class="chips">' + chips.map(function (c) {
        return '<span class="chip">' + esc(c.k) + ' <b>' + esc(c.v) + '</b></span>';
      }).join("") + '</div>' +

      '<div class="paper" style="margin-top:24px">' +
      '<div class="paper__head">' +
      '<span class="paper__title"><span class="paper__dot"></span>' + esc(FORGE.compose.title(a)) + '.md</span>' +
      '<span class="paper__tools">' +
      '<button class="btn btn--quiet" id="copyBtn" type="button">Copy</button>' +
      '<button class="btn btn--quiet" id="dlBtn" type="button">Download</button>' +
      '<button class="btn btn--quiet" id="revertBtn" type="button">Reset edits</button>' +
      '</span></div>' +
      '<textarea class="promptbox" id="promptBox" spellcheck="false" aria-label="Your system prompt">' +
      esc(promptText) + '</textarea>' +
      '</div>' +

      '<div class="howto">' +
      '<div class="howto__t">How to use this in ' + esc(tool.label) + '</div>' +
      '<div class="steps">' +
      tool.install.map(function (s) { return '<div class="step"><span>' + s + '</span></div>'; }).join("") +
      '</div>' +
      (notes.length
        ? '<div class="howto__t" style="margin-top:28px">Worth knowing</div><div class="steps steps--notes">' +
          notes.map(function (n) { return '<div class="step"><span>' + n + '</span></div>'; }).join("") +
          '</div>'
        : '') +
      '</div>' +

      '<div class="handoff">' +
      '<div class="handoff__mascot"><img src="assets/img/aibh-mascot.png" alt="" width="52" height="52"></div>' +
      '<h2 class="handoff__t">This is the <em>easy</em> part.</h2>' +
      '<p class="handoff__s">' + esc(FORGE_CONFIG.skoolPitch) + ' Free to join — start with the intro course, then bring the prompt you just built and we\'ll sharpen it together.</p>' +
      (skool
        ? '<a class="btn btn--primary btn--lg" href="' + esc(skool) + '" target="_blank" rel="noopener">Join ' + esc(FORGE_CONFIG.skoolName) + ' — free</a>'
        : '<button class="btn btn--primary btn--lg" type="button" disabled>Community link not set yet</button>') +
      '<p class="handoff__note">Free introductory course included. No card, no pitch.</p>' +
      '</div>' +

      '<div style="margin-top:32px;text-align:center">' +
      '<button class="btn btn--ghost" id="againBtn" type="button">Build another prompt for a different job</button>' +
      '</div>' +
      '</section>';
  }

  return { esc: esc, intro: intro, single: single, multi: multi, fields: fields, gate: gate, result: result };
})();
