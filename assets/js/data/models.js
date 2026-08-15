/* =============================================================================
   TOOLS, MODELS, PLANS
   Each tool has a "dialect" — Claude models respond best to XML section tags,
   GPT/Gemini to markdown headers. The composer switches on this.

   Also carries the "how do I actually use this" steps shown on the result
   screen, which is most of the perceived value of the whole thing.
   ============================================================================= */

window.FORGE = window.FORGE || {};

FORGE.TOOLS = [

  {
    id: "claude-code",
    label: "Claude Code",
    desc: "Anthropic's coding agent in your terminal, IDE or desktop app",
    dialect: "xml",
    agentic: true,
    vendor: "claude",
    // Extra prompt sections that only make sense for a file-touching agent.
    extras: ["repo", "verification"],
    install: [
      "Save this as <code>CLAUDE.md</code> in the root of your project folder.",
      "Claude Code reads it automatically at the start of every session in that folder — you don't paste anything.",
      "For instructions that should apply to <em>every</em> project, put them in <code>~/.claude/CLAUDE.md</code> instead.",
      "Start a session in that folder and check the top of the response — it should already be following these rules."
    ],
    tips: [
      "Keep CLAUDE.md tight. It is re-read every session, so every line costs you context.",
      "As you correct Claude on the same thing twice, add it to CLAUDE.md — that's the whole point of the file."
    ]
  },

  {
    id: "claude-app",
    label: "Claude (web, desktop or mobile)",
    desc: "claude.ai — chat, Projects, artifacts",
    dialect: "xml",
    agentic: false,
    vendor: "claude",
    install: [
      "Open Claude and create a <strong>Project</strong> for this work.",
      "Paste this into the project's custom instructions. Every chat you start inside that project now begins with it.",
      "No Projects? Just paste it as the first message of a new chat, then ask your real question in the second message.",
      "Attach your reference documents to the project too — the prompt tells Claude to actually use them."
    ],
    tips: [
      "One project per job, not one project for everything. A prompt that tries to cover two jobs does neither well.",
      "When Claude gets something wrong twice, add one line to the instructions rather than re-explaining each chat."
    ]
  },

  {
    id: "claude-api",
    label: "Claude API",
    desc: "You're building software on top of Claude",
    dialect: "xml",
    agentic: false,
    vendor: "claude",
    extras: ["api"],
    install: [
      "Pass this as the <code>system</code> parameter on your <code>messages.create()</code> call — not as a user message.",
      "Keep it byte-identical between requests and mark it with <code>cache_control</code>, so you pay ~10% for it after the first call instead of full price every time.",
      "Current Claude models use <code>thinking: {type: \"adaptive\"}</code> and <code>output_config: {effort: \"...\"}</code>. <code>temperature</code> and <code>budget_tokens</code> are rejected — don't send them.",
      "Put anything that changes per request (dates, user IDs, the actual question) in the messages, never in the system prompt."
    ],
    tips: [
      "Model IDs: <code>claude-opus-5</code>, <code>claude-sonnet-5</code>, <code>claude-haiku-4-5</code>, <code>claude-fable-5</code>.",
      "If the output needs to be JSON, use structured outputs (<code>output_config.format</code>) instead of asking for JSON in the prompt."
    ]
  },

  {
    id: "chatgpt",
    label: "ChatGPT",
    desc: "OpenAI — chat, Projects or a custom GPT",
    dialect: "markdown",
    agentic: false,
    vendor: "openai",
    install: [
      "For repeat use: create a <strong>Project</strong> (or a custom GPT) and paste this into its instructions.",
      "For one-off use: paste it as the first message of a new chat, then ask your question next.",
      "For everything you do: Settings → Personalization → Custom instructions.",
      "Upload your reference files into the same project so the prompt's rules about sources apply to them."
    ],
    tips: [
      "Longer prompts drift more in long chats here. If it starts ignoring a rule, paste the rule again — don't rewrite the whole prompt."
    ]
  },

  {
    id: "gemini",
    label: "Gemini",
    desc: "Google — chat or a saved Gem",
    dialect: "markdown",
    agentic: false,
    vendor: "google",
    install: [
      "Create a <strong>Gem</strong> and paste this into its instructions — that saves it for reuse.",
      "For one-off use, paste it as the first message of a chat.",
      "Add your reference files to the Gem so its sourcing rules have something to point at."
    ],
    tips: [
      "Gemini follows format instructions well — the output contract section is doing real work here, keep it."
    ]
  },

  {
    id: "ide-agent",
    label: "Cursor, Windsurf or Copilot",
    desc: "An AI agent living inside your editor",
    dialect: "markdown",
    agentic: true,
    vendor: "ide",
    extras: ["repo", "verification"],
    install: [
      "Cursor: save it under <code>.cursor/rules/</code> in your repo, or paste it into Settings → Rules.",
      "Windsurf: paste into <code>.windsurfrules</code> at the repo root.",
      "Copilot: save as <code>.github/copilot-instructions.md</code>.",
      "Commit the file. Everyone on the repo gets the same behaviour, which is most of the value."
    ],
    tips: [
      "Editor agents see less of your codebase than you think. The context section telling it what the project <em>is</em> matters more here than anywhere else."
    ]
  },

  {
    id: "other-llm",
    label: "Something else / not sure yet",
    desc: "I'll give you a clean version that works anywhere",
    dialect: "markdown",
    agentic: false,
    vendor: "generic",
    install: [
      "Paste this wherever your tool keeps its persistent instructions — 'system prompt', 'custom instructions', 'persona' and 'rules' all mean the same thing.",
      "No such box? Paste it as the first message in a fresh chat, then ask your real question in the second message.",
      "Save it somewhere you can find it. This is now a reusable asset, not a one-off."
    ],
    tips: []
  }
];

