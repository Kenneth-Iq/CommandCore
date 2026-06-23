# CommandCore MVP PRD

**Product:** CommandCore  
**Working tagline:** Your private command centre for projects, clients, runbooks, access maps, research, ideas, and next actions.  
**Version:** 0.1 MVP PRD  
**Owner:** Kenneth Jones  
**Primary users for first build:** Kenneth + partner  
**Product direction:** Local-first personal productivity OS that can later be monetised and sold to builders, freelancers, consultants, small agencies, and technical founders.  
**Created:** 2026-06-17  

---

## 1. Executive Summary

CommandCore is a local-first productivity and operations platform for people who manage many projects, clients, tools, accounts, domains, hosting providers, codebases, runbooks, GitHub reviews, hardware research, ideas, and next actions.

The first version is built for Kenneth and partner as a private local productivity OS. However, it must be architected as a future commercial product from day one.

The main problem CommandCore solves:

> “I have too many projects, accounts, links, local commands, client systems, GitHub experiments, ideas, and hardware notes scattered everywhere. I forget where things are, how to access them, how to run them, and what I was supposed to do next.”

CommandCore should become the single searchable control room that answers:

- What is this project?
- Where is the code?
- Where is it hosted?
- What URLs are used?
- What login or vault item should I use?
- How do I run it locally?
- What client is it linked to?
- What GitHub repos or experiments are linked?
- What hardware items are being reviewed?
- What decisions were made?
- What is the next action?

---

## 2. Product Vision

CommandCore should become a sellable local-first productivity OS for builders and technical operators.

It is not a generic task manager, not a generic wiki, and not a password manager.

It is a structured project operations memory system.

### 2.1 Long-Term Vision

CommandCore helps users manage the hidden operational mess behind modern projects:

- Domains
- DNS
- Hosting
- Repos
- Replit/Vercel/DigitalOcean deployments
- Local launch instructions
- Databases
- Admin URLs
- Client systems
- Payment providers
- Email/SMS providers
- GitHub experiments
- Hardware research
- Product ideas
- Decisions
- Next actions

### 2.2 Product Promise

> CommandCore keeps your project maps, client systems, runbooks, login references, research notes, ideas, and next actions in one private searchable workspace.

### 2.3 First Build Goal

Build a local-first MVP that Kenneth and partner can actually use every day.

The MVP must be simple, fast, structured, and useful before any AI, sync, billing, or team collaboration is added.

---

## 3. Core Principles

### 3.1 Local-First

The first version runs locally on the user’s machine.

Required:

- Local database
- Local file storage
- No mandatory cloud dependency
- Backup/export available
- Works offline after installation

Recommended MVP stack:

- Next.js
- TypeScript
- Prisma
- SQLite
- Local file uploads
- Simple local authentication

### 3.2 No Secrets Stored

CommandCore must not store:

- Passwords
- API keys
- Private keys
- Secret tokens
- Database passwords
- Recovery codes
- 2FA backup codes

CommandCore stores only vault references.

Example:

```text
Vault item: Teachfolk - DigitalOcean - Production - Admin
```

Not:

```text
Actual password, token, or secret
```

### 3.3 Structured Memory

Everything important should link to one or more of:

- Project
- Client
- Runbook
- Account map item
- GitHub review
- Hardware item
- Idea
- Decision
- Next action

### 3.4 Search-First

A universal search bar is a core feature, not an afterthought.

Search must find:

- Projects
- Clients
- URLs
- Vault references
- Runbooks
- Local commands
- GitHub repos
- Hardware items
- Ideas
- Decisions
- Notes
- Tags

### 3.5 Every Item Needs a Decision or Next Action

CommandCore should reduce mental clutter.

Items should not sit forever as vague “interesting” notes.

Where relevant, each item should have:

- Status
- Decision
- Next action
- Last reviewed date

---

## 4. Target Users

### 4.1 Primary MVP User: Kenneth

Kenneth manages:

- Own products
- Private projects
- Work projects
- Client projects
- Replit builds
- GitHub reviews
- Local development systems
- Domains and hosting
- Hardware research
- Ideas and monetisation opportunities

### 4.2 Secondary MVP User: Partner

Partner needs access to selected project memory, links, next actions, and shared notes.

### 4.3 Future Paid Users

Potential commercial users:

- Freelancers
- Indie hackers
- Developers
- Consultants
- Small agencies
- Technical founders
- IT service providers
- Product builders
- Fractional CTOs
- Operations managers in small teams

---

## 5. Key Problems to Solve

### 5.1 Scattered Project Memory

Current information is spread across:

- Replit
- GitHub
- Slack
- Monday.com
- ClickUp
- Vercel
- DigitalOcean
- Cloudflare
- GoDaddy
- Google Workspace
- Stripe
- Mailgun
- Send.com
- Local PC folders
- DBeaver
- PostgreSQL
- Browser tabs
- Notes
- Chat history

### 5.2 Access Confusion

The user forgets:

- Which admin login belongs to which project
- Which user login belongs to which environment
- Which client super user belongs where
- Which URL is production, staging, test, or local
- Which vault item contains the login

### 5.3 Local Dev Confusion

The user needs to remember:

- How to launch frontend
- How to launch API
- Which local folders are used
- Which database is used
- Which DBeaver profile to use
- Which environment file is needed
- Common errors and fixes

### 5.4 Research Overload

The user reviews many GitHub projects and tools:

- Hermes-Claw
- Odysseus
- OpenMythos
- Plantair
- ClickHouse-related projects
- Context-window engines
- Other monetisable repos

Need to track:

- Why reviewed
- Install/run status
- Local errors
- Commercial potential
- Licence risk
- Security concerns
- Decision

### 5.5 Hardware Research Overload

For projects like Tirra / Linkff 100km WiFi bridging, the user needs to track:

- Hardware items found
- Supplier links
- Prices
- Specs
- Compatibility
- Distance ratings
- Mounting/power requirements
- Shortlist/reject decisions

### 5.6 Ideas Disappearing

The user needs a structured Ideas Lab where ideas can be captured without becoming distractions.

---

## 6. Product Scope

## 6.1 MVP Scope

The MVP must include:

1. Local authentication
2. Workspace
3. Dashboard
4. Projects
5. Clients
6. Accounts Map
7. Vault References
8. Runbooks
9. Local Commands
10. GitHub Review Lab
11. Tools Lab
12. Hardware Scratchpad
13. Ideas Lab
14. Notes
15. Decisions
16. Next Actions
17. Links
18. Tags
19. Universal Search
20. Backup/export
21. Seed data for Kenneth’s initial projects

