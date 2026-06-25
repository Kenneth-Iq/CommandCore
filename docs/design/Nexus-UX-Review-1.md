# Nexus UX Review 1

## Purpose

This document reviews the current Nexus Console UI and defines the product and UX blueprint for the next build phase.

It is based on the current implemented frontend shell, dashboard pages, command bar placeholder, attention/event surfaces, and the current Beta-1 roadmap direction.

This is a design and product document only. It does not change source code.

## Current UI Surfaces Reviewed

- current navigation
- Executive Home
- Operations page
- Kernel Overview
- Mission Dashboard
- Agent Dashboard
- Tool Dashboard
- Conversation Dashboard
- Knowledge Dashboard
- Workspaces
- Settings placeholder
- Command Bar
- Event Feed
- Attention Panel
- visual hierarchy
- dashboard density
- dark command-centre aesthetic
- future Jarvis integration
- future portfolio/company/world navigation

## 1. What Is Working

### 1.1 Shell Framing

The current shell already communicates the correct product direction:

- left-side persistent navigation
- top-level command bar
- full-height dark operating surface
- strong framing that this is a command centre, not a consumer app

This is important. Nexus already feels more like an operations console than a landing page.

### 1.2 Executive Home Direction

The current Executive Home is the strongest page conceptually.

It is already answering the right operator questions:

- what is healthy
- what needs attention
- what is active
- what changed recently
- what runtime surfaces are available

This is the right foundation for Beta-1.

### 1.3 Live / Mock Clarity

The `Live API` versus `Mock Data` status treatment is working.

This is a permanent pattern candidate because:

- it reduces ambiguity immediately
- it supports demo and development workflows
- it gives trust context without requiring explanation

### 1.4 Attention Panel and Activity Feed

The existence of:

- an `Attention Panel`
- a `Live Activity Feed`
- tone-coded badges
- visible event sources and timestamps

is directionally correct.

These are the correct primitives for a kernel-facing operations product.

### 1.5 Dark Command-Centre Aesthetic

The current visual language is already better than a default dashboard scaffold:

- dark atmospheric background
- cold-blue plus warm-amber accent pairing
- rounded, dense panels
- restrained gradients
- surface layering

This gives Nexus a more intentional operational identity than a flat admin UI.

### 1.6 Strong Shared Patterns

Several shared patterns are already useful and should survive:

- `PageHeader`
- `SourceStrip`
- `MetricCard`
- `InfoPanel`
- `StatusBadge`
- event-oriented panel structure

These create enough consistency for users to build mental rhythm across pages.

## 2. What Feels Too Generic

### 2.1 Too Many Pages Still Use the Same Template

Several pages are still structurally interchangeable:

- Workspaces
- Settings placeholder
- some operations pages that differ only by one “hero” component

The product currently risks feeling like:

- one dashboard template with different labels

instead of:

- one operating system with purpose-built centres

This is the biggest current UX weakness.

### 2.2 Information Is Still Mostly Summary-Level

The UI is strong at summary and weak at inspection.

Current pages mostly provide:

- counts
- short lists
- recent events

They do not yet provide enough:

- drill-down logic
- object identity
- “why this matters now”
- relationship context between runtime surfaces

This makes the UI readable, but not yet deeply usable.

### 2.3 Event Feed Is Better Than Before but Still Too Flat

The event feed includes:

- event name
- timestamp
- source
- detail

But it still reads like a formatted log list rather than an operational event system.

It needs stronger:

- severity grouping
- object references
- cause/effect reading
- distinction between state-change events and informational events

### 2.4 Metric Cards Are Useful but Repetitive

The metric-card pattern is clear, but repeated grids of large-number cards on every page creates sameness.

The UI needs more page-specific composition:

- fewer repeated “4 big numbers”
- more purposeful mixtures of summary, status, and detail blocks

### 2.5 Sidebar Is Good but Not Yet Hierarchical Enough

The current navigation is cleaner than before, but still flat.

It does not yet visually express:

- Executive layer
- Operations layer
- Memory layer
- Portfolio layer
- System layer

That hierarchy matters if Nexus is going to become an actual daily command centre.

### 2.6 Settings Placeholder Feels Like a Generic Tail Page

It is acceptable as a placeholder, but it currently communicates:

- unfinished route

more than:

- intentional reserved control plane

That is fine for now, but it should not become the permanent pattern.

## 3. What Should Become the Permanent Nexus Design Language

The permanent Nexus design language should be:

