# KanbAI Factory Pilot Proposal One-Pager

Date: 2026-07-27

## Pilot Goal

Run KanbAI on one controlled inspection workflow and prove that visual inspection can become a continuously learning quality data system.

The pilot should answer four questions:

1. Can operators capture inspections quickly without disrupting production?
2. Can AI detect or triage defects with useful confidence signals?
3. Can quality managers validate edge cases and create reusable training data?
4. Can the factory see measurable quality, traceability and cost signals from the workflow?

## Ideal First Pilot Scope

- One factory.
- One production line.
- One or two inspection stations.
- One product family.
- Two to five defect categories.
- One tablet/laptop capture device per station.
- One quality manager responsible for HITL review.
- Two to four weeks of controlled data collection.

## Recommended Pilot Timeline

### Week 0: Setup

- Confirm inspection station and defect taxonomy.
- Install local pilot environment.
- Configure factory, line, station and device records.
- Run acceptance smoke test.
- Train operators and quality owners on the demo flow.

### Week 1: Baseline Data

- Capture production inspections in demo-safe mode.
- Record operator timing and failure points.
- Collect pass/fail/review examples.
- Review every uncertain/failed case in HITL.
- Export inspection history at the end of the week.

### Week 2: Model Readiness

- Review collected sample quality.
- Create first permission-safe labeled dataset.
- Identify defect families with enough examples.
- Connect a sample-based or trained inference path if enough data exists.
- Compare model output against quality manager decisions.

### Weeks 3-4: Pilot Decision

- Measure repeat usage.
- Measure review load.
- Estimate scrap/rework savings.
- Decide whether to extend to more stations or train a dedicated model.

## Success Metrics

| Metric | Target |
| --- | --- |
| Operator capture time | Under 30 seconds per inspection |
| Submit-to-result latency | Under 10 seconds in local pilot mode |
| HITL review completion | 95% of review/fail cases reviewed |
| Dataset growth | At least 100 usable labeled images |
| Traceability | Every captured part has station, timestamp, device and decision |
| Demo stability | Acceptance smoke test passes before each live session |

## Business Metrics To Estimate

- Inspections per shift.
- Current manual inspection labor cost.
- Scrap cost per defective part.
- Rework cost per part.
- Cost of missed defects reaching later process stages.
- Current false reject / false accept pain points.
- Time spent preparing quality reports.

## What KanbAI Provides

- Tablet/laptop operator capture.
- Factory dashboard and digital twin-style station overview.
- Inspection records and CSV export.
- AI decision and confidence.
- Human-in-the-loop review panel.
- Dataset contribution tracking.
- Continuous learning and model registry demo.
- Local Docker Compose deployment for the controlled pilot.

## What The Factory Provides

- Access to one inspection workflow.
- Permission-safe part photos.
- Defect taxonomy and quality rules.
- A quality owner for HITL validation.
- One laptop/tablet for station capture if available.
- Feedback on workflow fit and measurable savings.

## Non-Goals For The First Pilot

- Replacing all quality inspectors.
- Full MES/ERP integration.
- Guaranteed production model accuracy before factory data collection.
- Fully hardened enterprise deployment.
- Automated rejection of production parts without human approval.

## Pilot Close Criteria

The pilot is successful if KanbAI proves a clear path from inspection capture to human validation, dataset growth and a better factory-specific model. The commercial next step should be based on station count, inspection volume, measurable quality pain and expected savings.
