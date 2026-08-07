/* =============================================================================
   FLOW ENGINE
   Builds the question sequence from the answers so far. The sequence is
   recomputed on every change, so choosing "Finance" genuinely changes what
   comes next rather than just relabelling it.
   ============================================================================= */

window.FORGE = window.FORGE || {};

FORGE.flow = (function () {

  var STORE_KEY = "forge_session_v1";

  var answers = {
    domain: null, domainOther: "",
    task: null,
    tool: null, toolAgentic: false,
    model: null,
    plan: null,
    tools: [],
    format: null,
    traits: [],
    guards: [],
    clarifiers: {},          // { clarifierId: optionId }
    about: { name: "", org: "", serves: "", always: "" },
    unlocked: false
  };

  /* ---------- helpers --------------------------------------------------- */

  function domain() { return FORGE.domainById(answers.domain); }
  function tool() { return FORGE.toolById(answers.tool); }

  function taskOptions() {
    var d = domain();
    if (!d) return [];
    return d.tasks.map(function (id) {
      var t = FORGE.TASKS[id];
      return { id: id, label: t.label, desc: t.desc };
    });
  }

  /* Which clarifiers apply, highest priority first, capped. */
  function activeClarifiers() {
    return FORGE.CLARIFIERS
      .filter(function (c) { return c.when(answers); })
      .sort(function (a, b) { return b.priority - a.priority; })
      .slice(0, FORGE.MAX_CLARIFIERS);
  }

  /* ---------- step construction ----------------------------------------- */

  function buildSteps() {
    var steps = [{ id: "intro", type: "intro" }];
    var t = tool();

    steps.push({
      id: "domain", type: "single", key: "domain",
      eyebrow: "Your work",
      question: "What is this assistant <em>for</em>?",
      help: "Pick the closest. It sets the vocabulary, the standards and the failure modes it's told to watch for.",
      options: FORGE.DOMAINS.map(function (d) {
        return { id: d.id, label: d.label, desc: d.desc };
      }),
      twoUp: true,
      otherFor: "other",
      otherKey: "domainOther",
      otherLabel: "What's the field or role?"
    });

    if (answers.domain) {
      steps.push({
        id: "task", type: "single", key: "task",
        eyebrow: "The job",
        question: "What should it actually <em>do</em>?",
        help: "One job. A prompt that covers two jobs does neither of them properly — build a second one for the other.",
        options: taskOptions()
      });
    }

    if (answers.task) {
      steps.push({
        id: "tool", type: "single", key: "tool",
        eyebrow: "Your setup",
        question: "Where will you <em>use</em> this?",
        help: "Different tools want the prompt written differently. I'll format it for the one you pick.",
        options: FORGE.TOOLS.map(function (x) {
          return { id: x.id, label: x.label, desc: x.desc };
        })
      });
    }

    if (t && t.vendor === "claude") {
      steps.push({
        id: "model", type: "single", key: "model",
        eyebrow: "Model",
        question: "Which Claude are you using?",
        help: "Only changes the advice I give you at the end — the prompt works on all of them.",
        options: FORGE.CLAUDE_MODELS.map(function (m) {
          return { id: m.id, label: m.label, desc: m.desc };
        })
      });
    }

    // Plan is only a meaningful question on subscription products.
    if (t && ["claude-code", "claude-app", "chatgpt", "gemini"].indexOf(t.id) !== -1) {
      steps.push({
        id: "plan", type: "single", key: "plan",
        eyebrow: "Your plan",
        question: "What plan are you on?",
        help: "This genuinely changes the prompt — how economical it's told to be with your usage.",
        options: FORGE.PLANS.map(function (p) {
          return { id: p.id, label: p.label, desc: p.desc };
        })
      });
    }

    if (answers.tool) {
      steps.push({
        id: "tools", type: "multi", key: "tools",
        eyebrow: "What it can reach",
        question: "What does it have <em>access</em> to?",
        help: "Pick everything that applies. Each one adds a usage rule — this is where careless agents get their guardrails.",
        options: FORGE.TOOLACCESS.map(function (x) {
          return { id: x.id, label: x.label, desc: x.desc, exclusive: !!x.exclusive };
        }),
        twoUp: true,
        min: 1
      });

      steps.push({
        id: "format", type: "single", key: "format",
        eyebrow: "The output",
        question: "What should come <em>back</em>?",
        help: "This becomes a strict output contract, with an example skeleton it has to follow.",
        options: FORGE.FORMATS.map(function (f) {
          return { id: f.id, label: f.label, desc: f.desc };
        }),
        twoUp: true
      });

      steps.push({
        id: "traits", type: "multi", key: "traits",
        eyebrow: "How it behaves",
        question: "How should it <em>work</em>?",
        help: "Choose up to four. More than that and they start contradicting each other.",
        options: FORGE.TRAITS.map(function (x) {
          return { id: x.id, label: x.label, desc: x.desc };
        }),
        twoUp: true,
        min: 1, max: 4
      });

      steps.push({
        id: "guards", type: "multi", key: "guards",
        eyebrow: "Hard limits",
        question: "What must it <em>never</em> do?",
        help: "Optional, but this is the section people wish they'd written after something goes wrong.",
        options: FORGE.GUARDRAILS.map(function (x) {
          return { id: x.id, label: x.label, desc: x.desc };
        }),
        twoUp: true,
        min: 0
      });
    }

    if (answers.format) {
      activeClarifiers().forEach(function (c) {
        steps.push({
          id: "cl:" + c.id, type: "single", key: "clarifier:" + c.id,
          eyebrow: c.eyebrow,
          question: c.question,
          help: c.help,
          options: c.options.map(function (o) {
            return { id: o.id, label: o.label, desc: o.desc };
          })
        });
      });

      steps.push({
        id: "about", type: "fields", key: "about",
        eyebrow: "Last one",
        question: "Tell it who you are.",
        help: "All optional — but this is what stops the output sounding like it was written for nobody in particular.",
        fields: [
          { key: "name", label: "Your name and role", ph: "Ali — operations lead" },
          { key: "org", label: "Your company or product, in one line", ph: "A dental clinic in Manama with three chairs" },
          { key: "serves", label: "Who you serve", ph: "Families and expats booking routine dental care" },
          { key: "always", label: "Anything it should always know", ph: "We only take WhatsApp bookings. Insurance is never handled in chat.", area: true }
        ]
      });

      steps.push({ id: "gate", type: "gate" });
      steps.push({ id: "result", type: "result" });
    }

    return steps;
  }

  /* ---------- validation ------------------------------------------------- */

  function isAnswered(step) {
    if (!step) return false;
    switch (step.type) {
      case "intro": return true;
      case "single":
        if (step.key.indexOf("clarifier:") === 0) {
          return !!answers.clarifiers[step.key.slice(10)];
        }
        if (step.id === "domain" && answers.domain === step.otherFor) {
          return !!answers.domainOther.trim();
        }
        return !!answers[step.key];
      case "multi": {
        var n = (answers[step.key] || []).length;
        return n >= (step.min === undefined ? 1 : step.min);
      }
      case "fields": return true;   // every field optional
      default: return true;
    }
  }

  /* ---------- mutation --------------------------------------------------- */

  function setSingle(step, optionId) {
    if (step.key.indexOf("clarifier:") === 0) {
      answers.clarifiers[step.key.slice(10)] = optionId;
    } else {
      answers[step.key] = optionId;
      // Choosing a new domain invalidates the task beneath it.
      if (step.key === "domain") {
        var d = FORGE.domainById(optionId);
        if (answers.task && d && d.tasks.indexOf(answers.task) === -1) answers.task = null;
      }
      if (step.key === "tool") {
        var t = FORGE.toolById(optionId);
        answers.toolAgentic = !!(t && t.agentic);
        if (!t || t.vendor !== "claude") answers.model = null;
        if (t && t.id === "claude-api") answers.plan = "api";
      }
    }
    save();
  }

  function toggleMulti(step, optionId) {
    var list = answers[step.key] || [];
    var opt = (step.options || []).find(function (o) { return o.id === optionId; });
    var on = list.indexOf(optionId) !== -1;

    if (on) {
      list = list.filter(function (x) { return x !== optionId; });
    } else {
      if (opt && opt.exclusive) {
        list = [optionId];                                   // "no tools" clears the rest
      } else {
        list = list.filter(function (x) {
          var o = (step.options || []).find(function (z) { return z.id === x; });
          return !(o && o.exclusive);                         // any real pick clears "no tools"
        });
        if (step.max && list.length >= step.max) return { full: true };
        list = list.concat([optionId]);
      }
    }
    answers[step.key] = list;
    save();
    return {};
  }

  function setField(key, value) {
    answers.about[key] = value;
    save();
  }

  function setOther(key, value) {
    answers[key] = value;
    save();
  }

  /* ---------- persistence ------------------------------------------------ */

  function save() {
    if (!FORGE_CONFIG.persistSession) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(answers)); } catch (e) { /* private mode */ }
  }

  function load() {
    if (!FORGE_CONFIG.persistSession) return false;
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      var saved = JSON.parse(raw);
      if (!saved || !saved.domain) return false;
      Object.keys(answers).forEach(function (k) {
        if (saved[k] !== undefined) answers[k] = saved[k];
      });
      return true;
    } catch (e) { return false; }
  }

  function reset() {
    answers = {
      domain: null, domainOther: "", task: null, tool: null, toolAgentic: false,
      model: null, plan: null, tools: [], format: null, traits: [], guards: [],
      clarifiers: {}, about: { name: "", org: "", serves: "", always: "" },
      unlocked: false
    };
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* noop */ }
  }

  return {
    answers: function () { return answers; },
    buildSteps: buildSteps,
    isAnswered: isAnswered,
    setSingle: setSingle,
    toggleMulti: toggleMulti,
    setField: setField,
    setOther: setOther,
    activeClarifiers: activeClarifiers,
    load: load, save: save, reset: reset
  };
})();
