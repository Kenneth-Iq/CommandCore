# Planetary Operating Model

## 1. Purpose

Defines the full structural hierarchy described in `docs/vision/Jarvis-Nexus-Experience-Vision.md` §7, from Galaxy down to Event, and explains precisely how it relates to the Enterprise World Model already implemented in Nexus (`apps/nexus-console/src/worldModel.ts`, built across Beta-1). This is a definitional document, not an implementation plan — it exists so that when planets are eventually built, they extend the existing hierarchy rather than replacing or duplicating it.

## 2. The Hierarchy

From largest to smallest:

### 2.1 Galaxy

The full platform ecosystem. Everything the organization runs, across every strategic domain, under one governed CommandCore kernel. There is one galaxy per CommandCore deployment. The galaxy is never navigated directly by the user — it is the implicit container for everything else, the same way "the company" isn't a screen the user opens, but everything they do happens inside it.

### 2.2 Planet

A strategic domain or business world — a coherent area of the organization's life with its own companies, workspaces, and missions underneath it. A planet is not a folder or a label; it is a real operating world with depth (Experience Vision §11: "do not add planets as decorative navigation only").

Example planets:

- **Enterprise** — the core operating/governance domain (this is where today's single-portfolio Beta-1 implementation lives).
- **Education** — learning, training, and knowledge-transfer initiatives (e.g., a "MindX" company, per the Experience Vision's example conversation).
- **Safety** — risk, compliance, and incident-response domains.
- **Adventure** — exploratory, experimental, or growth-stage initiatives.
- **Commerce** — revenue-generating, customer-facing operations.
- **Health** — wellbeing, healthcare, or human-sustainability domains.
- **Infrastructure** — the technical and operational substrate the rest of the organization runs on.

A planet is the highest level the user is expected to navigate directly ("Planet Mode" in the Experience Vision §10).

### 2.3 Company

An operating, legal, or business entity inside a planet. This is the same `CompanyRecord` already implemented in the Enterprise World Model today (`companyId`, `name`, `mission`, `status`, `lifecycleState`, `projectIds`, `capabilityIds`, `agentIds`). A planet contains one or more companies; today's Beta-1 implementation has exactly one planet (implicitly "Enterprise") containing one company ("MindX Operations").

### 2.4 Workspace

An operational area within a company. Same `WorkspaceRecord` already implemented (`workspaceId`, `name`, `status`, `companyIds`, `projectIds`, `agentIds`, `capabilityIds`, knowledge boundary summary, asset/relationship counts). Unchanged by the planetary model — a workspace's relationship to its company does not change just because that company now sits inside a named planet rather than an implicit one.

### 2.5 Project

An initiative within a workspace. Same `ProjectRecord` already implemented (`projectId`, `name`, `companyId`, `status`, `lifecycleState`, `capabilityIds`, `agentIds`, `mission`, `outcome`, `nextActionSummary`). Unchanged by the planetary model.

### 2.6 Mission

An executable objective within a project. Same `MissionRecord`/`Mission` contract already implemented and governed by the Mission Engine, Policy Gate, and (in Beta-2+) the Mission Commands Architecture. Unchanged by the planetary model.

### 2.7 Agent

An actor that does work — registered, capability-matched, and runtime-tracked exactly as today's Agent Centre already shows. Unchanged by the planetary model.

### 2.8 Tool

A capability or action an agent can use — registered, permission-tiered, and invocation-tracked exactly as today's Tool Centre already shows. Unchanged by the planetary model.

### 2.9 Knowledge

Memory and context, linked across missions, conversations, and projects via the existing scope model (`workspace` / `company` / `project` / `mission` scope kinds). Unchanged by the planetary model — knowledge scopes do not need a `planet` scope kind added; a knowledge asset's planet is always resolvable by walking up through its existing workspace/company/project scope to whichever planet that company belongs to.

### 2.10 Conversation

A human/Jarvis dialogue — the connective tissue tying intent to execution, per the Jarvis Conversation Architecture. A conversation's planet, like knowledge, is resolved by walking up through its existing workspace/company/project/mission links, not by adding a new direct field.

### 2.11 Event

The atomic unit beneath everything else: a domain event published to EventBus and appended to EventStore, exactly as already specified in the Engineering Bible (§4, Event Rules) and the Write Capability Architecture. Every mission status change, agent assignment, tool invocation, and conversation message is, underneath, an event. Events do not belong to a planet directly — they belong to the entity that emitted them, and that entity's planet is resolved the same way as for knowledge and conversations. This is intentional: adding a `planet_id` to every event would create a second, redundant way to answer a question the existing scope/ownership hierarchy already answers correctly.

## 3. How Planets Sit Above The Existing Enterprise World Model

The Enterprise World Model already implemented in Nexus is exactly the Company → Workspace → Project → {Mission, Conversation, Knowledge, Agent, Tool} portion of this hierarchy (see `worldModel.ts`'s `buildWorldTree()`, currently rooted at a single implicit "Portfolio" node). The planetary model adds exactly two layers above what already exists:

```text
Galaxy                          (new — the platform ecosystem, implicit, not navigated directly)
  └── Planet                    (new — e.g. Enterprise, Education, Safety)
        └── Company             (existing — CompanyRecord)
              └── Workspace      (existing — WorkspaceRecord)
                    └── Project   (existing — ProjectRecord)
                          ├── Mission       (existing — MissionRecord)
                          ├── Conversation  (existing — ConversationRecord)
                          ├── Knowledge     (existing — KnowledgeAssetRecord)
                          ├── Agent         (existing — AgentProfile)
                          └── Tool          (existing — ToolRecord)
```

Concretely, this means:

- Today's `buildWorldTree()` root node (currently labeled "Portfolio") becomes one Planet node among potentially several, not a renamed Galaxy. The Galaxy is the unnavigated container; the Planet is the first real navigable layer above Company.
- `PortfolioExplorerData` (`workspaces`, `companies`, `projects`, `capabilities`) becomes scoped per planet rather than being the single global list it is today — a `PlanetRecord` would carry a `companyIds` list (or equivalent) the same way a `CompanyRecord` carries `projectIds` today, extending the existing pattern rather than inventing a new one.
- The Context Breadcrumb (`Portfolio > Company > Workspace > Project > Mission`, per the Experience Vision §2's literal breadcrumb example) gains one more leading segment: `Galaxy` is implicit (never shown, the same way "the company" is never a breadcrumb segment in a real org chart), and `Planet` becomes the new leftmost visible segment: `Planet > Company > Workspace > Project > Mission`.
- Every existing relationship derivation in `worldModel.ts` (`resolveContext`, `buildRelationshipCard`, `buildImpactAnalysis`) continues to work unchanged for anything at or below Company — they simply gain one more level of "Belongs To" ancestry (the Planet) once a company's planet membership is resolvable.

No existing entity (Mission, Agent, Tool, Knowledge, Conversation) needs a new direct field to support planets. Planet membership is always resolved by walking up through Company, exactly as Workspace and Project membership are resolved today. This is a deliberate continuity decision: the planetary model is additive scaffolding above the existing hierarchy, not a parallel structure requiring data migration of everything beneath it.

## 4. Example Planets In Practice

Using the naming from the Experience Vision §7:

- **Enterprise** planet contains the company(ies) running CommandCore/Nexus/Jarvis itself — today's single seeded "MindX Operations" company lives here.
- **Education** planet would contain a learning-focused company (the Experience Vision's own example: "MindX has new learner activity worth reviewing" suggests an Education-planet company, distinct from the Enterprise-planet "MindX Operations" — naming overlap between examples is coincidental to this document, not a structural claim that they are the same entity).
- **Safety** planet would contain companies or workspaces focused on risk, compliance, or incident response — a natural home for CRO-cabinet-flavored missions (per the Experience Vision §8).
- **Commerce**, **Health**, **Infrastructure**, **Adventure** planets follow the same pattern: each is a real strategic domain with its own companies, workspaces, projects, and missions, not a tag applied to existing ones.

A user should be able to ask Jarvis "how is the Education planet doing?" and receive a real answer derived from real companies/workspaces/projects/missions scoped to that planet — never a hardcoded or decorative response. If a planet cannot answer that question with real data, it should not exist yet as a navigable planet (Experience Vision §11).

## 5. Non-Goals

- This document does not specify how planets are created, who can create them, or what governs cross-planet visibility — that is a Beta-2+ permissions and write-capability question (see Permissions Architecture and Mission Commands Architecture), not a structural one.
- This document does not specify a UI design for planet navigation. It only specifies the data hierarchy and its relationship to the existing Enterprise World Model.
- This document does not require multiple planets to exist before Version 1. A single-planet deployment (today's implicit "Enterprise" planet) remains a valid, complete configuration of this model — planets are a ceiling this architecture supports, not a floor every deployment must populate.

## 6. Risks

- Treating "Planet" as a cosmetic rename of "Portfolio" rather than a real new scoping layer would satisfy this document's letter while violating its and the Experience Vision's intent (§11: "do not add planets as decorative navigation only").
- If planet scoping is implemented as a new direct field on every downstream entity (Mission, Conversation, Knowledge, etc.) instead of being resolved by walking up through Company, every future entity type will need the same field added again, repeating the same mistake the existing scope-walking pattern already avoids.
- Multiple planets with overlapping or duplicate companies (the same legal entity appearing under two planets) would break the "walk up to resolve planet" approach in §3 and needs to be explicitly disallowed once planets are actually implemented, not left ambiguous.