---

## 6.2 Explicitly Out of Scope for MVP

Do not build these in MVP:

- Cloud sync
- Billing
- Public SaaS accounts
- Team permissions beyond basic owner/member
- AI assistant
- Browser extension
- Native mobile app
- Slack integration
- ClickUp integration
- Monday.com integration
- Google Drive integration
- GitHub OAuth
- Automatic domain scanning
- Real password manager
- Secret storage
- Client-facing portal
- Advanced analytics
- Complex notifications
- Calendar integration

These can come in later phases.

---

## 7. Product Modules

---

# 7.1 Dashboard

## Purpose

The dashboard is the daily command centre.

It should answer:

- What should I focus on today?
- What projects did I recently touch?
- What is blocked?
- What needs review?
- Which ideas need decisions?
- Which systems are missing runbooks?
- Which projects have no next action?

## MVP Dashboard Components

1. Today’s Focus
2. Next Actions
3. Recently Updated Projects
4. Blocked Items
5. GitHub Reviews in Testing
6. Hardware Items in Reviewing/Shortlisted
7. Ideas Needing Decision
8. Missing Runbooks
9. Quick Add buttons

## Dashboard Quick Add Buttons

- Add Project
- Add Client
- Add Runbook
- Add GitHub Review
- Add Hardware Item
- Add Idea
- Add Next Action
- Add Note

## Dashboard Acceptance Criteria

- User can see top next actions immediately.
- User can click into any item.
- User can filter by owner, project, client, or status.
- Dashboard loads quickly on local machine.
- Empty state gives useful starter prompts.

---

# 7.2 Projects

## Purpose

The Project Register is the spine of CommandCore.

Every meaningful item should be linkable to a project.

## Example Projects for Seed Data

- MindX
- Hatchling Heroes
- Jarvis
- Teachfolk
- Refiant.ai
- Tirra / Linkff WiFi Bridge
- Plantair Test
- ClickHouse Test
- Other Replit Apps

## Project Fields

Required:

- Project name
- Project type
- Status
- Description
- Owner
- Next action
- Last worked on

Optional but important:

- Main URL
- Admin URL
- API URL
- Repo URL
- Replit URL
- Local folder path
- Hosting provider
- Database provider
- Domain registrar
- DNS provider
- Email provider
- SMS/WhatsApp provider
- Payment provider
- Client
- Vault references
- Tags
- Notes

## Project Types

- Own Product
- Client Project
- Private Project
- Test Project
- GitHub Review
- Hardware Project
- Idea
- Utility Tool
- Archived

## Project Statuses

- Inbox
- Active
- Paused
- Testing
- Blocked
- Waiting on Client
- Ready to Build
- Build Later
- Live
- Archived
- Rejected

## Project Detail Tabs

Each project page should have tabs:

1. Overview
2. Links
3. Accounts Map
4. Runbooks
5. Local Commands
6. Notes
7. Decisions
8. Next Actions
9. GitHub Reviews
10. Hardware
11. Ideas
12. Files/Attachments

## Resume Panel

Each project must have a “Resume Where I Left Off” panel:

- Last worked on
- Last note
- Last decision
- Current blocker
- Next action
- Important links
- Primary runbook

## Project Acceptance Criteria

- User can create, edit, archive, and search projects.
- User can link projects to clients.
- User can link projects to runbooks, account map items, GitHub reviews, hardware items, ideas, notes, decisions, and next actions.
- User can see what to do next from the project page.
- User can find a project from universal search.

---

# 7.3 Clients

## Purpose

The Client Register tracks clients and their systems.

## Example Clients

- Refiant.ai
- Teachfolk
- Tirra
- Internal / iQoora

## Client Fields

Required:

- Client name
- Status
- Primary contact name
- Notes

Optional:

- Contact email
- Contact phone
- Slack workspace
- ClickUp workspace
- Monday.com board
- Google Workspace account
- Main domain
- Domains
- Hosting platforms
- DNS platforms
- Email platforms
- Payment platforms
- Related projects
- Vault references
- Warnings
- Next action

## Client Detail Tabs

1. Overview
2. Contacts
3. Projects
4. Links
5. Accounts Map
6. Runbooks
7. Notes
8. Decisions
9. Next Actions

## Client Acceptance Criteria

- User can add a client and link projects to it.
- User can store external system links.
- User can see which platforms the client uses.
- User can store vault reference names only, not secrets.

---

# 7.4 Accounts Map

## Purpose

The Accounts Map tracks where accounts exist and which vault item should be used.

It does not store passwords.

## Account Map Examples

- Teachfolk - DigitalOcean - Production - Admin
- Teachfolk - Stripe - Production - Admin
- Teachfolk - PostgreSQL - Local - DBeaver
- Refiant - Vercel - Production - Admin
- Refiant - Google Workspace - Kenneth Account
- MindX - Cloudflare R2 - Production - Admin
- Jarvis - Replit - Dev - Owner

## Account Map Fields

Required:

- Service name
- Account type
- Environment
- Vault reference
- Related project or client

Optional:

- URL
- Login username/email
- Notes
- Recovery owner
- 2FA location reference
- Status
- Last verified

## Account Types

- Admin
- User
- Client Super User
- Developer
- Owner
- Billing
- Database
- API
- Service Account
- Local
- Test

## Environments

- Local
- Development
- Test
- Staging
- Production
- Demo
- Unknown

## Security Rules

Never store:

- Password
- API key
- Private key
- DB password
- OAuth secret
- Token
- Recovery code

Only store:

- Vault item name
- Vault name
- Username/email if safe
- URL
- Non-secret notes

## Acceptance Criteria

- User can create and link account map records.
- User can search by service, project, client, URL, vault reference, or environment.
- UI clearly warns: “Do not store secrets here.”
- Any field named password, apiKey, secret, token, or privateKey must be rejected or renamed.

---

# 7.5 Vault References

## Purpose

Vault References point users to the correct item in their external password manager.

## Vault Reference Fields

- Display name
- Vault provider
- Vault name
- Item name
- Related project
- Related client
- Related account map item
- Notes
- Last verified

## Vault Providers

- 1Password
- Bitwarden
- Apple Passwords
- Google Password Manager
- Other
- Unknown

## Acceptance Criteria

- User can store vault references without storing secrets.
- Vault reference can link to account map item.
- Vault reference can be searched globally.

