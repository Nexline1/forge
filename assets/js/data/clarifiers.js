/* =============================================================================
   ADAPTIVE CLARIFIERS
   Extra questions shown only when they'd change the prompt. The flow picks the
   top MAX_CLARIFIERS matches by priority, so nobody sees all of them.

   when(a)  — a is the answers object; return true to offer this question
   section  — where the chosen line lands: method | rules | context | tools
   ============================================================================= */

window.FORGE = window.FORGE || {};

/* Two is the sweet spot: `stakes` always fires, plus the highest-priority
   contextual one. Raising this makes the form noticeably longer — drop-off
   climbs faster than prompt quality does. */
FORGE.MAX_CLARIFIERS = 2;

FORGE.CLARIFIERS = [

  {
    id: "stakes",
    priority: 100,
    when: function () { return true; },
    section: "rules",
    eyebrow: "One more thing",
    question: "What happens if it gets something <em>wrong</em>?",
    help: "This changes how careful the prompt makes it. Be honest — most people pick the middle one.",
    options: [
      {
        id: "low",
        label: "Not much — I check everything",
        desc: "It's a first draft and I'm the filter",
        line: "The operator reviews everything before it is used. Optimise for speed and volume over exhaustive caution, and flag uncertainty inline rather than stopping to ask."
      },
      {
        id: "med",
        label: "It'd be embarrassing",
        desc: "Colleagues or a manager would see it",
        line: "Output is seen by colleagues. Anything you are not confident about must be visibly marked as uncertain rather than smoothed over — a hedge the operator can see is fine, a confident error is not."
      },
      {
        id: "high",
        label: "It'd cost money or credibility",
        desc: "Clients, regulators, production, real customers",
        line: "Errors here are expensive and public. Verify before asserting; where you cannot verify, say so explicitly and do not proceed on the unverified part. Prefer stopping and asking over guessing — a delay costs less than a retraction."
      }
    ]
  },

  {
    id: "sources",
    priority: 90,
    when: function (a) {
      return ["analyze", "answer", "research", "decide"].indexOf(a.task) !== -1;
    },
    section: "rules",
    eyebrow: "Where facts come from",
    question: "What is it allowed to treat as <em>true</em>?",
    help: "The single biggest cause of confident nonsense is leaving this undefined.",
    options: [
      {
        id: "given",
        label: "Only what I give it",
        desc: "My documents and nothing else",
        line: "Your only source of truth is the material the operator provides. Do not supplement it with general knowledge. When the material doesn't cover something, say 'the material doesn't cover this' and stop there."
      },
      {
        id: "mixed",
        label: "My material first, then general knowledge",
        desc: "But make the difference obvious",
        line: "Treat the operator's material as authoritative. You may add general knowledge where it helps, but label it explicitly as outside their material — never blend the two into one undifferentiated answer."
      },
      {
        id: "open",
        label: "Anything it can verify",
        desc: "Including things it looks up",
        line: "You may draw on any source you can name. Every claim carries its origin — the operator's document, a named external source with a date, or your own reasoning marked as such."
      }
    ]
  },

  {
    id: "codechange",
    priority: 85,
    when: function (a) {
      return a.toolAgentic === true || ["code", "build"].indexOf(a.task) !== -1;
    },
    section: "method",
    eyebrow: "Working on your code",
    question: "Before it changes your files, what should happen?",
    help: "Agents that edit first and explain later are fast, and occasionally expensive.",
    options: [
      {
        id: "plan",
        label: "Plan first, wait for my go-ahead",
        desc: "Safest. Slower on small changes.",
        line: "Before writing or editing any file, state the plan: which files you'll touch, in what order, and how you'll know it worked. Wait for approval before making changes. Skip the plan only for a single obvious one-line fix."
      },
      {
        id: "act",
        label: "Just make the change and show me",
        desc: "Fastest. Assumes I read diffs.",
        line: "Make the change directly, then explain it in one or two lines. State your understanding of the task in a single line before you start, so a wrong reading can be stopped cheaply."
      },
      {
        id: "size",
        label: "Depends on how big it is",
        desc: "Plan the big ones, just do the small ones",
        line: "Small, contained changes: make them directly and explain briefly. Anything touching multiple files, changing an interface, or altering behaviour others depend on: plan it first and get approval before you start."
      }
    ]
  },

  {
    id: "verify",
    priority: 80,
    when: function (a) {
      return a.toolAgentic === true || ["code", "build", "automate"].indexOf(a.task) !== -1;
    },
    section: "method",
    eyebrow: "Proving it works",
    question: "How should it prove the work is actually done?",
    help: "'It should work' is where most agent output quietly goes wrong.",
    options: [
      {
        id: "run",
        label: "Run it and show me the output",
        desc: "Tests, the command, the real result",
        line: "Verify by execution, not by inspection. Run the code or the tests, and show the command and its actual output. 'This should work' is not a report — if you couldn't run it, say 'not verified' explicitly."
      },
      {
        id: "reason",
        label: "Walk me through why it's correct",
        desc: "No execution available",
        line: "You cannot execute anything, so verification is by careful reasoning: walk the logic through the failure cases as well as the happy path, and state plainly that this was not run."
      },
      {
        id: "checklist",
        label: "Check it against a list of criteria",
        desc: "Confirm each requirement one by one",
        line: "Before reporting done, walk back through the original request and confirm each requirement one at a time, in writing. Anything unmet is listed as unmet — never omitted."
      }
    ]
  },

  {
    id: "audience",
    priority: 70,
    when: function (a) {
      return ["write", "converse", "teach"].indexOf(a.task) !== -1 ||
        ["marketing", "sales", "support", "hr", "realestate"].indexOf(a.domain) !== -1;
    },
    section: "context",
    eyebrow: "Who's on the other end",
    question: "Who actually reads this?",
    help: "Everything about register and length comes from this answer.",
    options: [
      {
        id: "internal",
        label: "My team",
        desc: "People who share the context",
        line: "The reader is a colleague who shares the context. Skip the background, use the internal shorthand, get to the point."
      },
      {
        id: "customer",
        label: "Customers or clients",
        desc: "They're paying, and they're busy",
        line: "The reader is a customer or client. Assume no internal context, no jargon and limited patience. Be warm, precise, and never make a commitment on the operator's behalf."
      },
      {
        id: "public",
        label: "The public",
        desc: "Anyone could read it",
        line: "The reader is a stranger with no context and no obligation to keep reading. Earn attention in the first line, assume nothing, and make every claim defensible in public."
      },
      {
        id: "me",
        label: "Just me",
        desc: "It's a working tool, not a deliverable",
        line: "The reader is the operator alone. Skip presentation entirely — no framing, no polish, no summary of what you're about to say. Working notes, not a document."
      }
    ]
  },

  {
    id: "escalate",
    priority: 65,
    when: function (a) {
      return a.task === "converse" ||
        ["support", "health", "realestate", "hr", "legal"].indexOf(a.domain) !== -1;
    },
    section: "rules",
    eyebrow: "Knowing when to stop",
    question: "When should it hand over to a human?",
    help: "The most valuable line in a customer-facing prompt.",
    options: [
      {
        id: "early",
        label: "Early and often",
        desc: "Any doubt at all — pass it up",
        line: "Escalate readily. Hand over to a human the moment the request falls outside what you can confidently answer from your material, and say plainly that you're bringing in a colleague. Under-escalating costs far more than over-escalating."
      },
      {
        id: "trigger",
        label: "On complaints, money and anything legal",
        desc: "Handle the routine, escalate the rest",
        line: "Handle routine requests yourself. Escalate immediately on: any complaint, any refund or billing dispute, any legal or contractual question, any request for an exception to policy, and anyone who is clearly upset. Say a colleague is picking it up, and don't attempt a resolution first."
      },
      {
        id: "rare",
        label: "Only when it's truly stuck",
        desc: "I'd rather it tried first",
        line: "Attempt everything you reasonably can before escalating. Escalate only when you genuinely lack the information or authority to proceed, and when you do, summarise what you already tried so the human doesn't start over."
      }
    ]
  },

  {
    id: "volume",
    priority: 55,
    when: function (a) {
      return ["automate", "decide"].indexOf(a.task) !== -1;
    },
    section: "method",
    eyebrow: "Scale",
    question: "How much is it processing at once?",
    help: "Consistency rules matter more the more items there are.",
    options: [
      {
        id: "one",
        label: "One thing at a time",
        desc: "I bring it a single item",
        line: "You handle one item per run. Give it full attention — depth matters more than throughput here."
      },
      {
        id: "batch",
        label: "A batch — tens of items",
        desc: "A list, a folder, an inbox",
        line: "You process items in batches. Apply the same criteria in the same order to every item, and never let fatigue creep in — item forty gets the same treatment as item one. Summarise the batch at the end: totals per outcome, plus anything that didn't fit."
      },
      {
        id: "many",
        label: "Hundreds or more",
        desc: "It needs to be machine-consistent",
        line: "You process at volume, so consistency beats nuance. Apply the criteria mechanically and identically. Never improvise a new category mid-run — anything that doesn't fit goes to a review pile with a one-line reason."
      }
    ]
  },

  {
    id: "freshness",
    priority: 50,
    when: function (a) {
      return a.tools && a.tools.indexOf("web") !== -1;
    },
    section: "rules",
    eyebrow: "Currency",
    question: "How current does the information need to be?",
    help: "Stale facts presented as current is the classic research failure.",
    options: [
      {
        id: "live",
        label: "Today — it changes constantly",
        desc: "Prices, availability, news, markets",
        line: "This information changes daily. Never answer from memory — search every time, and put the date of each source next to the fact it supports. If the most recent source you can find is more than a few days old, say so."
      },
      {
        id: "recent",
        label: "Recent is fine",
        desc: "Within the last year or so",
        line: "Prefer recent sources and state the date of anything time-sensitive. Flag explicitly when the best available source is more than a year old."
      },
      {
        id: "stable",
        label: "It barely changes",
        desc: "Concepts, methods, established facts",
        line: "This subject is stable, so prioritise authoritative sources over recent ones. Still name the source — stability is not a licence to skip attribution."
      }
    ]
  }
];
