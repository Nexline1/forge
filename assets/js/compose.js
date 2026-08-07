/* =============================================================================
   THE COMPOSER
   Answers in, production-grade system prompt out.

   Section order is deliberate: role → context → objective → method → tools →
   output → rules → uncertainty. Models weight early instructions more heavily,
   so identity and context come first and the hard prohibitions come last,
   where they're closest to the response.
   ============================================================================= */

window.FORGE = window.FORGE || {};

FORGE.compose = (function () {

  /* ---------- small helpers --------------------------------------------- */

  function clean(s) { return (s || "").trim(); }

  function uniq(list) {
    var seen = {};
    return list.filter(function (x) {
      var k = clean(x);
      if (!k || seen[k]) return false;
      seen[k] = 1;
      return true;
    });
  }

  function bullets(list) {
    return uniq(list).map(function (l) { return "- " + l; }).join("\n");
  }

  function numbered(list) {
    return uniq(list).map(function (l, i) { return (i + 1) + ". " + l; }).join("\n");
  }

  /* Wrap a section in the right dialect. Claude models key off XML tags;
     GPT/Gemini do better with markdown headers. */
  function section(dialect, tag, heading, body) {
    if (!clean(body)) return "";
    if (dialect === "xml") {
      return "<" + tag + ">\n" + body + "\n</" + tag + ">";
    }
    return "## " + heading + "\n" + body;
  }

  /* ---------- gather ----------------------------------------------------- */

  function clarifierLines(a) {
    var out = { method: [], rules: [], context: [], tools: [] };
    FORGE.CLARIFIERS.forEach(function (c) {
      var chosen = a.clarifiers[c.id];
      if (!chosen) return;
      var opt = c.options.find(function (o) { return o.id === chosen; });
      if (opt && opt.line) out[c.section].push(opt.line);
    });
    return out;
  }

  /* ---------- the build -------------------------------------------------- */

  function build(a) {
    var d = FORGE.domainById(a.domain);
    var t = FORGE.TASKS[a.task];
    var tool = FORGE.toolById(a.tool);
    var fmt = FORGE.formatById(a.format);
    var plan = FORGE.PLANS.find(function (p) { return p.id === a.plan; });
    var cl = clarifierLines(a);
    var dialect = tool ? tool.dialect : "markdown";
    if (!d || !t || !fmt) return "";

    var about = a.about || {};
    var isOther = d.id === "other" && clean(a.domainOther);

    /* --- 1. role ------------------------------------------------------- */
    var role = isOther
      ? "You are an experienced " + clean(a.domainOther) + "."
      : "You are a " + d.role + ".";

    var who = [];
    if (clean(about.name)) who.push("You work directly with " + clean(about.name) + ".");
    if (clean(about.org)) who.push("The business: " + clean(about.org) + ".");
    if (clean(about.serves)) who.push("Who it serves: " + clean(about.serves) + ".");

    var header = role + " " + d.frame;

    /* --- 2. context ---------------------------------------------------- */
    var ctx = who.slice();
    if (clean(about.always)) ctx.push("Always true, and never to be contradicted: " + clean(about.always));
    cl.context.forEach(function (l) { ctx.push(l); });
    if (!ctx.length) {
      ctx.push("The operator has not described their organisation. Ask for the context you need rather than inventing it.");
    }

    /* --- 3. objective -------------------------------------------------- */
    var obj = [
      "Your job is to " + t.job + ".",
      "Success looks like: " + t.success + ".",
      "The wider standard you are held to: " + d.success + "."
    ];

    /* --- 4. method ----------------------------------------------------- */
    var method = t.method.slice();
    cl.method.forEach(function (l) { method.push(l); });

    var principles = d.focus.slice();

    /* --- 5. tools ------------------------------------------------------ */
    var toolLines = [];
    var toolGuards = [];
    var picked = (a.tools || []).map(function (id) {
      return FORGE.TOOLACCESS.find(function (x) { return x.id === id; });
    }).filter(Boolean);

    var noTools = picked.some(function (x) { return x.exclusive; });

    if (noTools) {
      var none = picked.find(function (x) { return x.exclusive; });
      toolLines.push(none.policy);
      if (none.guard) toolGuards.push(none.guard);
    } else if (picked.length) {
      toolLines.push("You have access to: " +
        picked.map(function (x) { return x.label.toLowerCase(); }).join(", ") + ".");
      picked.forEach(function (x) {
        toolLines.push(x.policy);
        if (x.guard) toolGuards.push(x.guard);
      });
      toolLines.push("Across all of them: prefer using a tool to get the real answer over reasoning from memory, and never describe a tool result you did not actually receive.");
    }
    cl.tools.forEach(function (l) { toolLines.push(l); });

    /* --- 6. output contract -------------------------------------------- */
    var out = fmt.spec.slice();
    var outBody = bullets(out);
    if (clean(fmt.skeleton)) {
      outBody += "\n\nUse this structure:\n\n```\n" + fmt.skeleton + "\n```";
    }

    /* --- 7. rules ------------------------------------------------------ */
    var rules = [];
    (a.traits || []).forEach(function (id) {
      var x = FORGE.TRAITS.find(function (y) { return y.id === id; });
      if (x) rules.push(x.line);
    });
    if (t.rules) t.rules.forEach(function (l) { rules.push(l); });
    cl.rules.forEach(function (l) { rules.push(l); });
    if (plan && clean(plan.rule)) rules.push(plan.rule);
    if (tool && tool.extras && tool.extras.indexOf("api") !== -1) {
      rules.push("These instructions are fixed across every request. Anything that varies per request — dates, user identifiers, the specific question — arrives in the conversation, not here. Never assume today's date.");
    }
    rules.push(FORGE.UNIVERSAL.scopeCheck);

    /* --- 8. never ------------------------------------------------------ */
    var never = [];
    (a.guards || []).forEach(function (id) {
      var x = FORGE.GUARDRAILS.find(function (y) { return y.id === id; });
      if (x) never.push(x.line);
    });
    d.never.forEach(function (l) { never.push(l); });
    toolGuards.forEach(function (l) { never.push(l); });

    /* --- assemble ------------------------------------------------------ */
    var parts = [
      header,
      section(dialect, "context", "CONTEXT", bullets(ctx)),
      section(dialect, "objective", "OBJECTIVE", bullets(obj)),
      section(dialect, "method", "HOW YOU WORK",
        numbered(method) +
        (principles.length ? "\n\nHold to these throughout:\n" + bullets(principles) : "")),
      section(dialect, "tools", "TOOLS", bullets(toolLines)),
      section(dialect, "output_format", "OUTPUT", outBody),
      section(dialect, "rules", "RULES", bullets(rules)),
      section(dialect, "never", "NEVER", bullets(never)),
      section(dialect, "when_unsure", "WHEN YOU'RE UNSURE", FORGE.UNIVERSAL.uncertainty)
    ];

    return parts.filter(function (p) { return clean(p); }).join("\n\n");
  }

  /* ---------- metadata for the result screen ----------------------------- */

  function title(a) {
    var d = FORGE.domainById(a.domain);
    var t = FORGE.TASKS[a.task];
    if (!d || !t) return "system-prompt";
    var base = (d.id === "other" && a.domainOther ? a.domainOther : d.label) + " " + t.label;
    return base.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function summary(a) {
    var d = FORGE.domainById(a.domain);
    var t = FORGE.TASKS[a.task];
    var tool = FORGE.toolById(a.tool);
    var chips = [];
    if (d) chips.push({ k: "For", v: d.id === "other" && a.domainOther ? a.domainOther : d.label });
    if (t) chips.push({ k: "To", v: t.label });
    if (tool) chips.push({ k: "In", v: tool.label });
    var n = (a.tools || []).length;
    if (n && !(a.tools || []).some(function (x) { return x === "none"; })) {
      chips.push({ k: "Tools", v: n + "" });
    }
    return chips;
  }

  /* Facts for the lead row — useful for you, no personal data beyond email. */
  function leadMeta(a) {
    return {
      domain: a.domain === "other" ? "other:" + clean(a.domainOther) : a.domain,
      task: a.task,
      tool: a.tool,
      model: a.model || "",
      plan: a.plan || "",
      tools: (a.tools || []).join("|"),
      format: a.format,
      traits: (a.traits || []).join("|"),
      guards: (a.guards || []).join("|"),
      org: clean((a.about || {}).org)
    };
  }

  return { build: build, title: title, summary: summary, leadMeta: leadMeta };
})();