---

# 7.6 Runbooks

## Purpose

Runbooks explain how to operate, launch, test, recover, or deploy a project.

## Runbook Types

- Local Frontend
- Local API
- Local Database
- Production Check
- Deployment
- Recovery
- Backup
- Resize/Infrastructure
- Testing
- General

## Runbook Fields

Required:

- Title
- Related project
- Environment
- Runbook type
- Steps
- Last tested

Optional:

- Required tools
- Required folders
- Required env files
- Common errors
- Verification steps
- Rollback steps
- Warnings
- Related account map items
- Related links

## Example Runbook Template

```markdown
# RUNBOOK - Project Name - Local API

## Purpose
Explain what this runbook does.

## Environment
Local / Test / Production

## Folder
C:\Projects\ProjectName\api

## Required Tools
- Node.js
- PostgreSQL
- DBeaver

## Required Env Files
- .env.local
- .env

## Commands
```bash
npm install
npm run dev
```

## Verification
- Open http://localhost:8000/health
- Confirm database connection
- Confirm logs show no errors

## Common Errors
### Error
Description

### Fix
Steps

## Warnings
Do not delete old server until rollback window is complete.

## Last Tested
YYYY-MM-DD
```

## Acceptance Criteria

- User can create runbooks with markdown.
- User can link runbooks to projects, clients, account items, and local commands.
- User can mark last tested date.
- Dashboard can show runbooks not tested recently.
- Universal search finds text inside runbooks.

---

# 7.7 Local Commands

## Purpose

Local Commands store safe commands for running systems locally.

They do not store secrets.

## Fields

- Command name
- Related project
- Environment
- Working directory
- Command
- Description
- Required tools
- Safe to run?
- Last tested
- Notes

## Examples

```bash
npm run dev
```

```bash
npm run start
```

```bash
docker compose up
```

## Safety Rules

Do not allow storing destructive commands without warning.

Commands containing the following must show a warning:

- rm -rf
- del /s
- drop database
- truncate
- destroy
- delete
- format
- shutdown
- reboot
- chmod 777
- production database commands

## MVP Acceptance Criteria

- User can store commands.
- User can copy commands.
- CommandCore does not execute commands in MVP.
- Execution may be considered later only with strong safety controls.

---

# 7.8 GitHub Review Lab

## Purpose

Track GitHub projects being reviewed for reuse, learning, testing, or monetisation.

## Example GitHub Reviews

- Hermes-Claw
- Odysseus
- OpenMythos
- Plantair
- ClickHouse
- Context Window Engine
- PDF tools
- HEIC converters
- AI agent frameworks

## Fields

Required:

- Repo name
- GitHub URL
- Status
- Why reviewing
- Decision
- Next action

Optional:

- Related project
- Category
- Licence
- Stars
- Last commit date
- Main language
- Stack
- Install difficulty
- Local folder
- Local run instructions
- Dependencies
- Docker required
- Database required
- API keys needed
- Works on Windows?
- Works on Replit?
- Works locally?
- Test notes
- Errors found
- Fixes needed
- Security concerns
- Commercial risk
- Monetisation potential
- Useful components
- Tags

## Statuses

- To Review
- Downloaded
- Testing
- Running
- Broken
- Useful Component
- Monetisation Candidate
- Rejected
- Archived

## Monetisation Potential

- None
- Low
- Medium
- High
- Unknown

## Commercial Risk

- Low
- Medium
- High
- Unknown

## Acceptance Criteria

- User can add a GitHub repo manually.
- User can track review status.
- User can link repo to Jarvis, MindX, Refiant, or other projects.
- User can track how to run locally.
- User can record decision: Use / Fork / Rebuild / Ignore / Archive.
- User can filter by Monetisation Candidate.

---

# 7.9 Tools Lab

## Purpose

Track utility tools that may become features inside Jarvis or standalone micro-SaaS products.

## Example Tools

- PDF editor
- PDF splitter
- PDF merger
- PDF compressor
- HEIC to JPG converter
- Image converter
- OCR tool
- File conversion tools
- AI agent tools
- Media tools

## Fields

- Tool name
- Category
- Related project
- Source repo/library
- User problem solved
- Free or paid
- Legal risk
- Backend required?
- Storage required?
- Queue required?
- Browser-only possible?
- API required?
- Status
- Test notes
- Monetisation model
- Next action

## Legal Risk Levels

- Low
- Medium
- High
- Unknown

## Important Note

Tools involving media downloads, especially MP3 downloading, must be flagged for legal review before public release or monetisation.

## Acceptance Criteria

- User can track tools as product ideas or features.
- User can link tools to Jarvis.
- User can filter by legal risk and monetisation potential.

---

# 7.10 Hardware Scratchpad

## Purpose

Track hardware found for review, especially for technical projects like Tirra / Linkff 100km WiFi bridging.

## Example Categories

- WiFi bridging
- Antennas
- Routers
- Masts
- Solar
- Batteries
- PoE injectors
- Outdoor enclosures
- IoT sensors
- Security hardware
- Networking gear

## Fields

Required:

- Item name
- Category
- Status
- Related project
- Supplier / website
- Link
- Decision
- Next action

Optional:

- Price
- VAT included?
- Shipping
- Availability
- Specs
- Power requirement
- Mounting requirement
- Weatherproof rating
- Distance rating
- Compatibility
- Pros
- Cons
- Questions
- Review notes
- Last reviewed

## Statuses

- Found
- Reviewing
- Shortlisted
- Rejected
- Purchased
- Installed
- Watch Price
- Archived

## Acceptance Criteria

- User can add hardware items.
- User can link hardware to projects and clients.
- User can track prices and decisions.
- User can filter by shortlisted or watch price.
- User can search supplier links and specs.

---

# 7.11 Ideas Lab

## Purpose

Capture ideas without letting them pollute active work.

## Idea Statuses

- Raw
- Validating
- Build Later
- Active
- Killed
- Archived

## Fields

- Idea name
- Problem it solves
- Who it helps
- Why now
- Related project
- Revenue idea
- Build difficulty
- Validation step
- Status
- Decision
- Next action
- Notes
- Tags

## Decision Options

- Build
- Test
- Build Later
- Kill
- Archive
- Needs Research

## Acceptance Criteria

- User can capture ideas quickly.
- Ideas can be promoted to projects.
- Ideas can be linked to GitHub reviews, tools, or clients.
- Dashboard shows ideas that need a decision.

---

# 7.12 Notes

## Purpose

