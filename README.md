# Bastion Proposal Generator

A smart proposal workspace for the business-development team at **Bastion**. You paste a client's RFP. **Bastion Assist** reads it, picks Bastion's most relevant past projects and live performance stats, and drafts a branded proposal. You then review it, fill in anything it flagged, and export to Word or PDF.

> **Demo only.** Bastion is a fictional company. Every name, figure, award, project, client and user in this app is made up for demonstration.

## The idea

Specialty industrial contractors win work by answering RFPs: "here is who we are, what we can do, the similar jobs we've done, how long they took and what we learned." Writing those proposals by hand is slow. This app drafts them from the company's own experience library and approved wording, and adds **live performance stats** (scaffold on-time delivery, safety rates, active projects) so the client sees how the company performs today.

Bastion is a specialty contractor: scaffolding, insulation, coatings, abatement, refractory, fireproofing, rope access, fabrication, general mechanical and safety services. Its work falls into **turnarounds, maintenance and capital projects** for refineries, petrochemical plants, LNG and power facilities across the US and Canada, so proposals here are built around those scopes.

## Run it

You need Node.js 20 or newer.

```bash
cd smart-proposal-gen
npm install
npm run dev        # opens on http://localhost:5180
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the development server |
| `npm run build` | Type-checks, then builds to `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run typecheck` | Type-checks only |

With no setup, the demo runs fully in the browser on the offline engine. To use a real AI model through AmaliAI, copy `.env.example` to `.env` and fill in the real values there:

```
AMALIAI_BASE_URL=https://<amaliai-api-host>/v1
AMALIAI_API_KEY=<your key>
```

`.env` is git-ignored, and the key stays on the dev server. `.env.example` is the committed template: keep it in step with `.env`, but never put a real key in it. Claude Code is blocked from reading or editing `.env` in this project (see `.claude/settings.json` and `.claude/hooks/protect-env.mjs`), so make changes to `.env` yourself. Don't rename these with a `VITE_` prefix, because Vite would then put the key into the browser code. `.env` also says which model does each job (see [Task routing](#task-routing)). The badge at the bottom of the sidebar shows which engine is running ("Live AI · writing model" or "Offline engine") and which model does each job.

## How someone uses it

1. **Sign in.** Pick a demo profile. Dana Whitaker is the *approver*; the others are writers.
2. **New proposal → paste the RFP.** Bastion Assist fills in the client, site, region, industry, work type, services, dates, headcount and contract basis. It also turns every "shall / must" sentence into a **requirements checklist**. There is a **Try a sample RFP** button, and a "no RFP" path that asks a few questions instead.
3. **Details.** Fields Bastion Assist filled are highlighted with "from RFP" so you can check them. Only the client and services are required.
4. **Evidence.** Past projects are ranked by match % (services, industry, work type, region, size, recency), with the reasons shown. The top 3 are pre-ticked. Pick the live stats to include, and edit the **win themes**.
5. **Format.** Pick a template: Full Proposal, Turnaround Bid, Maintenance/MSA, Capability Statement or Executive Letter. Then pick a tone: Formal, Persuasive or Concise.
6. **Generate.** You watch Bastion Assist write each section, then land in the editor.
7. **Editor.**
   - Double-click any section to edit it. The **Rewrite** menu offers: shorten, expand, more persuasive, more formal, add proof point, simplify. You can also regenerate a section or copy it.
   - The **Bastion Assist** tab takes plain-English requests, for example "make the safety section more persuasive" or "what's missing?". It shows each proposed change for you to **Apply** or **Discard**.
   - The **Checklist** tab shows a readiness score (0–100). It also has one-click fixes, a **"Needs your input"** list where you type the missing facts straight in, and RFP requirement coverage.
   - **Fact check** (top of the Checklist tab) flags any claim that Bastion's facts, the RFP and the chosen evidence don't back up. **Mark to confirm** turns a claim into a `[[Confirm: …]]` placeholder that someone must keep or remove before sending. **It's correct** dismisses it. Exporting asks you to run the fact check first, unless a current check has nothing open.
   - The outline can reorder, add and remove sections. **Ctrl+Z** undoes Bastion Assist changes.
   - **Status:** Draft → In review → Submitted (approver only) → Won / Lost.
   - **Export:** Word (.docx), PDF, copy everything (pastes into Word or Outlook with its formatting), a read-only **share link**, or print.
8. **Libraries.** The *Experience library* holds past projects (add, edit, filter). The *Content library* holds approved wording for boilerplate such as SafeHold (safety), BuildRight (quality) and Bastion Lens (technology). Edits by non-approvers are flagged for approval.

Other shortcuts: **Ctrl+K** opens search and actions from anywhere, and **Ctrl+Enter** moves to the next wizard step.

## The honesty rule

Bastion Assist never invents a fact Bastion would have to stand behind. Anything it can't confirm is written as `[[double brackets]]`, for example the TRIR/EMR table, reference contacts, the Level 3 schedule appendix and pricing. These show **highlighted yellow** and are counted in the readiness score. They are also listed in the Checklist so you can fill them in. Live stats and projects marked **Sample** are placeholders, and the checklist flags them too.

## How it's built

React 19, TypeScript, Vite, Tailwind v4 and React Router. The look: rampart teal `#0E4A52` and beacon (safety) orange `#C2410C`, a "blueprint paper" light theme with a dark theme, borders instead of shadows, and Geist fonts. The proposal itself renders as a paper document in a serif typeface.

