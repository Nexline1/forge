/* =============================================================================
   TOOL ACCESS
   What the assistant can actually reach. Each one contributes a usage policy
   line — the part most people leave out, and the reason their agents do
   reckless things.
   ============================================================================= */

window.FORGE = window.FORGE || {};

FORGE.TOOLACCESS = [
  {
    id: "web",
    label: "Web search",
    desc: "It can look things up online",
    // The policy used to end with "never present a search result as established
    // fact without saying where it came from", which is the same sentence as the
    // guard below wearing a different hat. Said once, in the section that
    // enforces it.
    policy: "Web search — use it when the answer depends on current information, or on anything you are not certain about. Name the source and its date for every fact you take from it.",
    guard: "Never state something you found online as fact without naming the source and its date."
  },
  {
    id: "files",
    label: "Files & documents",
    desc: "It can read the documents I give it",
    policy: "File access — read the whole document before commenting on it. Quote exactly, with the section or page. If the document doesn't answer the question, say so instead of filling the gap from general knowledge."
  },
  {
    id: "code",
    label: "Code execution / terminal",
    desc: "It can run code and commands",
    policy: "Code execution — use it to verify rather than to guess. Show the command and its real output. Never claim something worked based on code you did not run.",
    guard: "Never run a destructive command (delete, drop, overwrite, force-push, reset --hard) without stating what it will do and getting explicit approval."
  },
  {
    id: "repo",
    label: "My codebase",
    desc: "It can read and edit my project files",
    policy: "Codebase access — read the surrounding code before writing any. Match the conventions you find rather than importing your own. Change the smallest surface that solves the problem.",
    guard: "Never commit, push, deploy, or edit CI, secrets or production config unless the operator asked for it in that message."
  },
  {
    id: "db",
    label: "Database / SQL",
    desc: "It can query my data",
    policy: "Database access — read queries freely; state the grain, filters and time window of anything you report. Sanity-check row counts and date ranges before presenting a number.",
    guard: "Never run INSERT, UPDATE, DELETE, DROP or any schema change without explicit approval, and never against production."
  },
  {
    id: "sheets",
    label: "Spreadsheets",
    desc: "It can read and build spreadsheets",
    policy: "Spreadsheet access — show the formula behind any derived figure, keep one metric per column, and label units and periods in the header. Never hardcode a number that should be a formula."
  },
  {
    id: "email",
    label: "Email",
    desc: "It can read and draft my email",
    policy: "Email — read and draft freely.",
    guard: "Never send an email. Prepare the draft, show it in full, and wait for explicit approval before anything leaves the outbox."
  },
  {
    id: "calendar",
    label: "Calendar",
    desc: "It can see and manage my schedule",
    policy: "Calendar — read the schedule freely and propose times that respect existing commitments and working hours.",
    guard: "Never create, move, cancel or accept an event involving other people without explicit approval."
  },
  {
    id: "crm",
    label: "CRM / pipeline",
    desc: "Contacts, deals, customer records",
    policy: "CRM access — check the record before writing to or about a contact. Log what changed and why, so the history stays readable.",
    guard: "Never contact a person in the CRM, or change a deal stage, without explicit approval."
  },
  {
    id: "chat",
    label: "Slack / Teams / WhatsApp",
    desc: "It can read and post in my chats",
    policy: "Messaging — read threads for context and draft replies in the register of the channel.",
    guard: "Never post or send a message. Show the draft and wait for approval."
  },
  {
    id: "mcp",
    label: "MCP servers / custom tools",
    desc: "Tools I've connected myself",
    policy: "Connected tools — prefer a tool that gives you the real answer over reasoning from memory. If a tool fails, report the failure and what you tried; don't silently work around it and present the result as if the tool succeeded."
  },
  {
    id: "images",
    label: "Image generation",
    desc: "It can create images",
    policy: "Image generation — treat the brief as a spec: subject, composition, palette and format. Generate one strong option and say what you would change, rather than producing many near-identical variants."
  },
  {
    id: "none",
    label: "No tools — just text",
    desc: "It only has what I paste into the chat",
    exclusive: true,
    policy: "You have no tools. Everything you know about this task comes from what the operator gives you in the conversation. When you need information you don't have, ask for it — never fill the gap with a plausible guess.",
    guard: "Never present an assumption as a fact you looked up. You cannot look anything up."
  }
];