General markdown notes linked to any object.

## Fields

- Title
- Body markdown
- Related object type
- Related object id
- Tags
- Created by
- Updated at

## Acceptance Criteria

- User can add notes to projects, clients, GitHub reviews, tools, hardware, and ideas.
- Notes are searchable.
- Notes support markdown.

---

# 7.13 Decisions

## Purpose

Capture why a decision was made so the user does not keep re-deciding the same thing.

## Fields

- Title
- Decision summary
- Context
- Options considered
- Chosen option
- Reason
- Related project
- Related client
- Related item
- Decision date
- Decided by
- Review date
- Outcome

## Acceptance Criteria

- User can record a decision.
- Decisions appear on related project/client pages.
- Decisions are searchable.
- Dashboard can show recent decisions.

---

# 7.14 Next Actions

## Purpose

Provide a simple action layer without becoming a bloated task manager.

## Fields

- Title
- Description
- Related project
- Related client
- Related item
- Owner
- Status
- Priority
- Due date
- Created date
- Completed date

## Statuses

- Open
- In Progress
- Blocked
- Waiting
- Done
- Cancelled

## Priority

- Low
- Medium
- High
- Critical

## Acceptance Criteria

- User can create next actions from any page.
- Dashboard shows open next actions.
- Project pages show next actions.
- User can mark actions done.
- User can filter by owner.

---

# 7.15 Links

## Purpose

Store external links in a structured way.

## Fields

- Title
- URL
- Link type
- Related project
- Related client
- Related item
- Notes
- Tags

## Link Types

- Main URL
- Admin URL
- API URL
- GitHub
- Replit
- Vercel
- DigitalOcean
- Cloudflare
- GoDaddy
- Stripe
- Mailgun
- Send.com
- Slack
- ClickUp
- Monday
- Google Workspace
- Supplier
- Documentation
- Other

## Acceptance Criteria

- User can store and search links.
- User can link them to records.
- URLs open in new tab.
- Duplicate URL detection warning.

---

# 7.16 Tags

## Purpose

Flexible grouping.

## Example Tags

- Replit
- Production
- Local
- AI
- SaaS
- Monetisation
- Hardware
- Client
- Urgent
- Missing Runbook
- Needs Review
- Security Check
- Legal Review

## Acceptance Criteria

- User can add tags to major records.
- User can filter by tag.
- Tags appear in search.

---

# 7.17 Universal Search

## Purpose

One search bar for the whole workspace.

## Searchable Entities

- Projects
- Clients
- Account Map
- Vault References
- Runbooks
- Local Commands
- GitHub Reviews
- Tools
- Hardware Items
- Ideas
- Notes
- Decisions
- Next Actions
- Links
- Tags

## Search Examples

User should be able to search:

```text
teachfolk stripe
```

```text
refiant vercel
```

```text
jarvis odysseus
```

```text
cloudflare r2 mindx
```

```text
tirra wifi bridge
```

```text
how to run teachfolk api
```

```text
plantair local setup
```

```text
heic jpg tool
```

## MVP Implementation

Use SQLite FTS5 or a simple indexed search first.

Search results should show:

- Entity type
- Title
- Snippet
- Related project/client
- Status
- Last updated
- Link to open

## Acceptance Criteria

- Search returns useful results across all major modules.
- Search works locally.
- Search results are grouped by entity type.
- Search results open the correct record.

---

## 8. Information Architecture

## 8.1 Main Navigation

Left sidebar:

```text
Dashboard
Projects
Clients
Accounts Map
Runbooks
GitHub Lab
Tools Lab
Hardware
Ideas
Search
Settings
```

## 8.2 Secondary Navigation

Inside project/client detail pages:

```text
Overview
Links
Accounts
Runbooks
Commands
Notes
Decisions
Actions
Related
```

## 8.3 Quick Add Menu

Global button:

```text
+ Project
+ Client
+ Account Map Item
+ Runbook
+ GitHub Review
+ Tool
+ Hardware Item
+ Idea
+ Note
+ Decision
+ Next Action
+ Link
```

---

## 9. Data Model

## 9.1 Recommended MVP Database

Use SQLite for MVP with Prisma.

Later upgrade path:

- PostgreSQL for cloud/team version
- Meilisearch or Typesense for advanced search
- S3/R2 for cloud attachments
- Encrypted sync later

---

## 9.2 Entities

### Workspace

- id
- name
- slug
- createdAt
- updatedAt

### User

- id
- workspaceId
- name
- email
- role
- passwordHash
- createdAt
- updatedAt

Roles:

- owner
- member

### Project

- id
- workspaceId
- name
- slug
- type
- status
- description
- mainUrl
- adminUrl
- apiUrl
- repoUrl
- replitUrl
- localFolder
- hostingProvider
- databaseProvider
- domainProvider
- dnsProvider
- emailProvider
- smsProvider
- paymentProvider
- clientId
- ownerId
- lastWorkedOn
- nextActionText
- createdAt
- updatedAt
- archivedAt

### Client

- id
- workspaceId
- name
- status
- description
- primaryContactName
- contactEmail
- contactPhone
- slackUrl
- clickupUrl
- mondayUrl
- googleWorkspaceAccount
- mainDomain
- notes
- warnings
- createdAt
- updatedAt
- archivedAt

### AccountMapItem

- id
- workspaceId
- projectId
- clientId
- serviceName
- accountType
- environment
- url
- usernameOrEmail
- vaultReference
- vaultProvider
- notes
- status
- lastVerifiedAt
- createdAt
- updatedAt

### VaultReference

- id
- workspaceId
- projectId
- clientId
- accountMapItemId
- displayName
- vaultProvider
- vaultName
- itemName
- notes
- lastVerifiedAt
- createdAt
- updatedAt

### Runbook

- id
- workspaceId
- projectId
- clientId
- title
- type
- environment
- bodyMarkdown
- requiredTools
- requiredFolders
- requiredEnvFiles
- commonErrors
- verificationSteps
- rollbackSteps
- warnings
- lastTestedAt
- createdAt
- updatedAt

### LocalCommand

- id
- workspaceId
- projectId
- runbookId
- name
- environment
- workingDirectory
- commandText
- description
- requiredTools
- safetyLevel
- lastTestedAt
- notes
- createdAt
- updatedAt

### GitHubReview

