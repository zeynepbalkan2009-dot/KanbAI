# KanbAI Factory Data Collection Protocol

Date: 2026-07-27

Purpose: collect factory images in a way that can become useful training data without breaking privacy, safety or production flow.

## Collection Principles

- Capture real inspection conditions: normal lighting, normal distance, normal station setup.
- Keep part and defect labels consistent.
- Avoid sensitive factory information in frame when possible.
- Do not photograph people, badges, screens, customer names or confidential drawings.
- Prefer repeated examples over one perfect image.
- Record context: product, line, station, shift, lot and defect label.

## Minimum Dataset For A First Model

For each product family:

- 50-100 PASS images.
- 30-50 images per common defect class.
- 10-20 borderline/ambiguous examples.
- 10-20 examples of lighting, blur or positioning problems.

For a very small proof of concept, start with:

- 20 PASS images.
- 10 FAIL images for one defect family.
- 5 REVIEW/ambiguous images.

## Recommended Labels

Use short labels that factory teams understand:

- `pass`
- `crack`
- `scratch`
- `dent`
- `stain`
- `missing_part`
- `wrong_assembly`
- `blurred_image`
- `unknown_defect`

Keep the taxonomy small during the first pilot. Add new labels only after the quality manager confirms they are operationally meaningful.

## Capture Checklist

For every station:

- Factory name.
- Production line.
- Station name.
- Product family.
- Lot number if available.
- Shift if available.
- Operator or device identifier.
- Photo timestamp.
- AI decision.
- Human confirmation if reviewed.

## Image Quality Checklist

Accept an image for training only if:

- The inspected area is visible.
- The part is not mostly out of frame.
- The defect is visible or the label is intentionally `pass`.
- Lighting reflects normal production conditions.
- The image does not reveal restricted information.

Mark an image as low quality if:

- It is blurry.
- It is too dark or overexposed.
- The part is cropped incorrectly.
- The image contains unrelated objects that dominate the frame.
- The label is uncertain.

## Human Review Rules

Quality reviewers should:

- Correct wrong AI predictions.
- Add the most specific defect label available.
- Use `unknown_defect` only when no current label fits.
- Leave short notes for new defect types.
- Enable dataset contribution for clear examples.
- Disable dataset contribution for bad images or uncertain labels.

## Privacy And Permission

Before using images outside the factory:

- Remove or crop visible customer names.
- Remove serials if they are sensitive.
- Avoid worker faces, badges and personal items.
- Confirm written permission for pitch deck or investor use.
- Keep raw images private unless the factory approves sharing.

## First Pilot Folder Structure

Recommended local export structure:

```text
factory-name/
  product-family/
    pass/
    crack/
    scratch/
    dent/
    review/
    rejected-low-quality/
```

The KanbAI app stores images and metadata automatically during the demo, but this structure helps with manual review and model preparation.

## Acceptance Criteria For Dataset v0

- Labels are consistent.
- PASS and FAIL examples are both present.
- At least one quality owner has reviewed the sample.
- Low-quality images are separated.
- Permission-sensitive images are excluded from investor material.
- There is enough data to train or simulate a first factory-specific model story.

## Model Readiness Decision

Proceed to real model training when:

- There are enough examples for at least one defect class.
- The defect is visually distinguishable in the captured images.
- Labels are consistent across reviewers.
- The factory agrees on what counts as PASS / REVIEW / FAIL.

Keep deterministic demo inference as a fallback until the trained model is stable enough for live demonstration.
