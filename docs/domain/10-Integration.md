# Integration Domain

## Purpose

This document defines Integrations as CommandCore's relationships with external systems, providers, tools, and services.

Integrations extend operational awareness without becoming the architectural center.

## Responsibilities

- Represent external systems used by projects, clients, companies, and capabilities.
- Preserve safe operational references such as URLs, provider names, and vault references.
- Support provider awareness across hosting, domains, communication, deployment, research, and infrastructure.
- Maintain vendor replaceability and no-secret discipline.

## Ownership

The Integration domain is owned by CommandCore architecture and locally expressed through project, client, account map, runbook, link, and infrastructure records.

## Lifecycle

1. An external system is identified as relevant to an operation.
2. A safe reference to it is recorded.
3. The system becomes linked to projects, clients, companies, or capabilities.
4. Verification, decisions, and operating knowledge accumulate over time.
5. The integration may be replaced, retired, or promoted into reusable capability context.

## Relationships

- Integrations connect to Projects, Clients, Companies, Capabilities, Runbooks, AccountMapItems, VaultReferences, and Infrastructure Services.
- Integrations influence capability dependencies, operational risk, and company operating state.
- Integrations may also shape model-provider choices and tool usage.

## Future Extensions

- Richer provider taxonomies
- Integration health signals
- Compatibility tracking
- Integration-specific runbooks
- Cross-company provider analysis

## Examples

Examples from the locked documents:
- DigitalOcean
- Vercel
- Cloudflare
- GoDaddy
- Google Workspace
- Stripe
- Mailgun
- Send.com
- GitHub
- Slack
- Monday.com
- ClickUp

## Rules

- CommandCore may store references to integrations but not secrets for them.
- Integrations must remain replaceable where practical.
- Vendor usage must not create architectural lock-in by accident.
- Integration records should support search and operational memory.
- Out-of-scope integrations for Sprint 1 should not be falsely presented as implemented features.

## Canonical Integration Facets

### Identity

Identity is the name and category of the external system or provider.

### Context

Context is how the integration relates to a project, client, company, or capability.

### Access Reference

Access Reference is the safe pointer to the external system, typically through URLs, account references, and vault item names.

### Dependency Role

Dependency Role describes whether the integration is optional, required, strategic, or replaceable for the consuming domain object.

### Verification

Verification is the last known confirmation that the integration reference and operational assumptions remain valid.