- id
- workspaceId
- projectId
- repoName
- githubUrl
- category
- status
- whyReviewing
- licence
- stars
- lastCommitDate
- mainLanguage
- stack
- installDifficulty
- localFolder
- localRunInstructions
- dependencies
- dockerRequired
- databaseRequired
- apiKeysNeeded
- worksOnWindows
- worksOnReplit
- worksLocally
- testNotes
- errorsFound
- fixesNeeded
- securityConcerns
- commercialRisk
- monetisationPotential
- usefulComponents
- decision
- nextAction
- createdAt
- updatedAt

### ToolItem

- id
- workspaceId
- projectId
- name
- category
- sourceRepoOrLibrary
- userProblem
- freeOrPaid
- legalRisk
- backendRequired
- storageRequired
- queueRequired
- browserOnlyPossible
- apiRequired
- status
- testNotes
- monetisationModel
- decision
- nextAction
- createdAt
- updatedAt

### HardwareItem

- id
- workspaceId
- projectId
- clientId
- name
- category
- status
- supplierName
- supplierUrl
- price
- currency
- vatIncluded
- shipping
- availability
- specs
- powerRequirement
- mountingRequirement
- weatherproofRating
- distanceRating
- compatibility
- pros
- cons
- questions
- decision
- nextAction
- lastReviewedAt
- createdAt
- updatedAt

### Idea

- id
- workspaceId
- projectId
- name
- status
- problem
- targetUser
- whyNow
- revenueIdea
- buildDifficulty
- validationStep
- decision
- nextAction
- notes
- createdAt
- updatedAt

### Note

- id
- workspaceId
- title
- bodyMarkdown
- relatedType
- relatedId
- createdById
- createdAt
- updatedAt

### Decision

- id
- workspaceId
- title
- summary
- context
- optionsConsidered
- chosenOption
- reason
- relatedType
- relatedId
- decisionDate
- decidedById
- reviewDate
- outcome
- createdAt
- updatedAt

### NextAction

- id
- workspaceId
- title
- description
- relatedType
- relatedId
- projectId
- clientId
- ownerId
- status
- priority
- dueDate
- completedAt
- createdAt
- updatedAt

### Link

- id
- workspaceId
- title
- url
- linkType
- relatedType
- relatedId
- projectId
- clientId
- notes
- createdAt
- updatedAt

### Tag

- id
- workspaceId
- name
- color
- createdAt
- updatedAt

### TagAssignment

- id
- workspaceId
- tagId
- entityType
- entityId
- createdAt

### Attachment

- id
- workspaceId
- relatedType
- relatedId
- fileName
- filePath
- mimeType
- sizeBytes
- createdAt
- updatedAt

### ActivityLog

- id
- workspaceId
- actorId
- action
- entityType
- entityId
- summary
- createdAt

---

## 10. Suggested Prisma Schema Direction

This PRD does not require exact Prisma code, but the schema should follow these rules:

- Every major entity belongs to a workspace.
- Most entities can optionally link to projectId and/or clientId.
- Notes, decisions, links, attachments, and tags should support polymorphic linking through relatedType + relatedId.
- Avoid storing secrets.
- Use enums for statuses.
- Use timestamps on all records.
- Use soft archive fields where useful.

---

## 11. Security Requirements

## 11.1 Secret Prevention

CommandCore must include UI warnings and backend validation to prevent secret storage.

Blocked field names:

- password
- apiKey
- api_key
- secret
- token
- privateKey
- private_key
- dbPassword
- recoveryCode

If a user enters likely secret content into notes, show a warning:

> “This looks like a password, token, or API key. CommandCore is not a password manager. Store the secret in your vault and add only the vault reference here.”

MVP can implement basic keyword detection.

## 11.2 Local Authentication

MVP should support:

- Local owner account
- Partner/member account
- Password hashing
- Session login

Do not implement OAuth in MVP.

## 11.3 Backups

User must be able to export:

- SQLite DB backup
- JSON export
- Markdown export later

## 11.4 Attachments

MVP can support local attachments, but must warn users not to upload files containing secrets unless they understand the risk.

---

## 12. UI/UX Requirements

## 12.1 Design Style

CommandCore should feel like:

- Calm
- Technical
- Organised
- Fast
- Private
- Useful
- Builder-focused

Avoid looking like a bloated enterprise dashboard.

## 12.2 Layout

Recommended layout:

- Left sidebar navigation
- Top search bar
- Main content area
- Right-side context panel on detail pages
- Quick Add button

## 12.3 Visual Priority

The user should always see:

- Status
- Related project/client
- Next action
- Last updated
- Important links
- Vault reference when relevant

## 12.4 Empty States

Empty states should help the user create the right item.

Example for GitHub Lab:

> “Add a repo you want to review, test, reuse, or monetise.”

Example for Runbooks:

> “Create your first runbook so future-you knows how to launch this project.”

---

## 13. Seed Data for First Use

Create optional seed data for Kenneth.

## 13.1 Projects

### MindX

Type: Own Product  
Status: Active  
Notes: Education platform with past papers, AI explanations, vectorisation pipeline, student review pages, Grade 1 missions, CAPS content.

### Hatchling Heroes

Type: Own Product  
Status: Active / Design  
Notes: Grade R-3 learning game with creature collection, eggs, biomes, nursery, Creature Grove, Hall of Legends, XP/chests, fire/food economy.

### Jarvis

Type: Own Product  
Status: Active  
Notes: Personal assistant platform incorporating Hermes-Claw, Odysseus, multi-agent orchestration, tools page, PDF tools, HEIC to JPG, media utilities, AI interface.

### Teachfolk

Type: Client Project  
Status: Active  
Notes: Client learning platform, DigitalOcean, Stripe, PostgreSQL, DBeaver, local frontend/API, production API, nginx, websocket/MQTT.

### Refiant.ai

Type: Client Project  
Status: Active  
Notes: Uses Slack, ClickUp, Vercel, Send.com, Google Workspace, local frontend/API, workspace knowledge + long context model.

### Tirra / Linkff WiFi Bridge

Type: Client / Hardware Project  
Status: Researching  
Notes: 100km WiFi bridging project, hardware scratchpad needed for links, prices, suppliers, compatibility.

### Plantair Test

Type: Test Project  
Status: To Review  
Notes: GitHub/project review candidate.

### ClickHouse Test

Type: Test Project  
Status: To Review  
Notes: Database/performance project review candidate.

## 13.2 Core Tags

- Replit
- DigitalOcean
- Vercel
- Cloudflare R2
- GoDaddy
- Stripe
- Mailgun
- Send.com
- Google Workspace
- PostgreSQL
- DBeaver
- GitHub Review
- Monetisation
- Hardware
- WiFi Bridge
- Local Runbook
- Missing Access Map
- Needs Decision

