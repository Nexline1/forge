/* =============================================================================
   CONTROLLER
   Owns the step index, transitions, and every event on the page.
   ============================================================================= */

(function () {
  var flow = FORGE.flow, ui = FORGE.ui, T = FORGE.t;

  var stage = document.getElementById("stage");
  var bar = document.getElementById("actionbar");
  var nextBtn = document.getElementById("nextBtn");
  var nextLabel = document.getElementById("nextLabel");
  var backBtn = document.getElementById("backBtn");
  var backLabel = document.getElementById("backLabel");
  var skipBtn = document.getElementById("skipBtn");
  var progress = document.getElementById("progress");
  var progressBar = document.getElementById("progressBar");
  var counter = document.getElementById("counter");
  var counterNow = document.getElementById("counterNow");
  var counterAll = document.getElementById("counterAll");
  var restartBtn = document.getElementById("restartBtn");
  var langBtn = document.getElementById("langBtn");
  var toastEl = document.getElementById("toast");

  var TOTAL = 5;
  var steps = [];
  var idx = 0;
  var promptText = "";
  var edited = null;
  var toastTimer = null;
  var advanceTimer = null;

  /* ---------- utilities -------------------------------------------------- */

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2600);
  }

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function recompose() {
    promptText = FORGE.compose.build(flow.answers());
    return promptText;
  }

  /* ---------- render ----------------------------------------------------- */

  function render() {
    steps = flow.buildSteps();
    if (idx >= steps.length) idx = steps.length - 1;
    if (idx < 0) idx = 0;

    var step = steps[idx];
    var a = flow.answers();

    if (step.type === "gate" || step.type === "result") {
      if (!promptText) recompose();
    }

    var html;
    switch (step.type) {
      case "intro":  html = ui.intro(); break;
      case "single": html = ui.single(step, a); break;
      case "fields": html = ui.fields(step, a); break;
      case "gate":   html = ui.gate(a, promptText); break;
      case "result": html = ui.result(a, edited != null ? edited : promptText); break;
    }
    stage.innerHTML = html;
    chrome(step);
    window.scrollTo(0, 0);
    stage.focus({ preventScroll: true });
    bindScreen(step);
  }

  function chrome(step) {
    var isQuestion = ["single", "fields"].indexOf(step.type) !== -1;
    var showChrome = step.type !== "intro";

    bar.hidden = !isQuestion;
    progress.hidden = !showChrome;
    counter.hidden = !isQuestion;
    restartBtn.hidden = !showChrome;

    backLabel.textContent = T("back");
    restartBtn.textContent = T("startOver");
    document.getElementById("lockupBy").textContent = T("by");

    if (isQuestion) {
      counterNow.textContent = pad(step.n);
      counterAll.textContent = pad(TOTAL);
      progressBar.style.width = ((step.n - 1) / TOTAL * 100) + "%";

      backBtn.disabled = idx <= 1;
      nextLabel.textContent = step.n === TOTAL ? T("seePrompt") : T("continue");
      nextBtn.disabled = !flow.isAnswered(step);

      // Escape hatch from question 2 onward.
      skipBtn.hidden = step.n < 2 || step.n === TOTAL;
      skipBtn.textContent = T("buildNow");
    } else if (showChrome) {
      progressBar.style.width = step.type === "result" ? "100%" : "94%";
    }
  }

  /* ---------- per-screen wiring ------------------------------------------ */

  function bindScreen(step) {
    if (step.type === "intro") {
      var s = document.getElementById("startBtn");
      if (s) s.addEventListener("click", function () { go(1); });
      return;
    }

    if (step.type === "single") {
      stage.querySelectorAll(".tile").forEach(function (el) {
        el.addEventListener("click", function () { choose(step, el.dataset.opt); });
      });
      var other = document.getElementById("otherInput");
      if (other) {
        other.addEventListener("input", function () {
          flow.setOther(step.otherKey, other.value);
          nextBtn.disabled = !flow.isAnswered(step);
        });
        other.focus();
      }
      return;
    }

    if (step.type === "fields") {
      stage.querySelectorAll("[data-field]").forEach(function (el) {
        el.addEventListener("input", function () { flow.setField(el.dataset.field, el.value); });
      });
      return;
    }

    if (step.type === "gate") { bindGate(); return; }
    if (step.type === "result") { bindResult(); return; }
  }

  function choose(step, optId) {
    flow.setSingle(step, optId);
    render();
    var needsText = step.otherFor && optId === step.otherFor;
    if (!needsText) {
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(function () { go(idx + 1); }, 220);
    }
  }

  function bindGate() {
    var form = document.getElementById("gateForm");
    var email = document.getElementById("emailInput");
    var consent = document.getElementById("consentInput");
    var err = document.getElementById("gateErr");
    var btn = document.getElementById("unlockBtn");
    email.focus();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = email.value.trim();
      if (!FORGE.lead.validEmail(v)) {
        err.textContent = T("badEmail");
        email.focus();
        return;
      }
      err.textContent = "";
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> ' + ui.esc(T("unlocking"));

      var meta = FORGE.compose.leadMeta(flow.answers());
      meta.lang = FORGE.i18n.lang();

      FORGE.lead.submit(v, consent ? consent.checked : false, meta).then(function () {
        FORGE.lead.markUnlocked(v);
        flow.answers().unlocked = true;
        flow.save();
        go(idx + 1);
      });
    });
  }

  function bindResult() {
    var box = document.getElementById("promptBox");
    box.addEventListener("input", function () { edited = box.value; });

    document.getElementById("copyBtn").addEventListener("click", function () {
      copy(box.value).then(function (ok) {
        // Peak goodwill: they just got the thing they came for.
        toast(ok ? T("copyNudge") : T("copyFail"));
      });
    });

    document.getElementById("dlBtn").addEventListener("click", function () {
      download(FORGE.compose.title(flow.answers()) + ".md", box.value);
      toast(T("downloaded"));
    });

    document.getElementById("revertBtn").addEventListener("click", function () {
      box.value = recompose();
      edited = null;
      toast(T("reverted"));
    });

    document.getElementById("againBtn").addEventListener("click", function () {
      flow.reset();
      promptText = ""; edited = null; idx = 0;
      render();
    });

    /* --- refine panel --- */
    var panel = document.getElementById("refine");
    var refineBtn = document.getElementById("refineBtn");

    function openRefine(force) {
      panel.hidden = force ? false : !panel.hidden;
      refineBtn.textContent = panel.hidden ? T("refineOpen") : T("refineClose");
      refineBtn.classList.toggle("is-done", !panel.hidden);
      if (!panel.hidden) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    refineBtn.addEventListener("click", function () { openRefine(false); });

    var nudgeBtn = document.getElementById("nudgeBtn");
    if (nudgeBtn) nudgeBtn.addEventListener("click", function () { openRefine(true); });

    panel.querySelectorAll(".rchip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var key = chip.dataset.rkey, val = chip.dataset.rval;
        if (chip.dataset.rmulti === "1") {
          var max = key === "traits" ? 5 : 0;
          var r = flow.refineToggle(key, val, max);
          if (r && r.full) { toast(T("maxPicked")); return; }
        } else {
          flow.refineSingle(key, val);
        }
        refresh();
      });
    });

    var always = document.getElementById("alwaysInput");
    if (always) {
      always.addEventListener("input", function () {
        flow.setField("always", always.value);
        refresh(true);
      });
    }

    /* Repaint the chips + prompt without losing panel state or focus. */
    function refresh(textOnly) {
      edited = null;
      var text = recompose();
      box.value = text;
      if (textOnly) return;
      var a = flow.answers();
      panel.querySelectorAll(".rchip").forEach(function (c) {
        var key = c.dataset.rkey, val = c.dataset.rval;
        var on = c.dataset.rmulti === "1"
          ? (a[key] || []).indexOf(val) !== -1
          : a[key] === val;
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
  }

  /* ---------- actions ---------------------------------------------------- */

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; })
        .catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:-9999px";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function download(name, text) {
    var blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function go(n) {
    clearTimeout(advanceTimer);
    var target = steps[n];
    if (!target) return;
    if (target.type === "gate" || target.type === "result") {
      recompose();
      edited = null;
    }
    idx = n;
    render();
  }

  /* ---------- global events ---------------------------------------------- */

  nextBtn.addEventListener("click", function () {
    var step = steps[idx];
    if (!flow.isAnswered(step)) return;
    var n = idx + 1;
    if (steps[n] && steps[n].type === "gate" && FORGE.lead.alreadyUnlocked()) n += 1;
    go(n);
  });

  backBtn.addEventListener("click", function () {
    var n = idx - 1;
    if (steps[n] && steps[n].type === "gate") n -= 1;
    go(Math.max(1, n));
  });

  skipBtn.addEventListener("click", function () {
    flow.fillRemaining();
    steps = flow.buildSteps();
    var gateIdx = steps.findIndex(function (s) { return s.type === "gate"; });
    if (gateIdx === -1) return;
    if (FORGE.lead.alreadyUnlocked()) gateIdx += 1;
    go(gateIdx);
  });

  /* Two-step inline confirm instead of a native confirm() dialog.
     Browsers suppress repeated dialogs — once the visitor ticks "prevent this
     page from creating additional dialogs", confirm() silently returns false
     and the button appears dead. An inline confirm can't be suppressed. */
  var restartArmed = null;
  function disarmRestart() {
    clearTimeout(restartArmed);
    restartArmed = null;
    restartBtn.textContent = T("startOver");
    restartBtn.classList.remove("is-armed");
  }
  restartBtn.addEventListener("click", function () {
    if (!restartArmed) {
      restartBtn.textContent = T("restartConfirm");
      restartBtn.classList.add("is-armed");
      restartArmed = setTimeout(disarmRestart, 3000);
      return;
    }
    disarmRestart();
    // A real start-over forgets the email too, or the gate is skipped on the
    // way back through and it doesn't feel like starting over at all.
    flow.reset();
    try { localStorage.removeItem("forge_unlocked_v1"); } catch (e) { /* noop */ }
    promptText = ""; edited = null; idx = 0;
    render();
  });

  langBtn.addEventListener("click", function () {
    FORGE.i18n.set(FORGE.i18n.lang() === "ar" ? "en" : "ar");
    syncLangBtn();
    flow.applyDefaults();          // bilingual trait follows the interface
    promptText = ""; edited = null;
    render();
  });

  function syncLangBtn() {
    // Always shows the language you'd switch TO.
    langBtn.textContent = FORGE.i18n.lang() === "ar" ? "EN" : "عربي";
    langBtn.setAttribute("aria-label",
      FORGE.i18n.lang() === "ar" ? "Switch to English" : "التبديل إلى العربية");
  }

  document.addEventListener("keydown", function (e) {
    var step = steps[idx];
    if (!step) return;
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);

    if (e.key === "Enter" && !e.shiftKey) {
      if (step.type === "intro") { e.preventDefault(); go(1); return; }
      if (step.type === "fields" && document.activeElement.tagName === "TEXTAREA") return;
      if (["single", "fields"].indexOf(step.type) !== -1 && flow.isAnswered(step)) {
        e.preventDefault();
        nextBtn.click();
      }
      return;
    }

    if (typing) return;

    if (/^[1-9]$/.test(e.key) && step.type === "single") {
      var opt = step.options[parseInt(e.key, 10) - 1];
      if (opt) { e.preventDefault(); choose(step, opt.id); }
    }
  });

  /* ---------- boot -------------------------------------------------------- */

  // ?reset=1 — wipes the session AND the "already gave us their email" flag.
  // Returning visitors deliberately skip the gate, which makes it look like the
  // gate is gone when you re-test on your own machine. This is how you see it
  // again without clearing site data by hand.
  if (/[?&]reset=1\b/.test(location.search)) {
    flow.reset();
    try { localStorage.removeItem("forge_unlocked_v1"); } catch (e) { /* noop */ }
    history.replaceState(null, "", location.pathname);
  }

  syncLangBtn();

  if (flow.load()) {
    steps = flow.buildSteps();
    var resume = 1;
    for (var i = 1; i < steps.length; i++) {
      var s = steps[i];
      if (["single", "fields"].indexOf(s.type) === -1) break;
      if (!flow.isAnswered(s)) { resume = i; break; }
      resume = i + 1;
    }
    if (steps[resume] && steps[resume].type === "gate" && FORGE.lead.alreadyUnlocked()) resume += 1;
    idx = 0;
    render();
    if (resume > 1) {
      var target = resume;
      setTimeout(function () { go(target); }, 40);
    }
  } else {
    render();
  }
})();