```
src/
├── ai/                 Bastion Assist. Screens only talk to ai/provider.ts
│   ├── provider.ts     ProposalAI interface + LocalProposalAI (offline engine)
│   ├── remote.ts       live engine: AmaliAI prompts, falls back to the offline engine
│   ├── engine.ts       engine status, per-job model picks + calls to the proxy
│   ├── factcheck.ts    fact-check types + the offline number check
│   ├── extract.ts      RFP → fields + requirements checklist
│   ├── match.ts        past-project ranking with reasons
│   ├── compose.ts      section writers (one per section type)
│   ├── rewrite.ts      shorten / expand / persuasive / formal / proof / simplify
│   └── quality.ts      readiness score, checks, requirement coverage
├── data/               company facts, services, templates, projects, content, sample RFP
├── export/             docx.ts (Word), pdf.ts (jsPDF), share.ts (link), shared.ts (copy)
├── lib/                types, store (state + localStorage), markdown parser, formatting
├── screens/            Dashboard, Proposals, wizard/, editor/, library/, SignIn, ShareView
├── shell/              AppShell (sidebar / editor rail), CommandPalette
└── components/         UI primitives, icons, Markdown renderer, EngineBadge, ErrorBoundary
server/
└── amaliai.ts          AmaliAI proxy inside the Vite dev/preview server (holds the key, routes jobs)
```

Sections are stored as a small Markdown subset: paragraphs, `- bullets`, `### headings`, `**bold**`, `| tables |` and `[[placeholders]]`. One parser (`lib/markdown.ts`) feeds the on-screen preview, the Word export and the PDF export, so all three always match.

### The live AI engine (AmaliAI)

`src/ai/provider.ts` defines `ProposalAI`. The app uses `RemoteProposalAI` (`src/ai/remote.ts`), which sends requests through the proxy in `server/amaliai.ts` to AmaliAI's OpenAI-compatible `/chat/completions` API. Only the proxy knows the key.

