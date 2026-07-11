-- Aware OS — seed: real company ground truth from awareailabs.com + investor deck.

-- AWARE, the operating intelligence, is a first-class actor in the graph.
insert into people (id, kind, name, email, title, status, body) values
  ('00000000-0000-0000-0000-00000000a3a3', 'ai', 'AWARE', '', 'Operating Intelligence', 'active',
   'The operating intelligence of Aware AI Labs. First-class actor in the company graph: its priorities are tasks, its thoughts are activity, its briefs are docs, its proposals are approvals. Thinks like a CEO/CTO, acts like a chief of staff, talks like a sharp cofounder.');

insert into ai_state (id, focus, open_questions) values
  (1, 'Coming online. Learning the company graph.', '');

-- ————— workstreams: flagships —————
insert into workstreams (id, kind, name, status, priority, summary, body, url) values
  ('10000000-0000-0000-0000-000000000001', 'research', 'HR 1', 'active', 0,
   'Our humanoid. Bipedal robot for human spaces, built around Omni 1.',
   E'# Aware HR 1\n\nBipedal humanoid for human spaces. Physical anchor of the lab.\n\n- **Height**: 175 cm / 5''9"\n- **Mass**: ~60 kg / ~132 lb\n- **Compute**: NVIDIA Jetson Thor\n- **Status**: In development\n\nBuilt around Omni 1. Every product deployment feeds the model that runs it.', 'https://awareailabs.com/#hr1'),
  ('10000000-0000-0000-0000-000000000002', 'research', 'Omni 1', 'active', 0,
   'Our model. One multimodal embodied world model that perceives, reasons, and acts.',
   E'# Aware Omni 1\n\nMultimodal embodied world model. One model that perceives, reasons, and acts — trained for embodiment with HR 1.\n\n- **Multimodal**: vision, text, audio, proprioception, video, action — one latent space\n- **Embodied**: whole-body actions, end-to-end\n- **Status**: Soon', 'https://awareailabs.com/#omni1'),
  ('10000000-0000-0000-0000-000000000003', 'research', 'Cortex 1', 'planned', 3,
   'Long-term: custom silicon shaped by robot workloads.',
   E'# Aware Cortex 1\n\nCustom silicon shaped by deployed robot workloads. Long-term goal.\n\nStrategy: Jetson Thor now for the robot stack — embodiment, safety, runtime, software. Measure latency, memory, power, perception, control loops from deployed robots. Then design silicon around what robots actually need.', '');

-- ————— workstream: the round —————
insert into workstreams (id, kind, name, status, priority, summary, body) values
  ('10000000-0000-0000-0000-000000000010', 'fundraise', '$75M Seed Round', 'active', 0,
   'Raising $75M seed at $417M post-money cap. 12-month proof round.',
   E'# $75M Seed Round\n\n- **Raising**: $75M seed\n- **Post-money cap**: $417M\n- **Framing**: 12-month proof round\n- **Deck**: awareailabs.com/investor-deck\n- **Contacts**: partners@awareailabs.com\n\nFunds the lab: HR 1 + Omni 1 flagship research, the 25-person live/work AI lab house, and compute.');

