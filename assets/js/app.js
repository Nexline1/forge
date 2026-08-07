/* =============================================================================
   CONTROLLER
   Owns the step index, the transitions, and every event on the page.
   ============================================================================= */

(function () {
  var flow = FORGE.flow, ui = FORGE.ui;

  var stage = document.getElementById("stage");
  var bar = document.getElementById("actionbar");
  var nextBtn = document.getElementById("nextBtn");
  var nextLabel = document.getElementById("nextLabel");
  var backBtn = document.getElementById("backBtn");
  var hint = document.getElementById("actionHint");
  var progress = document.getElementById("progress");
  var progressBar = document.getElementById("progressBar");
  var counter = document.getElementById("counter");
  var counterNow = document.getElementById("counterNow");
  var counterAll = document.getElementById("counterAll");
  var restartBtn = document.getElementById("restartBtn");
  var toastEl = document.getElementById("toast");

  var steps = [];
  var idx = 0;
  var promptText = "";   // the composed prompt, before their edits
  var edited = null;     // their edited version, if any
  var toastTimer = null;
  var advanceTimer = null;

  /* ---------- utilities -------------------------------------------------- */

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  }

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function questionSteps() {
    return steps.filter(function (s) {
      return ["single", "multi", "fields"].indexOf(s.type) !== -1;
    });
  }

  /* Predict the finished length so the bar doesn't lurch as steps appear. */
  function predictedTotal() {
    var a = flow.answers();
    var n = 8; // domain, task, tool, access, format, traits, guards, about
    var t = FORGE.toolById(a.tool);
    if (!t) {
      n += 1;
    } else {
      if (t.vendor === "claude") n += 1;
      if (["claude-code", "claude-app", "chatgpt", "gemini"].indexOf(t.id) !== -1) n += 1;
    }
    n += a.format ? flow.activeClarifiers().length : FORGE.MAX_CLARIFIERS;
    return n;
  }

  /* ---------- render ----------------------------------------------------- */

  function render() {
    steps = flow.buildSteps();
    if (idx >= steps.length) idx = steps.length - 1;
    if (idx < 0) idx = 0;

    var step = steps[idx];
    var a = flow.answers();

    if (step.type === "gate" || step.type === "result") {
      if (!promptText) promptText = FORGE.compose.build(a);
    }

    var html;
    switch (step.type) {
      case "intro":  html = ui.intro(); break;
      case "single": html = ui.single(step, a); break;
      case "multi":  html = ui.multi(step, a); break;
      case "fields": html = ui.fields(step, a); break;
      case "gate":   html = ui.gate(a, promptText); break;
      case "result": html = ui.result(a, edited != null ? edited : promptText); break;
    }
    stage.innerHTML = html;
    chrome(step);
    window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
    stage.focus({ preventScroll: true });
    bindScreen(step);
  }

  function chrome(step) {
    var isQuestion = ["single", "multi", "fields"].indexOf(step.type) !== -1;
    var showChrome = step.type !== "intro";

    bar.hidden = !isQuestion;
    progress.hidden = !showChrome;
    counter.hidden = !isQuestion;
    restartBtn.hidden = !showChrome;

    if (isQuestion) {
      var qs = questionSteps();
      var pos = qs.indexOf(step) + 1;
      var total = Math.max(predictedTotal(), qs.length);
      counterNow.textContent = pad(pos);
      counterAll.textContent = pad(total);
      progressBar.style.width = ((pos - 1) / total * 100) + "%";

      backBtn.disabled = idx <= 1;
      var last = idx === steps.length - 3; // about → gate → result
      nextLabel.textContent = last ? "See my prompt" : "Continue";
      nextBtn.disabled = !flow.isAnswered(step);

      hint.innerHTML = step.type === "single"
        ? 'Press <kbd>1</kbd>–<kbd>9</kbd> to choose'
        : step.type === "multi"
          ? 'Pick as many as apply'
          : 'All optional — skip anything';
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

    if (step.type === "single" || step.type === "multi") {
      stage.querySelectorAll(".opt").forEach(function (el) {
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
    if (step.type === "single") {
      flow.setSingle(step, optId);
      render();
      // Auto-advance keeps a 12-screen form feeling like a 6-screen one.
      // Not when they picked "other" — that needs a text answer first.
      var needsText = step.otherFor && optId === step.otherFor;
      if (!needsText) {
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(function () { go(idx + 1); }, 240);
      }
    } else {
      var r = flow.toggleMulti(step, optId);
      if (r && r.full) { toast("That's the maximum — deselect one first."); return; }
      render();
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
        err.textContent = "That doesn't look like a working email address.";
        email.focus();
        return;
      }
      err.textContent = "";
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Unlocking';

      FORGE.lead
        .submit(v, consent ? consent.checked : false, FORGE.compose.leadMeta(flow.answers()))
        .then(function () {
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
        toast(ok ? "Copied — paste it into " + (FORGE.toolById(flow.answers().tool) || {}).label : "Couldn't copy — select it and copy manually");
      });
    });

    document.getElementById("dlBtn").addEventListener("click", function () {
      download(FORGE.compose.title(flow.answers()) + ".md", box.value);
      toast("Downloaded");
    });

    document.getElementById("revertBtn").addEventListener("click", function () {
      box.value = promptText;
      edited = null;
      toast("Back to the original");
    });

    document.getElementById("againBtn").addEventListener("click", function () {
      flow.reset();
      promptText = ""; edited = null; idx = 0;
      render();
    });
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
    // Recompose whenever we re-enter the tail, so edits upstream take effect.
    if (target.type === "gate" || target.type === "result") {
      promptText = FORGE.compose.build(flow.answers());
      if (edited != null) edited = null;
    }
    idx = n;
    render();
  }

  /* ---------- global events ---------------------------------------------- */

  nextBtn.addEventListener("click", function () {
    var step = steps[idx];
    if (!flow.isAnswered(step)) return;
    // Skip the gate for anyone who already unlocked in a previous session.
    var n = idx + 1;
    if (steps[n] && steps[n].type === "gate" && FORGE.lead.alreadyUnlocked()) n += 1;
    go(n);
  });

  backBtn.addEventListener("click", function () {
    var n = idx - 1;
    if (steps[n] && steps[n].type === "gate") n -= 1;
    go(Math.max(1, n));
  });

  restartBtn.addEventListener("click", function () {
    if (!confirm("Start over? Your answers will be cleared.")) return;
    flow.reset();
    promptText = ""; edited = null; idx = 0;
    render();
  });

  document.addEventListener("keydown", function (e) {
    var step = steps[idx];
    if (!step) return;
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);

    if (e.key === "Enter" && !e.shiftKey) {
      if (step.type === "intro") { e.preventDefault(); go(1); return; }
      if (step.type === "fields" && document.activeElement.tagName === "TEXTAREA") return;
      if (["single", "multi", "fields"].indexOf(step.type) !== -1 && flow.isAnswered(step)) {
        e.preventDefault();
        nextBtn.click();
      }
      return;
    }

    if (typing) return;

    if (/^[1-9]$/.test(e.key) && (step.type === "single" || step.type === "multi")) {
      var i = parseInt(e.key, 10) - 1;
      var opt = step.options[i];
      if (opt) { e.preventDefault(); choose(step, opt.id); }
    }
  });

  /* ---------- boot -------------------------------------------------------- */

  if (flow.load()) {
    steps = flow.buildSteps();
    // Drop them back on the first unanswered question rather than the start.
    var resume = 1;
    for (var i = 1; i < steps.length; i++) {
      var s = steps[i];
      if (["single", "multi", "fields"].indexOf(s.type) === -1) break;
      if (!flow.isAnswered(s)) { resume = i; break; }
      resume = i + 1;
    }
    // Someone who already gave us their email shouldn't be asked for it twice.
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
