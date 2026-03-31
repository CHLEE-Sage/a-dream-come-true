# Private Finance Agent

A high-privacy, local-first financial planning agent designed to behave more like a thoughtful financial advisor than a passive calculator.

## Project Path
- `C:\Agentgroups\workspaces\private-finance-agent`

## Core Concept
This product is not meant to be only a form or a retirement calculator.
It is designed as an **advisor-style planning agent** that can:

- discover what the user has not yet thought about
- surface overlooked expenses, income changes, and protection gaps
- prioritize which financial gaps should be fixed first
- model financial life through time, not just at a single snapshot
- turn life events into cash-flow and liquidity projections
- preserve privacy by default through a local-first workflow

In short:

> The goal is to build a personal financial planning agent with the intuition of a strong financial advisor.

---

## Product Blueprint

### 1. Privacy-first foundation
Principles:
- local-first by default
- no mandatory login
- no requirement for real name, phone number, or account identifiers
- exportable data
- user-controlled reset / deletion

Future direction:
- client-side encryption
- stronger local data protection
- optional anonymous cloud sync only if truly needed

---

### 2. Advisor-style discovery
The agent should not wait for users to manually imagine every financial item.
Instead, it should proactively guide users through discovery.

Discovery domains include:
- family structure
- children and education
- marriage / family support
- housing / mortgage / move / renovation
- vehicle purchase and replacement
- retirement timing
- pension timing
- insurance gaps
- parent care / long-term care
- possible future asset sale or house sale
- side income after retirement

This is intended to emulate how strong financial advisors uncover real concerns.

---

### 3. Event-driven planning engine
The core planning model is event-driven.
Instead of only storing balances, the agent should model:
- large future expenses
- future income changes
- protection upgrades
- asset sale events
- retirement transition periods

Examples of modeled events:
- education cost peak
- marriage support
- car purchase / replacement
- move / renovation
- house sale / downsizing proceeds
- insurance reinforcement
- parent care cost
- retirement side income

These events should feed directly into:
- liquidity trajectory
- annual cash-flow projections
- retirement bridge-risk analysis
- advisor summary and gap prioritization

---

### 4. Gap prioritization logic
The agent must not only detect issues, but also rank them.
A practical prioritization framework is:

#### Level 1 - Critical
- liquidity shortage
- high leverage / debt pressure
- age-65 bridge risk
- major protection gaps

#### Level 2 - Important
- retirement funding gap
- low savings rate
- unplanned medium-term large expenses
- family support burden

#### Level 3 - Optimize
- asset allocation efficiency
- tax / estate improvements
- timing refinements

The system should explain:
- what the gap is
- why it matters
- what to do next

---

### 5. Visual planning experience
The interface should communicate like a planner, not only like a spreadsheet.
Core views include:
- financial health dashboard
- liquidity trajectory chart
- annual cash-flow chart
- key event timeline
- scenario comparison
- advisor summary
- prioritized gap list

The user should quickly see:
- which year is most dangerous
- which event creates the biggest strain
- whether retirement is still feasible
- whether selling a house or delaying retirement changes the outcome

---

### 6. Conversational recommendation loop
The intended long-term loop is:

1. ask advisor-style discovery questions
2. infer likely overlooked events
3. recommend events with suggested timing and amounts
4. let the user accept, reject, or adjust
5. update charts, risks, and summaries immediately
6. continue refining the plan

This loop is the heart of the agent.

---

## Current Development Direction
The project has evolved through:
- V1: local-first MVP
- V2: scenario dashboard
- V3.5: advisor insight and prioritization
- V4: timeline and chart views
- V4.5: editable events and formal charts
- V5: conversational discovery and event recommendations
- V5.5: next target, smarter branching discovery and stronger recommendation logic

See `history.md` for the detailed progression.

---

## Local Development
```bash
npm install
npm run dev
```

Open:
- `http://127.0.0.1:3000`

---

## Vision
This should become:

> A private financial planning agent that thinks like a real advisor, finds blind spots before the user does, and helps users decide what to fix first.