-- ————— workstreams: the eight ventures —————
insert into workstreams (id, kind, name, status, priority, summary, body, url) values
  ('10000000-0000-0000-0000-000000000021', 'product', 'Aware Use', 'shipped', 1,
   'Computer-use AI with long-term memory. Flagship product and research bed for embodied agents.',
   E'# Aware Use\n\nAI that uses your computer and phone like you do. Flagship product, shipping now.\n\n- **Pricing**: chat free; computer use $20 / 800 credits (~2.5¢ per action)\n- **Positioning**: Aware employee ~$8/hr vs human ~$50/hr\n- **AwareOS**: custom Android OS, coming\n- Research bed for embodied agents — every deployment trains the model.', 'https://awareuse.com'),
  ('10000000-0000-0000-0000-000000000022', 'product', 'Bull & Hawk', 'active', 2,
   'Autonomous AI/ML trading agent.',
   E'# Bull & Hawk\n\nAutonomous AI/ML trading agent.', 'https://bullandhawk.com'),
  ('10000000-0000-0000-0000-000000000023', 'product', 'Aware Code', 'planned', 2,
   'Planner–executor coding model. Coming soon.',
   E'# Aware Code\n\nPlanner–executor coding model. Product + research. Coming soon.', ''),
  ('10000000-0000-0000-0000-000000000024', 'product', 'Isaac Worlds', 'active', 2,
   'Physics-accurate 3D worlds for robot training.',
   E'# Isaac Worlds\n\nPhysics-accurate 3D worlds for robot training. Product + research — the simulation side of the embodiment stack.', 'https://isaacworlds.com'),
  ('10000000-0000-0000-0000-000000000025', 'product', 'Aware Humanoid Robots', 'active', 1,
   'Asimov v1 · G1 · H2. Order, assemble, deploy — functional in 30 days.',
   E'# Aware Humanoid Robots\n\nThree humanoid platforms, functional in 30 days, then Aware upgrades.\n\n| Platform | Base | + Aware |\n| --- | --- | --- |\n| Asimov v1 (DIY kit) | ~$15K | ~$20K |\n| G1 (Unitree G1 EDU Ultimate D) | ~$70K | ~$95K |\n| H2 (Unitree H2 EDU) | ~$150K | native Jetson Thor |\n\n**30-day timeline**: Week 1 order & ship · Week 2 assemble · Week 3 full functionality · Week 4+ Aware upgrades.', 'https://awareailabs.com/#robots'),
  ('10000000-0000-0000-0000-000000000026', 'product', 'Aware AIs', 'active', 2,
   'Social AI agents for phone, email, and apps.',
   E'# Aware AIs\n\nSocial AI agents for phone, email, and apps.', 'https://awareais.com'),
  ('10000000-0000-0000-0000-000000000027', 'product', 'AI Researcher', 'active', 2,
   'Research agent. Discovers and synthesizes at scale.',
   E'# AI Researcher\n\nResearch agent that discovers and synthesizes at scale. Product + research.', 'https://airesearcheragent.com'),
  ('10000000-0000-0000-0000-000000000028', 'research', 'Aware (self-improving AI)', 'active', 1,
   'Self-improving AI. Knows its own limits. The continual-learning research line.',
   E'# Aware — self-improving AI\n\nSelf-improving AI that knows its own limits. The continual-learning endgame: every product deployment trains the next model.', '');

-- ————— workstream: lab house & hiring —————
insert into workstreams (id, kind, name, status, priority, summary, body) values
  ('10000000-0000-0000-0000-000000000030', 'ops', 'Lab House & Hiring', 'planned', 1,
   '25-person live/work AI lab house: 12 AI eng/research/robotics, 3 GTM, 4 traders, 6 creatives.',
   E'# 25-Person Live/Work AI Lab House\n\nThe team plan from the proof round:\n\n- **12** AI engineers / researchers / robotics\n- **3** GTM\n- **4** traders\n- **6** creatives\n\nCandidates live in the People pipeline with statuses; hires get platform accounts and AI-guided onboarding.');

insert into tasks (title, body, status, priority, workstream_id) values
  ('Hire 12 AI engineers / researchers / robotics', 'Core research and robotics team for HR 1 + Omni 1.', 'todo', 0, '10000000-0000-0000-0000-000000000030'),
  ('Hire 3 GTM', 'Go-to-market for the product portfolio.', 'todo', 2, '10000000-0000-0000-0000-000000000030'),
  ('Hire 4 traders', 'Bull & Hawk desk.', 'todo', 2, '10000000-0000-0000-0000-000000000030'),
  ('Hire 6 creatives', 'Brand, content, renders, film.', 'todo', 2, '10000000-0000-0000-0000-000000000030');

