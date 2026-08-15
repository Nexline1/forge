/* =============================================================================
   FLOW ENGINE

   Five questions, all single-tap except the last. Everything else the composer
   needs is DERIVED by applyDefaults(), and stays editable in the Refine panel
   on the result screen.

   The prompt quality lives in the fragment library, not in the number of
   questions — so choosing well on the visitor's behalf costs almost nothing
   and saves them nine screens.
   ============================================================================= */

window.FORGE = window.FORGE || {};

FORGE.flow = (function () {

  var STORE_KEY = "forge_session_v2";

  function blank() {
    return {
      domain: null, domainOther: "",
      task: null,
      tool: null, toolAgentic: false,
      stakes: null,
      about: { blurb: "", always: "" },

      // Derived by applyDefaults(), then editable in the Refine panel.
      tools: [], format: null, traits: [], guards: [], plan: null, model: null,
      clarifiers: {},
      touched: {},          // which of the above the visitor has overridden
      unlocked: false
    };
  }

  var answers = blank();

  function domain() { return FORGE.domainById(answers.domain); }
  function tool() { return FORGE.toolById(answers.tool); }

  /* ---------- defaults --------------------------------------------------- */
  /* Chosen from what they already told us. Anything the visitor edits in the
     Refine panel is flagged in `touched` and never recomputed underneath them. */

  function applyDefaults() {
    var d = domain(), t = answers.task, tl = tool();
    if (!d || !t || !tl) return;
    var task = FORGE.TASKS[t];

    if (!answers.touched.format) {
      answers.format = task.format;                    // every task declares its own
    }

    if (!answers.touched.tools) {
      var set;
      if (t === "code" || t === "build") set = ["repo", "code", "web"];
      else if (t === "converse") set = ["files"];
      else if (t === "research") set = ["web", "files"];
      else if (t === "answer") set = ["files"];
      else if (t === "automate") set = ["files", "sheets"];
      else if (tl.agentic) set = ["repo", "code", "web"];
      else set = ["web", "files"];
      if (d.id === "data") set = set.concat(["db", "sheets"]);
      if (d.id === "finance") set = set.concat(["sheets"]);
      answers.tools = set.filter(function (x, i) { return set.indexOf(x) === i; });
    }

    if (!answers.touched.traits) {
      var tr = ["concise", "nofab"];
      if (["decide", "analyze", "research"].indexOf(t) !== -1) tr.push("recommend");
      if (["answer", "research"].indexOf(t) !== -1) tr.push("cite");
      // Not `concise` here. The chat output contract already caps replies at
      // two or three sentences, and the concise line ends with "no closing
      // pleasantries" — which directly contradicts `warm` in a customer-facing
      // conversation. Brevity is the format's job on this path.
      if (t === "converse") tr = ["warm", "nofab"];
      if (t === "teach") tr = ["teachme", "warm", "nofab"];
      if (tl.agentic) tr.push("ask");
      tr = tr.slice(0, 4);
      // Arabic UI ⇒ they work in Arabic. The prompt stays English but tells the
      // model to answer in whichever language the person writes in.
      if (FORGE.i18n.lang() === "ar" && tr.indexOf("bilingual") === -1) {
        tr = tr.slice(0, 3).concat(["bilingual"]);
      }
      answers.traits = tr;
    }

    if (!answers.touched.guards) {
      var g = ["nofacts"];
      if (["legal", "health", "finance"].indexOf(d.id) !== -1) g.push("noadvice");
      if (tl.agentic || t === "build" || t === "code") g.push("noprod");
      if (["converse", "automate"].indexOf(t) !== -1) g.push("noapprove");
      if (["hr", "legal", "health"].indexOf(d.id) !== -1) g.push("confidential");
      if (t === "converse") g.push("noscript");
      answers.guards = g.filter(function (x, i) { return g.indexOf(x) === i; });
    }

    // Infer the model rather than asking a sixth question. Claude surfaces
    // default to Opus 5; other vendors get no Claude-specific tuning at all.
    // `touched.model` stays false, which is what keeps the *subtractive*
    // tuning rules switched off until someone picks deliberately.
    if (!answers.touched.model) {
      answers.model = (tl.vendor === "claude") ? "opus" : null;
    }

    deriveClarifiers();
  }

  /* The old flow asked two of these and threw the rest away. Now every one
     whose predicate matches gets a sensible answer, so the prompt is richer
     than it was at twelve questions. `stakes` is the one we still ask. */
  function deriveClarifiers() {
    var c = answers.clarifiers || (answers.clarifiers = {});
    var t = answers.task, d = domain(), tl = tool();
    var webOn = (answers.tools || []).indexOf("web") !== -1;

    if (answers.stakes) c.stakes = answers.stakes;

    var picks = {
      sources: "mixed",
      codechange: "size",
      verify: (tl && tl.agentic) || (answers.tools || []).indexOf("code") !== -1 ? "run" : "reason",
      audience: ["marketing", "sales", "support", "realestate", "health"].indexOf(d && d.id) !== -1
        ? "customer" : "internal",
      escalate: "trigger",
      volume: "batch",
      freshness: webOn ? "recent" : "stable"
    };

    FORGE.CLARIFIERS.forEach(function (cl) {
      if (cl.id === "stakes") return;                 // asked, not derived
      if (answers.touched["cl:" + cl.id]) return;     // visitor overrode it
      if (cl.when(answers) && picks[cl.id]) c[cl.id] = picks[cl.id];
      else if (!cl.when(answers)) delete c[cl.id];
    });
  }

  /* Skip button: fill everything remaining with defaults and jump to the end. */
  function fillRemaining() {
    if (!answers.task) {
      var d = domain();
      if (d) answers.task = d.tasks[0];
    }
    if (!answers.tool) answers.tool = "other-llm";
    var tl = tool();
    answers.toolAgentic = !!(tl && tl.agentic);
    if (!answers.stakes) answers.stakes = "med";
    applyDefaults();
    save();
  }

  function taskOptions() {
    var d = domain();
    if (!d) return [];
    // Six is the most anyone should have to scan on a single-tap screen.
    return d.tasks.slice(0, 6).map(function (id) {
      var t = FORGE.TASKS[id];
      return { id: id, label: t.label, label_ar: t.label_ar, desc: t.desc, desc_ar: t.desc_ar };
    });
  }

  /* ---------- steps ------------------------------------------------------ */

  function buildSteps() {
    var steps = [{ id: "intro", type: "intro" }];
    var T = FORGE.t;

    steps.push({
      id: "domain", type: "single", key: "domain", tiles: true, n: 1,
      question: T("qWork"),
      options: FORGE.DOMAINS.map(function (d) {
        return { id: d.id, label: d.label, label_ar: d.label_ar };
      }),
      otherFor: "other", otherKey: "domainOther", otherLabel: T("otherField")
    });

    if (answers.domain) {
      steps.push({
        id: "task", type: "single", key: "task", tiles: true, wide: true, n: 2,
        question: T("qDo"),
        options: taskOptions()
      });
    }

    if (answers.task) {
      steps.push({
        id: "tool", type: "single", key: "tool", tiles: true, n: 3,
        question: T("qWhere"),
        options: FORGE.TOOLS.map(function (x) {
          return { id: x.id, label: x.label, label_ar: x.label_ar };
        })
      });
    }

    if (answers.tool) {
      steps.push({
        id: "stakes", type: "single", key: "stakes", tiles: true, wide: true, n: 4,
        question: T("qWrong"),
        options: [
          { id: "low",  label: T("stakesLow"),  desc: T("stakesLowD") },
          { id: "med",  label: T("stakesMed"),  desc: T("stakesMedD") },
          { id: "high", label: T("stakesHigh"), desc: T("stakesHighD") }
        ]
      });

      steps.push({
        id: "about", type: "fields", key: "about", n: 5,
        question: T("qYou"),
        help: T("qYouHelp"),
        fields: [{ key: "blurb", ph: T("youPh"), area: true }]
      });

      // The email gate. Honour the config flag — it existed but was ignored,
      // so turning it off silently did nothing.
      if (FORGE_CONFIG.gateEnabled !== false) steps.push({ id: "gate", type: "gate" });
      steps.push({ id: "result", type: "result" });
    }

    return steps;
  }

  /* ---------- validation ------------------------------------------------- */

  function isAnswered(step) {
    if (!step) return false;
    if (step.type === "fields") return true;                 // optional
    if (step.type === "single") {
      if (step.id === "domain" && answers.domain === step.otherFor) {
        return !!answers.domainOther.trim();
      }
      return !!answers[step.key];
    }
    return true;
  }

  /* ---------- mutation --------------------------------------------------- */

  function setSingle(step, optionId) {
    answers[step.key] = optionId;

    if (step.key === "domain") {
      var d = FORGE.domainById(optionId);
      if (answers.task && d && d.tasks.slice(0, 6).indexOf(answers.task) === -1) answers.task = null;
    }
    if (step.key === "tool") {
      var t = FORGE.toolById(optionId);
      answers.toolAgentic = !!(t && t.agentic);
    }
    applyDefaults();
    save();
  }

  function setField(key, value) { answers.about[key] = value; save(); }
  function setOther(key, value) { answers[key] = value; save(); }

  /* ---------- refine panel ----------------------------------------------- */

  function refineSingle(key, value) {
    answers[key] = value;
    answers.touched[key] = true;
    save();
  }

  function refineToggle(key, value, max) {
    var list = (answers[key] || []).slice();
    var all = key === "tools" ? FORGE.TOOLACCESS : null;
    var opt = all ? all.find(function (o) { return o.id === value; }) : null;
    var on = list.indexOf(value) !== -1;

    if (on) {
      list = list.filter(function (x) { return x !== value; });
    } else if (opt && opt.exclusive) {
      list = [value];
    } else {
      if (all) list = list.filter(function (x) {
        var o = all.find(function (z) { return z.id === x; });
        return !(o && o.exclusive);
      });
      if (max && list.length >= max) return { full: true };
      list.push(value);
    }
    answers[key] = list;
    answers.touched[key] = true;
    if (key === "tools") deriveClarifiers();       // freshness depends on web
    save();
    return {};
  }

  /* ---------- persistence ------------------------------------------------ */

  function save() {
    if (!FORGE_CONFIG.persistSession) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(answers)); } catch (e) { /* private mode */ }
  }

  function load() {
    if (!FORGE_CONFIG.persistSession) return false;
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!saved || !saved.domain) return false;
      var fresh = blank();
      Object.keys(fresh).forEach(function (k) {
        if (saved[k] !== undefined) fresh[k] = saved[k];
      });
      answers = fresh;
      // A restored session has never been through setSingle(), so the derived
      // fields (format, tools, traits, guards) are still empty — and the
      // composer returns "" without a format. Re-derive on load. Idempotent,
      // and `touched` protects anything the visitor edited.
      applyDefaults();
      return true;
    } catch (e) { return false; }
  }

  function reset() {
    answers = blank();
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* noop */ }
  }

  return {
    answers: function () { return answers; },
    buildSteps: buildSteps,
    isAnswered: isAnswered,
    setSingle: setSingle,
    setField: setField,
    setOther: setOther,
    refineSingle: refineSingle,
    refineToggle: refineToggle,
    applyDefaults: applyDefaults,
    fillRemaining: fillRemaining,
    load: load, save: save, reset: reset
  };
})();