- governed
- dense
- legible
- operational
- compositional
- calm under load

### Permanent language principles

- Nexus is not a marketing product.
- Nexus is not a standard admin panel.
- Nexus is not a chat app.
- Nexus is an operating surface for a governed AI system.

### Design language traits

- dark, high-focus command-centre visual tone
- layered glass-metal surfaces rather than flat cards
- dense but breathable panels
- explicit runtime status language
- event-first observability
- system relationship visibility
- “what changed / what matters / what next” structure

### Semantic rules

- blue = active / live
- green = healthy / ready
- amber = caution / review
- red = blocked / failed
- muted gray-blue = dormant / placeholder / unavailable

### Typography rules

- uppercase micro-labels for system framing
- large, restrained page titles
- compact metrics
- denser body copy than current consumer-style dashboard norms

## 4. Recommended Information Architecture

Nexus should evolve into a layered operating architecture, not just a list of pages.

### Recommended primary IA

#### Executive Layer

- Executive Home
- Governance
- Jarvis Command

#### Operations Layer

- Missions
- Agents
- Tools

#### Memory Layer

- Conversations
- Knowledge

#### Portfolio Layer

- Workspaces
- Companies
- Projects
- Capabilities

#### System Layer

- Health
- Settings

### Recommended navigation logic

The current flat nav should evolve into visually grouped sections.

Suggested group order:

1. Executive
2. Operations
3. Memory
4. Portfolio
5. System

### Recommended route philosophy

- Executive Home should remain the default route.
- Every page should answer one operating question clearly.
- No page should exist solely because backend data exists.

## 5. Recommended Visual System

### 5.1 Surface Model

Adopt a stable three-tier surface system:

- `Shell Surface`
  - app frame, sidebar, command bar
- `Primary Surface`
  - page headers, major hero panels, command-centre zones
- `Secondary Surface`
  - detail panels, cards, timelines, object lists

### 5.2 Grid System

Use a stable dashboard grid instead of ad hoc page grids:

- 12-column mental model on desktop
- 2-column collapse on laptop
- 1-column stack on mobile

Page sections should intentionally span the grid, for example:

- Executive hero spans 8 columns
- attention panel spans 4 columns
- event feed spans full width

### 5.3 Status System

Current `StatusBadge` is directionally correct and should stay, but expand into a fuller status system:

- status badge
- status dot
- status rail
- status section title
- status summary sentence

This prevents every state from being expressed only as a pill badge.

### 5.4 Event Styling

Events should eventually show:

- type
- source
- timestamp
- severity
- affected object
- short operational summary

Important event rows should read more like incident or mission telemetry than a generic activity list.

### 5.5 Density Rules

Nexus should be denser than a consumer dashboard, but not cluttered.

Recommended density rule:

- summary at top
- detail in middle
- event trace below

Avoid:

- giant empty cards
- over-spaced rows
- decorative-only whitespace

## 6. Recommended Page Structure

### 6.1 Executive Home

Permanent structure should be:

1. Command bar
2. Executive status strip
3. Critical summary band
4. Attention panel
5. Active runtime panels
6. Change panels
7. Live activity feed

Executive Home should answer:

- Is the system healthy?
- What needs intervention?
- What is currently active?
- What changed recently?
- Where should I go next?

### 6.2 Operations Pages

Operations pages should follow one consistent shape:

1. page framing
2. operational summary
3. primary object detail area
4. supporting context area
5. event/history strip

But each page should have a distinct centre of gravity:

- Missions = timeline + outcomes
- Agents = profiles + runtime state
- Tools = invocations + permissions
- Conversations = threads + context
- Knowledge = graph + scope

### 6.3 Kernel Overview

Kernel Overview should remain separate from Executive Home.

It should be:

- more technical
- more system-level
- more service-availability oriented

Executive Home is the operator landing page.
Kernel Overview is the infrastructure and runtime visibility page.

### 6.4 Workspaces / Portfolio

Workspaces should not stay a generic operations page.

It should become the entry point to:

- company
- project
- capability
- mission grouping

This will later become the portfolio/world navigation layer.

### 6.5 Settings

Settings should remain lightweight in Beta-1.

It should eventually contain:

- console preferences
- layout choices
- operator display density
- command routing preferences

But it should not become a dumping ground for unrelated controls.

## 7. Recommended Component Library

The next build phase should stabilize a lightweight Nexus component library around these primitives.

### Shell Components