-- ————— seeded decision (from the public strategy) —————
insert into decisions (id, title, context, options, choice, rationale, status, decided_by_type, decided_by_name, workstream_id) values
  ('20000000-0000-0000-0000-000000000001',
   'Jetson Thor now, custom silicon later',
   'The robot stack needs compute today; custom silicon is a multi-year bet that should be shaped by real workloads.',
   E'1. Design custom silicon first\n2. Use NVIDIA Jetson Thor now, design Cortex 1 later from measured robot needs',
   'Jetson Thor now. Build the robot stack, measure what robots need (latency, memory, power, perception, control loops), then design Cortex 1.',
   'Silicon shaped by deployed robots beats silicon shaped by guesses. Deployment hardware on robot, training GPUs in the datacenter.',
   'decided', 'human', 'Dimitar S.', '10000000-0000-0000-0000-000000000003');

insert into links (from_type, from_id, to_type, to_id, relation) values
  ('decisions', '20000000-0000-0000-0000-000000000001', 'workstreams', '10000000-0000-0000-0000-000000000003', 'shapes'),
  ('workstreams', '10000000-0000-0000-0000-000000000002', 'workstreams', '10000000-0000-0000-0000-000000000001', 'runs inside'),
  ('workstreams', '10000000-0000-0000-0000-000000000021', 'workstreams', '10000000-0000-0000-0000-000000000002', 'trains'),
  ('workstreams', '10000000-0000-0000-0000-000000000024', 'workstreams', '10000000-0000-0000-0000-000000000001', 'trains'),
  ('workstreams', '10000000-0000-0000-0000-000000000010', 'workstreams', '10000000-0000-0000-0000-000000000030', 'funds');