- **RFP reading:** the model returns the fields and requirements as JSON. Values that aren't in the allowed lists are dropped, and the offline reader fills any gaps.
- **Section drafts:** the model gets a fact sheet (company facts, chosen projects and stats, approved content, the RFP) plus the offline draft as a starting point. It must keep that draft's facts and `[[placeholders]]`. Sections are drafted up to 4 at a time.
- **Rewrites, win themes and the Bastion Assist chat** use the same fact sheet. Chat answers come back as JSON, and any proposed edit still needs **Apply**.
- **Fact check:** a model from a different maker than the writer reads the draft against the fact sheet and the RFP, a few sections per request (up to 4 at once, 150 seconds allowed per model), and returns each unsupported or contradicted claim as an exact quote. A full proposal takes about a minute. Offline, a narrower check flags any figure that appears nowhere in the facts, the RFP or the offline engine's own draft.
- **Project ranking** stays rule-based.
- **Fallback:** if a model fails, the proxy tries that job's backups. If all of them fail, the request uses the offline engine. Either way the badge turns amber, and its tooltip says what happened. A bad key, a spending cap (429) or AmaliAI being unreachable affect every model, so no backup is tried and the app switches to offline. Click **Re-check connection** to retry.

The proxy only runs inside `npm run dev` and `npm run preview`. A static deploy of `dist/` has no proxy, so it uses the offline engine. A production backend would host the same three endpoints (`/api/ai/status`, `/api/ai/models`, `/api/ai/chat`).

### Task routing

Each request names a job, and a line in `.env` says which model does it. The first name is the main model; names after a comma are backups, tried in order:

```
AMALIAI_MODEL_WRITE=gpt-5.6-terra,gpt-5.6-luna,qwen3p8-max
AMALIAI_MODEL_EXTRACT=gpt-5.6-terra,qwen3p8-max
AMALIAI_MODEL_ASSIST=gpt-5.6-luna,gpt-5.6-terra,deepseek-v4p1-flash
AMALIAI_MODEL_FACTCHECK=glm-5p3-flash,qwen3p8-max
```

If a line is missing, the defaults in `server/amaliai.ts` apply. These are the same as above:

| Job | Default model | Backups | Why |
| --- | --- | --- | --- |
| `write`: proposal sections | gpt-5.6-terra | gpt-5.6-luna, qwen3p8-max | The client reads this, so it gets the strongest writer |
| `extract`: reading the RFP | gpt-5.6-terra | qwen3p8-max | A missed requirement can lose a bid |
| `assist`: chat, rewrites, win themes | gpt-5.6-luna | gpt-5.6-terra, deepseek-v4p1-flash | Users wait on these; same family keeps the voice |
| `factcheck`: before export | glm-5p3-flash | qwen3p8-max | A different maker catches different mistakes; GLM checks a batch in ~35s, Qwen is slower |

To switch a model, change its name in `.env` and reload the app. No restart is needed. Keep all client-facing writing (`write`, plus `assist` for rewrites) in one model family so the tone doesn't feel stitched together. Approvers can also override a job's model from the sidebar badge, for testing, in that browser only. Everyone else sees the models read-only. If a model rejects the `temperature` setting, as some reasoning models do, the proxy retries without it.

## Demo data

Everything in `src/data/` is fictional: the company facts, mission, safety and quality programs (SafeHold, BuildRight), the Bastion Lens tech suite, awards, past projects, live stats, users, seeded proposals and the sample RFP. Items tagged **Verified** are the company's confirmed figures inside the demo story; items tagged **Sample** are placeholders, and the readiness check flags them before export.

## Next steps to make it production-ready

1. **Backend + single sign-on.** Real users and roles from the company's identity provider (for example Microsoft Entra ID).
2. **Live stats from operations data.** Feed the "Live performance" figures from the scaffold-tracking and field-reporting systems, so "Sample" disappears.
3. **Real experience library.** Load past projects and old winning proposals from document storage, and let the model search them (retrieval) instead of a fixed list.
4. **Word/PDF RFP upload.** Read .docx/.pdf RFPs directly. Today it's paste or .txt.
5. **Production AI backend.** Move the AI proxy into a real backend, with the key in a secrets manager and per-user rate limits.
6. **Shared storage and review comments.** Store proposals on the server, add reviewer comments, and turn share links into permissioned short links.
7. **Estimator hand-off.** Connect to an estimating tool so quantities and pricing flow into the Commercial section.
