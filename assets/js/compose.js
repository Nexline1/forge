/* =============================================================================
   THE COMPOSER
   Answers in, production-grade system prompt out.

   Section order is deliberate: role → context → objective → method → tools →
   output → rules → never → uncertainty → priorities. Models weight the START
   of a prompt heavily, so identity and context come first; they also weight the
   END heavily, which is why the last block is a priority ordering rather than
   boilerplate.

   Every emitted line carries a source id (`trait:concise`, `tool:web:guard`…).
   That's what makes deduplication and per-model suppression possible — without
   it you can only compare strings, and near-duplicates slip through.

   LANGUAGE: the prompt is ALWAYS composed in English, whatever the interface
   language. English instructions are followed more reliably — nuance, negation
   and format contracts hold up better — and it costs the operator nothing,
   because the `bilingual` trait (auto-enabled on the Arabic UI) tells the model
   to reply in whichever language the person writes in. English prompt, Arabic
   conversation. Do not "translate" this output.
   ============================================================================= */

window.FORGE = window.FORGE || {};

FORGE.compose = (function () {

  /* Tasks whose steps genuinely happen in order. Everything else gets bullets:
     a numbered list implies a procedure, and imposing one on judgement work
     over-constrains the model for no gain. */
  var ORDERED_TASKS = ["automate", "build", "code", "converse"];

  var NEVER_CAP = 6;

  /* ---------- helpers ---------------------------------------------------- */

  function clean(s) { return (s || "").trim(); }

  function L(src, text) { return { src: src, text: clean(text) }; }

  /* Normalised so "Never do X." and "never do x" collapse. */
  function norm(s) {
    return clean(s).toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ");
  }

  /* Exact matching isn't enough. The library says some things twice in
     different words — task.automate.method[4] and format.runlog[1] both ask for
     an explicit end-of-run status, for instance — and a prompt that states the
     same rule twice reads as padding and dilutes both copies.

     Jaccard overlap on content words catches those. 0.55 was picked by
     measuring the real collisions in the library: the genuine restatements sit
     at 0.56–0.75, and distinct-but-related lines sit well below. */
  var SIMILARITY = 0.55;

  function shingle(s) {
    var out = {}, n = 0;
    norm(s).split(" ").forEach(function (w) {
      if (w.length > 3 && !out[w]) { out[w] = 1; n++; }
    });
    return { set: out, size: n };
  }

  function tooSimilar(a, b) {
    if (a.size < 5 || b.size < 5) return false;          // too short to judge
    var shared = 0;
    Object.keys(a.set).forEach(function (w) { if (b.set[w]) shared++; });
    return shared / (a.size + b.size - shared) > SIMILARITY;
  }

  function render(lines, ordered) {
    var texts = lines.map(function (l) { return l.text; }).filter(Boolean);
    if (ordered) {
      return texts.map(function (t, i) { return (i + 1) + ". " + t; }).join("\n");
    }
    return texts.map(function (t) { return "- " + t; }).join("\n");
  }

  function section(dialect, tag, heading, body) {
    if (!clean(body)) return "";
    if (dialect === "xml") return "<" + tag + ">\n" + body + "\n</" + tag + ">";
    return "## " + heading + "\n" + body;
  }

  /* ---------- inputs ----------------------------------------------------- */

  function clarifierLines(a) {
    var out = { method: [], rules: [], context: [], tools: [] };
    var picked = a.clarifiers || {};
    FORGE.CLARIFIERS.forEach(function (c) {
      var chosen = picked[c.id];
      if (!chosen) return;
      var opt = c.options.find(function (o) { return o.id === chosen; });
      if (opt && opt.line) out[c.section].push(L("clarifier:" + c.id, opt.line));
    });
    return out;
  }

  /* Contradictory traits can both be selected in the Refine panel. Resolve
     before composing, and report what was dropped so the UI can say so. */
  function resolveTraits(a) {
    var ids = (a.traits || []).slice();
    var dropped = [];
    FORGE.TRAIT_CONFLICTS.forEach(function (c) {
      if (ids.indexOf(c.keep) !== -1 && ids.indexOf(c.drop) !== -1) {
        ids = ids.filter(function (x) { return x !== c.drop; });
        dropped.push(c);
      }
    });
    return { ids: ids, dropped: dropped };
  }

  /* The model answer is inferred unless the visitor set it in Refine.
     Additive rules are safe either way; subtractive ones only fire on an
     explicit choice, because removing a rule a weaker model needed would
     quietly make the prompt worse. */
  function modelTuning(a, isAgentic) {
    var m = FORGE.CLAUDE_MODELS.find(function (x) { return x.id === a.model; });
    if (!m || !m.tuning) return { add: [], drop: [], thin: false };
    var explicit = !!(a.touched && a.touched.model);
    var add = (m.tuning.add || []).slice();
    if (isAgentic && m.tuning.agentic) add = add.concat(m.tuning.agentic);
    return {
      add: add.map(function (t, i) { return L("model:" + m.id + ":" + i, t); }),
      drop: explicit ? (m.tuning.drop || []) : [],
      thin: explicit && !!m.tuning.thin
    };
  }

  /* ---------- build ------------------------------------------------------ */

  function build(a) {
    var d = FORGE.domainById(a.domain);
    var t = FORGE.TASKS[a.task];
    var tool = FORGE.toolById(a.tool);
    var fmt = FORGE.formatById(a.format);
    if (!d || !t || !fmt) return "";

    var plan = FORGE.PLANS.find(function (p) { return p.id === a.plan; });
    var cl = clarifierLines(a);
    var dialect = tool ? tool.dialect : "markdown";
    var isAgentic = !!(tool && tool.agentic);
    var about = a.about || {};
    var isOther = d.id === "other" && clean(a.domainOther);
    var traits = resolveTraits(a);
    var tune = modelTuning(a, isAgentic);

    /* --- role --------------------------------------------------------- */
    var header = (isOther
      ? "You are an experienced " + clean(a.domainOther) + "."
      : "You are a " + d.role + ".") + " " + d.frame;

    /* --- context ------------------------------------------------------ */
    var ctx = [];
    if (clean(about.blurb)) ctx.push(L("about:blurb", "Who you work for: " + clean(about.blurb)));
    if (clean(about.always)) ctx.push(L("about:always", "Always true, and never to be contradicted: " + clean(about.always)));
    cl.context.forEach(function (l) { ctx.push(l); });
    if (!ctx.length) {
      ctx.push(L("context:empty", "The operator has not described their organisation. Ask for the context you need rather than inventing it."));
    }

    /* --- objective ---------------------------------------------------- */
    var obj = [
      L("task:job", "Your job is to " + t.job + "."),
      L("task:success", "Success looks like: " + t.success + "."),
      L("domain:success", "The wider standard you are held to: " + d.success + ".")
    ];

    /* --- method ------------------------------------------------------- */
    var method = t.method.map(function (s, i) { return L("task:method:" + i, s); });
    cl.method.forEach(function (l) { method.push(l); });
    var principles = d.focus.map(function (s, i) { return L("domain:focus:" + i, s); });

    // Fable-class models do worse with step-by-step choreography than with the
    // goal plus constraints, so an explicit pick collapses the two into one
    // principle list.
    if (tune.thin) {
      principles = method.concat(principles);
      method = [];
    }

    /* --- tools -------------------------------------------------------- */
    var toolLines = [], toolGuards = [];
    var picked = (a.tools || []).map(function (id) {
      return FORGE.TOOLACCESS.find(function (x) { return x.id === id; });
    }).filter(Boolean);
    var noTools = picked.some(function (x) { return x.exclusive; });

    if (noTools) {
      var none = picked.find(function (x) { return x.exclusive; });
      toolLines.push(L("tool:none:policy", none.policy));
      if (none.guard) toolGuards.push(L("tool:none:guard", none.guard));
    } else if (picked.length) {
      toolLines.push(L("tool:list", "You have access to: " +
        picked.map(function (x) { return x.label.toLowerCase(); }).join(", ") + "."));
      picked.forEach(function (x) {
        toolLines.push(L("tool:" + x.id + ":policy", x.policy));
        if (x.guard) toolGuards.push(L("tool:" + x.id + ":guard", x.guard));
      });
      // "Across all of them" is nonsense when there's exactly one.
      toolLines.push(L("tool:all", (picked.length > 1 ? "Across all of them: prefer" : "Prefer") +
        " using a tool to get the real answer over reasoning from memory, and never describe a tool result you did not actually receive."));
    }
    cl.tools.forEach(function (l) { toolLines.push(l); });

    /* --- output ------------------------------------------------------- */
    /* These go through dedupe with everything else: several format specs
       restate a task method step almost verbatim (runlog vs automate, report
       vs research). The skeleton below is exempt — a template is *supposed* to
       repeat the rule it illustrates. */
    var fmtSpec = fmt.spec.map(function (s, i) { return L("format:" + i, s); });

    /* --- rules -------------------------------------------------------- */
    var rules = [];
    traits.ids.forEach(function (id) {
      var x = FORGE.TRAITS.find(function (y) { return y.id === id; });
      if (x) rules.push(L("trait:" + id, x.line));
    });
    (t.rules || []).forEach(function (l, i) { rules.push(L("task:rule:" + i, l)); });
    cl.rules.forEach(function (l) { rules.push(l); });
    if (plan && clean(plan.rule)) rules.push(L("plan:" + plan.id, plan.rule));
    if (tool && tool.extras && tool.extras.indexOf("api") !== -1) {
      rules.push(L("tool:api", "These instructions are fixed across every request. Anything that varies per request — dates, user identifiers, the specific question — arrives in the conversation, not here. Never assume today's date."));
    }
    tune.add.forEach(function (l) { rules.push(l); });

    // Both of these assume a work-task framing — someone hands you a job and a
    // deliverable. A live chat agent is talking to a customer, not receiving an
    // assignment, so "if the first thing you get is only a document" and
    // "report completion only when it's done" read as noise there.
    if (a.task !== "converse") {
      rules.push(L("universal:firstTurn", FORGE.UNIVERSAL.firstTurn));
      rules.push(L("universal:scope", FORGE.UNIVERSAL.scopeCheck));
    }

    /* --- never -------------------------------------------------------- */
    var never = [];
    (a.guards || []).forEach(function (id) {
      var x = FORGE.GUARDRAILS.find(function (y) { return y.id === id; });
      if (x) never.push(L("guard:" + id, x.line));
    });
    d.never.forEach(function (l, i) { never.push(L("domain:never:" + i, l)); });
    toolGuards.forEach(function (l) { never.push(l); });

    /* --- suppress, dedupe, cap ---------------------------------------- */
    var all = { ctx: ctx, obj: obj, method: method, principles: principles,
                toolLines: toolLines, fmtSpec: fmtSpec, rules: rules, never: never };

    // 1. per-model suppression
    if (tune.drop.length) {
      Object.keys(all).forEach(function (k) {
        all[k] = all[k].filter(function (l) { return tune.drop.indexOf(l.src) === -1; });
      });
    }

    // 2. global dedupe — a point should be made once in the whole prompt, not
    //    once per section, and not twice in two different phrasings. Earlier
    //    sections win.
    var seen = {}, kept = [];
    ["ctx", "obj", "method", "principles", "toolLines", "fmtSpec", "rules", "never"].forEach(function (k) {
      all[k] = all[k].filter(function (l) {
        var n = norm(l.text);
        if (!n || seen[n]) return false;
        var sh = shingle(l.text);
        for (var i = 0; i < kept.length; i++) {
          if (tooSimilar(sh, kept[i])) return false;
        }
        seen[n] = 1;
        kept.push(sh);
        return true;
      });
    });

    // 3. cap the prohibition wall. A long list of "never" dilutes every entry
    //    and reads as anxiety; the first six are the load-bearing ones.
    if (all.never.length > NEVER_CAP) all.never = all.never.slice(0, NEVER_CAP);

    /* --- assemble ------------------------------------------------------ */
    var ordered = ORDERED_TASKS.indexOf(a.task) !== -1;
    var methodBody = render(all.method, ordered);
    if (all.principles.length) {
      methodBody += (methodBody ? "\n\n" + (ordered ? "Hold to these throughout:\n" : "") : "") +
        render(all.principles, false);
    }

    var outBody = render(all.fmtSpec, false);
    if (clean(fmt.skeleton)) {
      outBody += (outBody ? "\n\n" : "") + "Use this structure:\n\n```\n" + fmt.skeleton + "\n```";
    }

    var priorities = FORGE.PRIORITIES[a.stakes] || FORGE.PRIORITIES.med;

    var parts = [
      header,
      section(dialect, "context", "CONTEXT", render(all.ctx, false)),
      section(dialect, "objective", "OBJECTIVE", render(all.obj, false)),
      section(dialect, "method", "HOW YOU WORK", methodBody),
      section(dialect, "tools", "TOOLS", render(all.toolLines, false)),
      section(dialect, "output_format", "OUTPUT", outBody),
      section(dialect, "rules", "RULES", render(all.rules, false)),
      section(dialect, "never", "NEVER", render(all.never, false)),
      section(dialect, "when_unsure", "WHEN YOU'RE UNSURE", FORGE.UNIVERSAL.uncertainty),
      section(dialect, "priorities", "PRIORITIES", priorities)
    ];

    return parts.filter(function (p) { return clean(p); }).join("\n\n");
  }

  /* ---------- the one-line nudge on the result screen --------------------- */
  /* Names the single change that would most improve this prompt. Ordered by
     how much each one actually moves output quality. */

  function suggest(a) {
    var about = a.about || {};
    var traits = resolveTraits(a);

    if (traits.dropped.length) {
      return { key: "conflict", text: traits.dropped[0].why };
    }
    if (!clean(about.blurb)) return { key: "blurb" };
    if (!clean(about.always)) return { key: "always" };
    if (!(a.tools || []).length) return { key: "tools" };
    if (!a.model) return { key: "model" };
    return null;
  }

  /* ---------- metadata ---------------------------------------------------- */

  function title(a) {
    var d = FORGE.domainById(a.domain);
    var t = FORGE.TASKS[a.task];
    if (!d || !t) return "system-prompt";
    var base = (d.id === "other" && a.domainOther ? a.domainOther : d.label) + " " + t.label;
    return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  }

  function summary(a) {
    var d = FORGE.domainById(a.domain);
    var t = FORGE.TASKS[a.task];
    var tool = FORGE.toolById(a.tool);
    var chips = [];
    if (d) chips.push({ k: FORGE.t("forChip"), v: d.id === "other" && a.domainOther ? a.domainOther : FORGE.f(d, "label") });
    if (t) chips.push({ k: FORGE.t("toChip"), v: FORGE.f(t, "label") });
    if (tool) chips.push({ k: FORGE.t("inChip"), v: FORGE.f(tool, "label") });
    return chips;
  }

  function leadMeta(a) {
    return {
      domain: a.domain === "other" ? "other:" + clean(a.domainOther) : a.domain,
      task: a.task, tool: a.tool,
      model: a.model || "", plan: a.plan || "",
      tools: (a.tools || []).join("|"),
      format: a.format,
      traits: (a.traits || []).join("|"),
      guards: (a.guards || []).join("|"),
      org: clean((a.about || {}).blurb)
    };
  }

  return { build: build, suggest: suggest, title: title, summary: summary, leadMeta: leadMeta };
})();