---

## 14. MVP User Flows

## 14.1 Add a New Project

1. User clicks Quick Add > Project.
2. Enters name, type, status, description.
3. Adds URLs and local folder if known.
4. Adds client if applicable.
5. Adds next action.
6. Saves.
7. Project detail page opens.

## 14.2 Add an Account Map Item

1. User opens project.
2. Clicks Accounts Map tab.
3. Adds service name, account type, environment, URL, username/email, vault reference.
4. UI warns not to store passwords.
5. Saves.
6. Account item appears in project and global Accounts Map.

## 14.3 Add a Local Runbook

1. User opens project.
2. Clicks Runbooks.
3. Creates “Local API Runbook.”
4. Adds folder, commands, env notes, verification steps, common errors.
5. Saves.
6. Runbook appears in project and search.

## 14.4 Review a GitHub Repo

1. User opens GitHub Lab.
2. Adds repo name and GitHub URL.
3. Sets status to To Review.
4. Adds why reviewing and related project.
5. Later updates local run instructions, errors, decision, monetisation potential.
6. Marks as Useful Component, Monetisation Candidate, Rejected, or Archived.

## 14.5 Add Hardware Item

1. User opens Hardware.
2. Adds item name, supplier link, price, specs.
3. Links to Tirra / Linkff project.
4. Sets status to Found or Reviewing.
5. Later marks Shortlisted, Rejected, Purchased, or Installed.

## 14.6 Capture an Idea

1. User clicks Quick Add > Idea.
2. Enters idea, problem, target user, revenue idea.
3. Sets status to Raw.
4. Adds next validation step.
5. Later promotes to Project or archives.

## 14.7 Resume Work

1. User opens Dashboard.
2. Sees Recently Updated Projects.
3. Opens Teachfolk.
4. Reads Resume Panel:
   - Last note
   - Last decision
   - Current blocker
   - Next action
   - Runbook link
5. Continues work without hunting through memory.

---

## 15. Build Phases

---

# Phase 0: Project Setup

## Goal

Create the base app and development foundation.

## Features

- Next.js app
- TypeScript
- Tailwind CSS
- Prisma
- SQLite
- Local auth
- Basic layout
- Sidebar
- Search bar placeholder
- Seed script
- Basic settings page

## Deliverables

- App runs locally
- DB created
- Owner user can login
- Sidebar navigation visible
- Seed data can be loaded

## Acceptance Criteria

- `npm install` works
- `npm run dev` works
- User can open app locally
- User can log in
- No cloud services required

---

# Phase 1: Core Personal OS MVP

## Goal

Create the usable private productivity OS for Kenneth and partner.

## Features

- Dashboard
- Projects
- Clients
- Accounts Map
- Vault References
- Runbooks
- Local Commands
- Notes
- Next Actions
- Links
- Tags
- Universal search v1
- Backup/export v1

## Deliverables

- Kenneth can track real projects
- Partner can login
- Projects can be linked to clients
- Runbooks can be created
- Account map can reference vault items
- Search works across core records
- Backup/export available

## Acceptance Criteria

- Add/edit/archive project
- Add/edit/archive client
- Link project to client
- Add account map item without storing password
- Add runbook to project
- Add local command to runbook/project
- Add next action
- Search finds projects, runbooks, links, notes, and account map items
- Export JSON backup

---

# Phase 2: Research + Monetisation Labs

## Goal

Add the research modules that make CommandCore valuable for builders.

## Features

- GitHub Review Lab
- Tools Lab
- Hardware Scratchpad
- Ideas Lab
- Decision Log
- Resume Where I Left Off panel
- More filters and saved views

## Deliverables

- User can review GitHub repos
- User can track monetisation candidates
- User can track Jarvis tools
- User can track hardware links/prices/specs
- User can capture and decide on ideas
- Project detail page shows resume panel

## Acceptance Criteria

- GitHub repo can be added and linked to project
- Tool can be added and linked to Jarvis
- Hardware item can be linked to Tirra
- Idea can be promoted to project
- Decision can be recorded and linked
- Dashboard shows items needing decision

---

# Phase 3: Productisation Foundation

## Goal

Prepare CommandCore to become sellable.

## Features

- Workspace settings
- User roles: owner/member
- Activity log
- Templates
- Markdown export
- Import/export
- Attachment management
- Better onboarding
- Sample workspaces
- Product landing page draft
- Licence mode / local activation concept

## Templates

Add templates for:

- New SaaS project
- Client project
- Local dev runbook
- Production ops runbook
- GitHub review
- Hardware research
- Micro-SaaS tool
- Idea validation
- Client handover

## Acceptance Criteria

- User can create records from templates
- User can export project as markdown
- Activity log records key changes
- Workspace can support two users cleanly
- App is usable by someone other than Kenneth

---

# Phase 4: AI Assistant Layer

## Goal

Add an AI helper that can query the user’s CommandCore memory.

## Example Questions

- How do I run Teachfolk locally?
- Which projects use Cloudflare R2?
- What GitHub repos did I mark as monetisable?
- What hardware did I shortlist for Tirra?
- Which projects are missing runbooks?
- What was I doing last in Refiant?
- Show all projects using DigitalOcean.
- Which ideas have high monetisation potential?

## Features

- Local indexed knowledge base
- AI chat over workspace
- Strict no-secret rule
- Source citations to records
- Suggested next actions
- Missing-information detection

## Acceptance Criteria

- AI answers only from stored workspace data unless web search is explicitly added later.
- AI cites linked records.
- AI warns if it sees secret-like text.
- AI can summarise projects and runbooks.

---

# Phase 5: Sync, Backup, and Collaboration

## Goal

Create paid value around sync, backups, and sharing.

## Features

- Encrypted cloud backup
- Multi-device sync
- Shared workspace
- Team roles
- Client handover exports
- Conflict handling
- Optional hosted version

## Acceptance Criteria

- User can access workspace on multiple devices.
- Backups are encrypted.
- Team members can be invited.
- Permissions prevent accidental access to sensitive project maps.
- Client handover export can be generated.

---

# Phase 6: Commercial SaaS / Desktop Product

## Goal

Package CommandCore for sale.

## Possible Editions

### Free

- Local only
- 1 user
- Limited projects
- Basic search

### Pro