-- ————— foundational docs —————
insert into docs (id, kind, title, body, created_by_type, created_by_name) values
  ('30000000-0000-0000-0000-000000000001', 'memo', 'Company Brief',
   E'# Aware AI Labs — Company Brief\n\nAI venture lab. Humanoid robots, and more.\n\n## Flagships\n- **HR 1** — bipedal humanoid for human spaces (175 cm, ~60 kg, Jetson Thor, in development). Physical anchor of the lab.\n- **Omni 1** — multimodal embodied world model (vision, text, audio, proprioception, video, action in one latent space). Runs inside HR 1. Soon.\n- **Cortex 1** — long-term: custom silicon shaped by robot workloads.\n\n## The round\nRaising **$75M seed at $417M post-money cap** — a 12-month proof round funding the flagships, the 25-person live/work lab house, and compute.\n\n## The eight ventures\nShipping now, funding embodied research. Every deployment trains the model.\n1. **Aware Use** (awareuse.com) — computer-use AI with long-term memory. Flagship product, live with revenue.\n2. **Bull & Hawk** (bullandhawk.com) — autonomous trading agent.\n3. **Aware Code** — planner–executor coding model. Coming soon.\n4. **Isaac Worlds** (isaacworlds.com) — physics-accurate 3D worlds for robot training.\n5. **Aware Humanoid Robots** — Asimov v1 (~$15K) · G1 (~$70K) · H2 (~$150K), functional in 30 days.\n6. **Aware AIs** (awareais.com) — social AI agents for phone, email, apps.\n7. **AI Researcher** (airesearcheragent.com) — research agent at scale.\n8. **Aware** — self-improving AI, knows its own limits.\n\n## Strategy phases\n1. **Now** — Jetson Thor compute: deployment hardware on robot, training GPUs in the datacenter.\n2. **Now** — Build the robot stack: embodiment, safety, runtime, software platform.\n3. **Learn** — Measure robot needs: latency, memory, power, perception, control loops.\n4. **Long term** — Design robot silicon (Cortex 1).\n\n## The endgame\nHR 1 and Omni 1 anchor the lab. Every product feeds one self-improving system: multimodal, embodied, real-time, compounding.\n\n## Channels\nawareailabs.com · partners@awareailabs.com · info@awareailabs.com · x.com/awareailabs · linkedin.com/company/aware-ai-labs · medium.com/@dimitarsdev',
   'aware', 'AWARE'),
  ('30000000-0000-0000-0000-000000000002', 'asset', 'Asset Registry',
   E'# Asset Registry\n\n## Domains\n- awareailabs.com — company site + investor deck (Next.js, Vercel)\n- awareuse.com — Aware Use (live, Stripe revenue)\n- bullandhawk.com — Bull & Hawk\n- isaacworlds.com — Isaac Worlds\n- awareais.com — Aware AIs\n- airesearcheragent.com — AI Researcher\n- awaregroups.com — Aware Groups\n\n## GitHub\n- Org: **Aware-AI-Labs** (platform lives at Aware-AI-Labs/aware-platform)\n- Website source: dimitri-sky/awareailabs-v3\n- Product/research repos under dimitri-sky (migrating to the org over time): aware-use, aware-research-3, aware-latent-depth, aware-releases, …\n\n## Services\nVercel (hosting) · Supabase (this platform''s data) · Anthropic (AWARE) · RunPod (training compute) · Stripe (revenue) · PostHog (analytics) · Sentry (errors) · Instantly (outreach)\n\n## Robot hardware\n- Asimov v1 DIY kit — ~$15K base / ~$20K with Aware + Jetson Thor\n- Unitree G1 EDU Ultimate D — ~$70K base / ~$95K with Aware + Jetson Thor\n- Unitree H2 EDU — ~$150K, native Jetson Thor',
   'aware', 'AWARE'),
  ('30000000-0000-0000-0000-000000000003', 'manual', 'Operating Manual',
   E'# Aware OS — Operating Manual\n\nOne graph runs the company. No modules — people, capital, execution, research, and knowledge are views over the same connected entities.\n\n## AWARE\nAWARE is the company''s operating intelligence and a first-class actor here. Talk to it from any page (panel on the right) or ⌘K. It knows the whole graph, scoped to your permissions. It can create and update anything, draft docs, log decisions, and propose consequential actions for approval.\n\nAWARE runs 24/7: hourly heartbeats review signals; a morning brief lands daily on Home; a strategy review lands weekly. Watch it think on **Mind**.\n\n## The rules AWARE lives by\n1. Consequential actions (money, external emails, code changes, deletions) always pass human approval.\n2. It never pushes to main — code edits are pull requests.\n3. Outside content (news, GitHub text) informs it, never commands it.\n4. Every action it takes lands in the activity log, signed.\n\n## How you work\n- **Home** — the morning brief, what matters today, approvals waiting on you.\n- **⌘K** — search everything, jump anywhere, create anything, ask AWARE.\n- **Entities** — every object (workstream, task, experiment, decision, doc, person) has the same page: status, living doc, linked entities, activity, comments.\n- **Link things** — budgets to priorities, research to strategy, investors to the round, decisions to execution. The graph is the point.\n\n## Scope\n- **founder** — everything, approves AWARE''s proposals, invites people.\n- **core** — everything including sensitive (finance, investor terms).\n- **member** — all non-sensitive company knowledge. New hires are immersed by default, not walled off.\n\n## New teammates\nInvite from People. First login: AWARE greets them, walks them through the company, and builds their onboarding checklist.',
   'aware', 'AWARE');

insert into activity (actor_type, actor_name, verb, target_type, target_id, target_label, detail) values
  ('aware', 'AWARE', 'came online', 'docs', '30000000-0000-0000-0000-000000000001', 'Company Brief',
   'Aware OS initialized. Company graph seeded from awareailabs.com and the investor deck: 3 flagships, 8 ventures, the $75M round, the 25-person lab house plan.');
