# KanbAI Product Walkthrough

This page is the public-facing guide to the product journey. It is designed for investors, factory teams, technical evaluators and potential pilot partners who want to understand the product without reading the source code first.

## 1. Factory Dashboard

**Purpose:** Give quality teams a single view of inspection activity, quality decisions, review workload and operational signals.

**What to show in the final screenshot:**
- inspection summary
- PASS / REVIEW / FAIL distribution
- recent inspection records
- active devices / stations
- quality analytics

> **Screenshot:** Add the final factory dashboard screenshot to the repository before the public launch.

## 2. Device Registration

**Purpose:** Register the physical camera/device used by an inspection station so multiple shifts or capture sessions can be associated with the same inspection device.

**What to show:**
- device registration
- activation state
- station association
- device identity

> **Screenshot:** Add the final device-registration screen before the public launch.

## 3. Operator Capture

**Purpose:** Capture a production unit from a fixed inspection point. Existing factory cameras can be used where suitable; a smartphone can support an initial low-cost pilot validation.

**What to show:**
- camera/capture screen
- inspection point or station
- image quality guidance
- capture confirmation

> **Screenshot:** Add the final operator/mobile capture screen before the public launch.

## 4. AI Inspection

**Purpose:** Run an inspection against the configured model/inference workflow and classify the unit as **PASS**, **REVIEW** or **FAIL**.

The public repository does not claim validated production accuracy. Real factory performance requires representative factory data, labeling, training and measurement.

> **Screenshot:** Add a representative inspection-result screen. Do not use confidential factory imagery.

## 5. Human Review

**Purpose:** Let a quality operator confirm, reject or correct an uncertain AI result.

Human validation is a core part of the KanbAI learning loop: the decision becomes structured quality data that can later support model improvement.

> **Screenshot:** Add the final human-review / review-queue screen before the public launch.

## 6. Learning Ops

**Purpose:** Turn reviewed inspections into a governed dataset and support model/version management.

The product thesis is:

**Inspection → Human validation → Structured dataset → Model improvement**

This factory-specific learning loop is intended to become more valuable as verified inspection history accumulates.

> **Screenshot:** Add the final learning-ops screen before the public launch.

## 7. Battery & Energy-Storage Inspection

KanbAI includes a battery/energy-storage workflow for use cases such as component presence, connector/cable placement, seal/housing integrity and related visual checks.

This is an expansion vertical, not a claim that production-grade battery inspection accuracy has already been validated. Real deployment requires factory-specific data and measured model performance.

> **Screenshot:** Add the battery inspection dashboard or workflow screen before the public launch.

---

## Recommended 60–90 second demo sequence

For the final public product video, keep the story simple:

1. **Problem:** manual visual quality inspection.
2. **Capture:** a camera or smartphone captures the production unit.
3. **Inspection:** KanbAI returns PASS / REVIEW / FAIL.
4. **Human review:** an operator confirms or corrects the result.
5. **Learning loop:** the validated inspection becomes structured training data.
6. **Dashboard:** the quality team sees the inspection history and analytics.
7. **Expansion:** the same workflow can move from one station to additional stations and verticals.

Do not show real customer identifiers, confidential factory images, production credentials or unvalidated performance claims.

## Screenshot and video checklist

Before public release:

- [ ] Factory Dashboard screenshot added
- [ ] Device Registration screenshot added
- [ ] Operator Capture screenshot added
- [ ] AI Inspection screenshot added
- [ ] Human Review screenshot added
- [ ] Learning Ops screenshot added
- [ ] Battery workflow screenshot added
- [ ] 60–90 second product video recorded
- [ ] Video contains no customer-confidential information
- [ ] Public-release guard passes