- Unlimited local projects
- Templates
- Advanced search
- Backups
- Markdown/JSON export
- AI assistant option

### Partner / Small Team

- 2-5 users
- Shared workspace
- Sync
- Backups
- Activity log

### Agency

- Multiple clients
- Client handover reports
- Advanced templates
- Team permissions
- Audit logs
- Priority support

## Possible Pricing

- Free: R0
- Pro Solo: $6-$12/month or once-off licence
- Partner/Small Team: $15-$29/month
- Agency: $49-$99/month

Pricing must be validated later.

---

## 16. Monetisation Strategy

## 16.1 Best Initial Market

Start with users similar to Kenneth:

- Builders with many projects
- Freelancers with multiple clients
- Technical consultants
- Small agencies
- Developers who test many repos
- Founders managing messy product stacks

## 16.2 Differentiation

CommandCore is different because it combines:

- Project register
- Client system map
- Access map
- Vault references
- Runbooks
- Local dev commands
- GitHub review lab
- Hardware scratchpad
- Ideas lab
- Decision log
- Next actions
- Universal search

This combination is the sellable wedge.

## 16.3 Product Wedge

The first marketing wedge:

> “Stop forgetting how your projects work.”

Alternative wedge:

> “A private command centre for every project, client, repo, account, and runbook.”

## 16.4 Paid Value Later

Paid features should focus on:

- Sync
- Backup
- AI assistant
- Templates
- Client handover packs
- Team collaboration
- Agency views
- Import/export
- Browser clipper
- GitHub importer
- Encrypted attachments

---

## 17. Technical Architecture

## 17.1 MVP Stack

Recommended:

```text
Frontend: Next.js App Router
Language: TypeScript
Styling: Tailwind CSS
UI: shadcn/ui or simple custom components
Database: SQLite
ORM: Prisma
Auth: Local email/password auth
Search: SQLite FTS5 or simple indexed search
File storage: Local /data/uploads
Validation: Zod
Forms: React Hook Form
Markdown: MDX/markdown editor or textarea first
```

## 17.2 Future Stack Options

Desktop packaging:

- Tauri preferred for lighter desktop app
- Electron acceptable if easier

Cloud/team version:

- PostgreSQL
- Object storage via S3/R2
- Encrypted cloud sync
- Meilisearch/Typesense
- Hosted auth

## 17.3 Local File Structure Suggestion

```text
commandcore/
├── app/
│   ├── dashboard/
│   ├── projects/
│   ├── clients/
│   ├── accounts/
│   ├── runbooks/
│   ├── github-lab/
│   ├── tools-lab/
│   ├── hardware/
│   ├── ideas/
│   ├── search/
│   └── settings/
├── components/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   ├── detail/
│   └── shared/
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── search.ts
│   ├── validation.ts
│   └── security.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── data/
│   ├── uploads/
│   └── backups/
└── docs/
    ├── PRD.md
    ├── RUNBOOK.md
    └── ROADMAP.md
```

---

## 18. API / Server Actions

Use Next.js server actions or API routes.

## Required Core Operations

For each major entity:

- Create
- Read list
- Read detail
- Update
- Archive/delete
- Search
- Link to project/client
- Add note
- Add next action

## Important API Rules

- Validate all input with Zod.
- Prevent secret-like field names.
- Add activity log for important changes.
- Use workspaceId on all queries.
- Do not return records across workspaces.

---

## 19. Search Implementation

## MVP Search

Search across:

- Project name/description
- Client name/description
- Account service/vault reference
- Runbook title/body
- GitHub repo/review notes
- Hardware names/specs
- Ideas
- Notes
- Decisions
- Links

## Simple Approach

Create a search index table:

### SearchIndex

- id
- workspaceId
- entityType
- entityId
- title
- content
- urlPath
- updatedAt

Update search index when records are created or edited.

Later replace with SQLite FTS5 or external search.

## Search Result UI

Each result should show:

- Icon/entity type
- Title
- Snippet
- Related project/client
- Status
- Updated date

---

## 20. Backup and Export

## MVP Backup

Required:

- Export workspace as JSON
- Download SQLite DB copy
- Export selected project as markdown later

## Backup Folder

```text
/data/backups/
```

## Backup Naming

```text
commandcore-backup-YYYY-MM-DD-HHMM.json
```

## Acceptance Criteria

- User can export JSON backup.
- Backup includes all core records.
- User can save backup locally.
- Restore can be Phase 3 if not included in MVP.

---

## 21. Onboarding

## MVP Onboarding Flow

1. Create owner account
2. Create workspace
3. Ask: “What do you want to track first?”
4. Offer starter templates:
   - Personal builder workspace
   - Freelancer/client workspace
   - Agency workspace
5. For Kenneth build, include seed workspace option.

## Starter Prompt

```text
Start by adding one project you keep forgetting how to access or run.
```

---

## 22. Templates

Templates should be built in Phase 3 but considered in schema from day one.

## Required Templates

### SaaS Project Template

- URLs
- Repo
- Hosting
- Database
- Email
- Payment
- Runbooks
- Account map
- Next actions

### Client Project Template

- Client info
- Systems
- Access references
- Runbooks
- Warnings
- Next actions

### GitHub Review Template

- Repo
- Why reviewing
- Licence
- Install
- Test
- Decision
- Monetisation

### Hardware Research Template

- Supplier
- Price
- Specs
- Compatibility
- Decision

### Idea Validation Template

- Problem
- Target user
- Revenue
- Build difficulty
- Validation step

---

## 23. Reporting

## MVP Reports

Dashboard cards only.

## Phase 3 Reports

- Projects missing runbooks
- Projects missing next action
- Account map items not verified recently
- GitHub reviews marked Monetisation Candidate
- Hardware items shortlisted
- Ideas awaiting decision
- Client systems without runbooks

## Phase 5 Reports

- Client handover pack
- Project audit report
- Access map report
- Runbook coverage report

---

## 24. Client Handover Pack Future Feature

This could become a paid agency feature.

A handover pack exports:

- Project summary
- URLs
- Hosting/DNS/email/payment map
- Runbooks
- Non-secret vault reference list
- Deployment notes
- Known warnings
- Next actions
- Decision log

Never export secrets.

---

## 25. AI Assistant Future Feature

The AI assistant should only answer from indexed CommandCore data in early versions.

## Example AI Commands

```text
Summarise Teachfolk.
```

```text
How do I run Refiant locally?
```

```text
Show all projects using DigitalOcean.
```

```text
Which GitHub projects have high monetisation potential?
```