- `AppShell`
- `Sidebar`
- `TopCommandBar`
- `SectionNav`
- `SourceStrip`

### Status Components

- `StatusBadge`
- `StatusDot`
- `StatusRail`
- `RuntimeChip`
- `SeverityLabel`

### Layout Components

- `PageHeader`
- `PageSection`
- `Panel`
- `DensePanel`
- `SplitPanel`
- `MetricBand`

### Data Components

- `MetricCard`
- `InfoPanel`
- `EntityList`
- `DetailCard`
- `KeyValueBlock`
- `StateSummaryCard`

### Event / Time Components

- `EventFeed`
- `Timeline`
- `ActivityRail`
- `HistoryTable`
- `AttentionPanel`

### Domain Components

- `MissionSummaryCard`
- `AgentProfileCard`
- `ToolInvocationCard`
- `ConversationThreadPreview`
- `KnowledgeScopeCard`
- `WorkspacePortfolioCard`

These should be small, composable, and domain-aware.

## 8. Risks / Avoid

### 8.1 Avoid Generic Admin Drift

Do not let Nexus collapse into:

- “card grid + table + activity feed” everywhere

That will make the product readable but forgettable.

### 8.2 Avoid Chat-First Drift

Jarvis matters, but Nexus should not become:

- a chat window with side metrics

Jarvis must sit inside a command-centre architecture, not replace it.

### 8.3 Avoid Premature Control Surfaces

Do not add write controls casually.

Before any write UX exists, Nexus must first be excellent at:

- visibility
- structure
- routing
- trust

### 8.4 Avoid Over-Coloring

The dark command-centre aesthetic is working partly because it is restrained.

Avoid:

- too many accent colors
- noisy glow effects
- dashboard-gaming visual gimmicks

### 8.5 Avoid Flat Navigation at Scale

As portfolio/company/world views grow, flat navigation will become confusing.

Navigation grouping should be addressed before Beta-1 grows too wide.

### 8.6 Avoid Placeholder Bloat

Placeholders are acceptable, but too many placeholder pages weaken trust.

If a page exists, it should:

- reveal something operationally meaningful
- or clearly declare itself a reserved surface

## 9. Beta-1 UI Priorities

### Priority 1

Make Executive Home excellent.

This is the single most important UI priority because it defines whether Nexus feels like:

- a real command centre

or:

- a collection of dashboards

### Priority 2

Differentiate the domain centres:

- Mission Centre
- Agent Centre
- Tool Centre
- Conversation Centre
- Knowledge Centre

Each must feel structurally distinct.

### Priority 3

Improve inspection depth.

Move from:

- counts and summaries

toward:

- entities
- object histories
- relationships
- operational context

### Priority 4

Stabilize the visual system.

Do not let each page invent itself independently.

### Priority 5

Prepare the Jarvis command surface without turning the product into a chat UI.

## 10. Locked Decisions for Next Build Phase

The following decisions should be treated as locked for the next Nexus build phase.

### Locked Decision 1

Executive Home remains the default landing page.

### Locked Decision 2

The global command bar remains present in the shell.

It can evolve, but it should stay as a permanent top-level operating affordance.

### Locked Decision 3

Nexus remains dark, dense, and command-centre oriented.

Do not pivot toward a bright, airy, generic SaaS dashboard style.

### Locked Decision 4

Event-driven observability remains central to the product.

Event feed, attention logic, and runtime state are core, not optional decoration.

### Locked Decision 5

The next page work must differentiate domain centres instead of cloning the same operations template.

### Locked Decision 6

Portfolio/company/world navigation must be planned as a first-class IA layer, not bolted on later.

### Locked Decision 7

Jarvis integration should begin as command routing and search UX, not AI chat behavior.

### Locked Decision 8

No backend writes are required for the next UX phase.

The immediate design gains should come from:

- better structure
- better read-only detail
- clearer information architecture
- stronger component discipline

## Final Summary

Nexus is already pointed in the right direction.

What exists now is not just a scaffold. It is an early but credible command-centre shell with the right product instincts:

- executive landing page
- command bar
- attention surface
- live activity
- runtime visibility

The main challenge is no longer “what kind of product is this?”

The main challenge is:

- making each centre structurally distinct
- increasing inspection depth
- locking a permanent design language
- preventing the UI from flattening into generic dashboard repetition

The next build phase should therefore prioritize:

- Executive Home refinement
- distinct domain centres
- stable component primitives
- stronger information architecture
- better event and state readability
