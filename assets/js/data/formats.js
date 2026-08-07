/* =============================================================================
   OUTPUT CONTRACTS
   A prompt without a defined output shape produces a different shape every
   time. The skeletons below are what turn "be helpful" into something you can
   paste into a document.
   ============================================================================= */

window.FORGE = window.FORGE || {};

FORGE.FORMATS = [

  {
    id: "brief",
    label: "A short brief",
    desc: "Headline finding, then the evidence",
    spec: [
      "Open with the single most important finding in one sentence. No preamble.",
      "Then the supporting points, each one line, each tied to a specific piece of evidence.",
      "Close with what you're unsure about, or what you'd need to be sure."
    ],
    skeleton:
      "**[The finding, in one sentence]**\n" +
      "\n" +
      "- [Point] — [evidence: the number, quote or source it rests on]\n" +
      "- [Point] — [evidence]\n" +
      "- [Point] — [evidence]\n" +
      "\n" +
      "**Not established:** [what you couldn't determine, and what would settle it]"
  },

  {
    id: "report",
    label: "A structured report",
    desc: "Sections, sources, the full picture",
    spec: [
      "Lead with a summary a busy reader could act on without reading further.",
      "Separate what is established from what is contested from what you could not determine.",
      "Attach a source and a date to every load-bearing claim."
    ],
    skeleton:
      "## Summary\n" +
      "[3–5 lines. The answer, and what it means for the decision at hand.]\n" +
      "\n" +
      "## What we know\n" +
      "[Established findings. Source and date on each.]\n" +
      "\n" +
      "## What's contested\n" +
      "[Where sources disagree, and what the disagreement rests on.]\n" +
      "\n" +
      "## What I couldn't determine\n" +
      "[Gaps, and what would close them.]\n" +
      "\n" +
      "## Recommended next step\n" +
      "[One concrete action.]"
  },

  {
    id: "table",
    label: "A table",
    desc: "One row per item, same columns every time",
    spec: [
      "One row per item. Never merge two items into one row.",
      "Keep the columns identical across runs, even when a cell is empty — write '—' instead of dropping the column.",
      "Put reasoning in a column, not in prose after the table."
    ],
    skeleton:
      "| Item | [Assessment] | Why | Recommended action |\n" +
      "|---|---|---|---|\n" +
      "| [name] | [score or label] | [one line, referencing the criteria] | [what to do today] |\n" +
      "\n" +
      "**Borderline:** [any item that didn't fit cleanly, and why]"
  },

  {
    id: "code",
    label: "Code and a short explanation",
    desc: "The change itself, plus what it does",
    spec: [
      "One line stating what you're changing and why, before the code.",
      "Then the code. Complete and runnable — no '// rest of implementation here'.",
      "Then anything the reviewer needs to know: what you verified, what you didn't, what you assumed."
    ],
    skeleton:
      "[One line: what this changes and why.]\n" +
      "\n" +
      "```[language]\n" +
      "[complete, runnable code]\n" +
      "```\n" +
      "\n" +
      "**Verified:** [what you actually ran, and what it printed]\n" +
      "**Not verified:** [anything you couldn't check]"
  },

  {
    id: "draft",
    label: "A finished draft",
    desc: "Ready to send, not an outline",
    spec: [
      "Deliver the piece itself — no framing, no 'here's a draft', no meta-commentary around it.",
      "One strong version, not three weak options, unless variants were asked for.",
      "Afterwards, at most two lines on any choice the operator might want to reverse."
    ],
    skeleton:
      "[The draft. Complete and ready to use.]\n" +
      "\n" +
      "---\n" +
      "[Optional, max two lines: a choice you made that they might want to change.]"
  },

  {
    id: "answer",
    label: "A direct answer with sources",
    desc: "The answer first, then where it came from",
    spec: [
      "Answer the actual question in the first sentence.",
      "Then the supporting detail, then the citation.",
      "If the material doesn't cover it, the first sentence says so."
    ],
    skeleton:
      "[The answer, first sentence.]\n" +
      "\n" +
      "[Supporting detail, if it changes what the reader does next.]\n" +
      "\n" +
      "*Source: [document, section or page]*"
  },

  {
    id: "runlog",
    label: "A run log",
    desc: "Step by step, with a clear status at the end",
    spec: [
      "One line per step: what you did and what happened.",
      "End with an explicit status — completed, completed with exceptions, or failed.",
      "List exceptions separately. Never bury a failure inside a step line."
    ],
    skeleton:
      "**Run:** [what triggered this, and the inputs]\n" +
      "\n" +
      "1. [step] → [result]\n" +
      "2. [step] → [result]\n" +
      "3. [step] → [result]\n" +
      "\n" +
      "**Status:** completed / completed with exceptions / failed\n" +
      "**Exceptions:** [each one, or 'none']"
  },

  {
    id: "buildlog",
    label: "A build report",
    desc: "What you built, what you actually tested",
    spec: [
      "Say what you built, in the operator's terms, not in file names.",
      "Separate what you verified from what you did not. This distinction is the whole report.",
      "End with what's still open."
    ],
    skeleton:
      "**Built:** [what now works, in plain terms]\n" +
      "\n" +
      "**Verified:** [command run → what it printed. Real output, not a claim.]\n" +
      "\n" +
      "**Not verified:** [what you didn't test, and why]\n" +
      "\n" +
      "**Still open:** [anything unfinished or uncertain]"
  },

  {
    id: "chat",
    label: "A conversational reply",
    desc: "Short messages, like a real person typing",
    spec: [
      "Two or three sentences. This is a message, not a document.",
      "One question at a time, never a list of questions.",
      "No bullet points, no headers, no bold. It's a chat."
    ],
    skeleton:
      "[A short, direct reply — two or three sentences, plain sentences only.]"
  },

  {
    id: "lesson",
    label: "A teaching response",
    desc: "One idea, then check they got it",
    spec: [
      "One idea per response. Do not stack the next one on top.",
      "Use an example from the learner's own domain, not a generic one.",
      "End by asking them to apply it — not by asking whether it made sense."
    ],
    skeleton:
      "[The one idea, explained plainly.]\n" +
      "\n" +
      "**In your context:** [a worked example using their actual domain]\n" +
      "\n" +
      "**Your turn:** [a question that makes them apply it to a new case]"
  },

  {
    id: "json",
    label: "Structured data (JSON)",
    desc: "Machine-readable output for a pipeline",
    spec: [
      "Return only the JSON object. No prose before it, no code fence, no explanation after.",
      "Use exactly the keys specified. Never invent, rename or omit a key.",
      "When a value is genuinely unknown, use null — never an empty string, never a guess."
    ],
    skeleton:
      "{\n" +
      "  \"[key]\": \"[value]\",\n" +
      "  \"[key]\": null,\n" +
      "  \"confidence\": \"high | medium | low\"\n" +
      "}"
  },

  {
    id: "slides",
    label: "A slide outline",
    desc: "One slide per point, with the actual words",
    spec: [
      "One slide per idea. If a slide needs two ideas, it's two slides.",
      "Write the words that go on the slide, not a description of them.",
      "Put the argument in the slide titles — someone reading only the titles should get the story."
    ],
    skeleton:
      "**Slide 1 — [title that states the point, not the topic]**\n" +
      "- [line as it appears on the slide]\n" +
      "- [line]\n" +
      "*Speaker note: [what you say that isn't on the slide]*\n" +
      "\n" +
      "**Slide 2 — [title]**\n" +
      "- [line]"
  },

  {
    id: "adaptive",
    label: "Let it choose the format",
    desc: "Match the shape to whatever I ask for",
    spec: [
      "Match the shape of the output to the question. A simple question gets a direct answer in prose, not headers and sections.",
      "Use a table only for facts that are genuinely enumerable; keep the explanation in prose around it.",
      "Never use structure as decoration — no headers on a three-line answer."
    ],
    skeleton: ""
  }
];

FORGE.formatById = function (id) {
  return FORGE.FORMATS.find(function (f) { return f.id === id; }) || null;
};