```text
Which hardware items are shortlisted for Tirra?
```

```text
Which projects have no next action?
```

## AI Safety

- Do not reveal secrets.
- Warn if secret-like text exists.
- Cite records used.
- Do not invent details.
- If missing info, say exactly what is missing.

---

## 26. Success Metrics

## MVP Personal Success

CommandCore is successful if Kenneth can answer these in under 30 seconds:

- What projects am I working on?
- Where is Teachfolk hosted?
- How do I run Teachfolk locally?
- Which vault item contains the Stripe login?
- What GitHub repos am I testing?
- Which tools are planned for Jarvis?
- What hardware items are shortlisted for Tirra?
- What ideas are waiting for validation?
- What is my next action?

## Product Success Later

- User creates 5+ projects in first week
- User creates 3+ runbooks
- User uses search daily
- User returns to dashboard multiple times per week
- User exports/backs up workspace
- User says it replaced scattered notes
- User shares it with partner/team

---

## 27. MVP Acceptance Checklist

The MVP is not done until all of these work:

```text
[ ] User can create owner account
[ ] User can create partner/member account
[ ] User can create workspace
[ ] User can create/edit/archive project
[ ] User can create/edit/archive client
[ ] User can link project to client
[ ] User can create account map item
[ ] Account map stores vault reference only
[ ] UI warns not to store secrets
[ ] User can create runbook
[ ] User can create local command
[ ] User can create GitHub review
[ ] User can create tool item
[ ] User can create hardware item
[ ] User can create idea
[ ] User can create note
[ ] User can create decision
[ ] User can create next action
[ ] User can create link
[ ] User can tag records
[ ] Dashboard shows next actions
[ ] Dashboard shows recently updated projects
[ ] Dashboard shows items needing decision
[ ] Search finds projects
[ ] Search finds runbooks
[ ] Search finds account map items
[ ] Search finds GitHub reviews
[ ] Search finds hardware items
[ ] Search finds ideas
[ ] User can export JSON backup
[ ] Seed data can be loaded
[ ] App runs locally without cloud dependency
```

---

## 28. Build Instructions for VS Code / Replit / AI Coding Agent

Use the following build instruction when starting the project:

```text
You are building CommandCore, a local-first productivity OS for builders, consultants, freelancers, agencies, and technical founders.

The product must first serve Kenneth and partner as a private local command centre, but it must be architected so it can later become a sellable product.

Core purpose:
One private searchable place for projects, clients, access maps, vault references, runbooks, local commands, GitHub reviews, tools, hardware research, ideas, decisions, notes, links, tags, and next actions.

Tech stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite for MVP
- Local authentication
- Zod validation
- Local file storage
- JSON export/backup

Critical security rule:
Do not store passwords, API keys, tokens, private keys, database passwords, recovery codes, or secrets. Store only vault reference names such as “Teachfolk - DigitalOcean - Production - Admin”.

MVP modules:
- Dashboard
- Projects
- Clients
- Accounts Map
- Vault References
- Runbooks
- Local Commands
- GitHub Review Lab
- Tools Lab
- Hardware Scratchpad
- Ideas Lab
- Notes
- Decisions
- Next Actions
- Links
- Tags
- Universal Search
- Settings
- Backup/export

Build approach:
1. Create clean Next.js project structure.
2. Add Prisma + SQLite schema.
3. Add local auth.
4. Add layout with sidebar and top search.
5. Build CRUD pages for Projects and Clients first.
6. Add Accounts Map with no-secrets validation.
7. Add Runbooks and Local Commands.
8. Add Notes, Decisions, Next Actions, Links, Tags.
9. Add GitHub Lab, Tools Lab, Hardware, Ideas.
10. Add Dashboard.
11. Add Universal Search.
12. Add JSON backup/export.
13. Add seed data for Kenneth’s core projects:
   - MindX
   - Hatchling Heroes
   - Jarvis
   - Teachfolk
   - Refiant.ai
   - Tirra / Linkff WiFi Bridge
   - Plantair Test
   - ClickHouse Test

Do not build cloud sync, billing, AI, mobile app, Slack/ClickUp/Monday integrations, browser extension, or secret storage in MVP.

Prioritise:
- Fast local use
- Clean structure
- Searchability
- Linking records together
- Strong no-secret rules
- Useful empty states
- Practical forms
- Simple UI
- Future productisation
```

---

## 29. First Development Milestones

## Milestone 1: Foundation

- Create app
- Prisma setup
- SQLite DB
- Auth
- Layout
- Seed data

## Milestone 2: Core Registers

- Projects CRUD
- Clients CRUD
- Links
- Tags

## Milestone 3: Operations Memory

- Accounts Map
- Vault References
- Runbooks
- Local Commands
- No-secret validation

## Milestone 4: Work Memory

- Notes
- Decisions
- Next Actions
- Resume panel

## Milestone 5: Labs

- GitHub Review Lab
- Tools Lab
- Hardware Scratchpad
- Ideas Lab

## Milestone 6: Search + Dashboard

- Search index
- Universal search
- Dashboard cards
- Filters

## Milestone 7: Backup + Polish

- JSON export
- Seed import
- Empty states
- UI polish
- MVP testing

---

## 30. Open Questions

These can be answered during build:

1. Should CommandCore be browser-only local or packaged as desktop later?
2. Should SQLite DB live inside app folder or user data folder?
3. Should partner have equal access or limited access?
4. Should attachments be included in MVP?
5. Should restore from backup be MVP or Phase 3?
6. Should local commands be executable later or copy-only forever?
7. Should there be a browser clipper for links later?
8. Should GitHub repo metadata be manually entered first or fetched later?
9. What is the final product name?
10. Should early commercial version be once-off licence, subscription, or both?

---

## 31. Final MVP Definition

The MVP is a success when Kenneth and partner can use CommandCore every day to manage:

- Current projects
- Client systems
- Access maps
- Vault references
- Local launch instructions
- GitHub reviews
- Tools and utility ideas
- Hardware research
- Product ideas
- Decisions
- Next actions

The MVP must feel like a working personal command centre, not a half-built generic task app.

The first version should be small enough to build, but structured enough to become a real product.

---

## 32. Product North Star

> CommandCore helps builders stop losing operational memory.

Everything in the product should serve that mission.

When in doubt, ask:

```text
Does this help the user remember what something is, where it lives, how to access it, how to run it, why it matters, or what to do next?
```

If yes, it belongs.

If no, it can wait.