/* ---------- MODEL TIER (asked only for Claude tools) --------------------- */

/* Each model gets a `tuning` block. These are not stylistic preferences — they
   are documented behavioural differences between the models, and writing to
   them is the single biggest lever on output quality.

     add   — extra rules. Safe on any model, so they apply even when we only
             *inferred* which model they're on.
     drop  — source ids to SUPPRESS. Subtractive and riskier (removing a rule
             that a weaker model needed would hurt), so these only fire when
             the visitor explicitly picks the model in the Refine panel.
     thin  — collapse the ordered method into principles.                    */

FORGE.CLAUDE_MODELS = [
  {
    id: "opus",
    label: "Opus 5",
    desc: "The default for hard work — deep reasoning, long agentic runs",
    note: "You're on the strongest general model, so the prompt leans on judgement rather than spelling out every step.",
    tuning: {
      add: [
        "Keep responses focused and brief. Most of the response should be the answer itself; keep caveats short. When asked to explain something, give a high-level summary unless depth was asked for.",
        "Deliver what was asked, at the scope intended. Make routine judgement calls yourself and check in only when different readings would lead to materially different work. If you think the request is mistaken, say so in one sentence and continue with what was asked.",
        "Correct an earlier statement only when the error changes what the operator should do. State the correction plainly and move on — no apologising, no recounting the mistake."
      ],
      // Opus 5 verifies its own work unprompted; telling it to verify produces
      // over-verification. Honest-reporting lines stay — only the redundant
      // instruct-to-verify line goes.
      drop: ["clarifier:verify"],
      agentic: [
        "Delegate to subagents rarely. Each one re-establishes context and reports back, and you then re-read that report. Use them for genuinely independent, sizeable tracks — never to review or double-check your own work."
      ]
    }
  },
  {
    id: "sonnet",
    label: "Sonnet 5",
    desc: "Fast and near-Opus quality — good for high-volume work",
    note: "Sonnet is fast and follows instructions literally, so the output contract in your prompt is doing a lot of the work. Keep it.",
    tuning: {
      // Sonnet 5 reads instructions literally and will not generalise a rule
      // from one case to the next unless told to.
      add: [
        "Every instruction here applies to every item and every section, not only the first one you encounter."
      ]
    }
  },
  {
    id: "haiku",
    label: "Haiku 4.5",
    desc: "Cheapest and fastest — best for simple, repetitive tasks",
    note: "On a small model, be more explicit and less clever. If quality slips, move the hard judgement calls out of the prompt and into your own review step.",
    tuning: {
      add: [
        "Prefer the direct, explicit answer over the clever one. If a task turns on judgement you are not confident about, say so and hand it back rather than guessing."
      ]
    }
  },
  {
    id: "fable",
    label: "Fable 5",
    desc: "The heaviest model, for the hardest problems",
    note: "Fable thinks for a long time on hard problems — expect slow, thorough responses. Give it the whole task up front rather than drip-feeding it.",
    tuning: {
      add: [
        "When you have enough information to act, act. Don't re-derive what's already established, and don't narrate options you aren't going to pursue."
      ],
      // Over-prescriptive prompts measurably reduce Fable's output quality.
      thin: true
    }
  },
  {
    id: "unsure",
    label: "Not sure / whatever's default",
    desc: "Perfectly fine — I'll write it to work on any of them",
    note: "Start on Opus 5 if you have it. If responses feel slow for simple work, switch to Sonnet 5 and see if quality holds.",
    tuning: {}
  }
];

/* ---------- PLAN (the 'do you have Pro' question) ------------------------ */

FORGE.PLANS = [
  {
    id: "free",
    label: "Free plan",
    desc: "Limited messages per day",
    // Injected into the prompt so the assistant is economical with the budget.
    rule: "The operator is working within a tight usage budget. Be economical: answer in one pass where you can, batch any clarifying questions into a single message rather than asking one at a time, and don't re-read material already in this conversation.",
    note: "On a free plan, the biggest win is fewer, better messages. This prompt is written to front-load the context so you don't burn turns on back-and-forth."
  },
  {
    id: "pro",
    label: "Pro",
    desc: "The standard paid plan",
    rule: "Work at a normal pace. Ask a clarifying question when the answer would materially change the work, but don't interrogate the operator over small choices — make a reasonable call and note it.",
    note: "Pro is the sweet spot for this. You have room for a real back-and-forth without watching the meter."
  },
  {
    id: "max",
    label: "Max",
    desc: "Highest usage limits",
    rule: "Usage budget is not a constraint. Prefer thoroughness: read the whole source, verify your own work, and check the edges before reporting back.",
    note: "On Max you can let it run — deeper exploration, longer sessions, more verification. The prompt tells it to use that headroom."
  },
  {
    id: "team",
    label: "Team or Enterprise",
    desc: "Shared workspace at work",
    rule: "You may be working alongside colleagues on shared material. Never assume a document is safe to share more widely than where you found it, and don't send anything externally without explicit approval.",
    note: "Shared workspace — so the prompt adds a confidentiality rule by default. Delete it if your workspace is already locked down."
  },
  {
    id: "api",
    label: "API / pay-as-you-go",
    desc: "I'm billed per token",
    rule: "Every token is billed. Be direct: no restating the question, no summarising what you're about to do, no closing pleasantries. Answer, then stop.",
    note: "Billed per token, so the prompt strips the padding. That alone typically cuts output length noticeably."
  },
  {
    id: "unsure",
    label: "Not sure",
    desc: "Skip this",
    rule: "",
    note: ""
  }
];

FORGE.toolById = function (id) {
  return FORGE.TOOLS.find(function (t) { return t.id === id; }) || null;
};
