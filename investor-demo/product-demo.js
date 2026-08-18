const samples = [
  ["sample-01.svg", "Housing A17", "Crack", "Line 1 / Station 3", "Aluminum housing", "REVIEW", 94, "Thermal stress near cast radius"],
  ["sample-02.svg", "Guide Rail B04", "Surface mark", "Line 2 / Station 1", "Brushed steel rail", "REVIEW", 87, "Tool chatter during finishing"],
  ["sample-03.svg", "Bearing C22", "Chip", "Line 1 / Station 5", "Machined bearing", "FAIL", 96, "Edge impact before packaging"],
  ["sample-04.svg", "Weld Bracket D9", "Weld deviation", "Line 3 / Station 2", "Welded bracket", "REVIEW", 82, "Fixture offset on weld cell"],
  ["sample-05.svg", "Cover Plate E11", "Edge burr", "Line 2 / Station 4", "Stamped plate", "FAIL", 91, "Dull cutting die"],
  ["sample-06.svg", "Cast Link F08", "Cast crack", "Line 1 / Station 2", "Cast connector", "FAIL", 98, "Cooling rate variance"],
  ["sample-07.svg", "Panel G31", "Dent", "Line 4 / Station 3", "Pressed panel", "REVIEW", 79, "Handling pressure after press"],
  ["sample-08.svg", "Valve Body H18", "Misalignment", "Line 2 / Station 6", "CNC valve body", "REVIEW", 85, "Clamp calibration drift"],
  ["sample-09.svg", "Rail I02", "Scratch cluster", "Line 1 / Station 4", "Linear rail", "PASS", 73, "Below rejection threshold"],
  ["sample-10.svg", "Ring J14", "Abrasion", "Line 3 / Station 1", "Sealing ring", "REVIEW", 88, "Conveyor contact point"],
  ["sample-11.svg", "Painted Cover K7", "Paint void", "Line 5 / Station 2", "Coated cover", "FAIL", 93, "Surface contamination before coating"],
  ["sample-12.svg", "Hex Mount L20", "Surface wave", "Line 4 / Station 1", "Forged mount", "PASS", 76, "Within visual tolerance"],
  ["sample-13.svg", "Seal M05", "Seal tear", "Line 3 / Station 5", "Rubber seal", "FAIL", 95, "Trim blade wear"],
  ["sample-14.svg", "Cooling Plate N2", "Hole anomaly", "Line 2 / Station 8", "Cooling plate", "REVIEW", 84, "Punch alignment variance"],
  ["sample-15.svg", "Formed Shell O12", "Forming crack", "Line 5 / Station 4", "Deep drawn shell", "FAIL", 97, "Material thinning at corner"],
  ["sample-16.svg", "Twin Gear P6", "Gear mark", "Line 6 / Station 2", "Transmission gear", "REVIEW", 86, "Debris in inspection zone"],
  ["sample-17.svg", "Bracket Q19", "Scuff", "Line 1 / Station 7", "Mounting bracket", "PASS", 71, "Cosmetic mark only"],
  ["sample-18.svg", "Radius Block R3", "Radius scratch", "Line 4 / Station 6", "Radius block", "REVIEW", 89, "Guide rail contact"],
  ["sample-19.svg", "Lower Yoke S10", "Lower edge burr", "Line 2 / Station 3", "Yoke component", "FAIL", 92, "Secondary deburr skipped"],
  ["sample-20.svg", "Casting T44", "Inclusion", "Line 3 / Station 7", "Cast housing", "REVIEW", 90, "Possible sand inclusion"]
].map((row, index) => ({
  id: index + 1,
  file: `assets/samples/${row[0]}`,
  part: row[1],
  defect: row[2],
  station: row[3],
  material: row[4],
  outcome: row[5],
  confidence: row[6],
  rootCause: row[7]
}));

const elements = {
  grid: document.querySelector("#sampleGrid"),
  upload: document.querySelector("#upload"),
  reset: document.querySelector("#reset"),
  preview: document.querySelector("#preview"),
  partName: document.querySelector("#partName"),
  station: document.querySelector("#station"),
  material: document.querySelector("#material"),
  timestamp: document.querySelector("#timestamp"),
  sourcePill: document.querySelector("#sourcePill"),
  inspect: document.querySelector("#inspect"),
  decisionTitle: document.querySelector("#decisionTitle"),
  decisionBody: document.querySelector("#decisionBody"),
  confidenceValue: document.querySelector("#confidenceValue"),
  confidenceBar: document.querySelector("#confidenceBar"),
  defectClass: document.querySelector("#defectClass"),
  rootCause: document.querySelector("#rootCause"),
  bbox: document.querySelector("#bbox"),
  bboxLabel: document.querySelector("#bboxLabel"),
  steps: Array.from(document.querySelectorAll("[data-step]")),
  hitlCard: document.querySelector("#hitlCard"),
  learnCard: document.querySelector("#learnCard"),
  reviewDecision: document.querySelector("#reviewDecision"),
  reviewCopy: document.querySelector("#reviewCopy"),
  verifiedCount: document.querySelector("#verifiedCount"),
  queueCount: document.querySelector("#queueCount")
};

let selected = samples[0];
let objectUrl = null;
let verified = 249;
let queue = 18;
const stepOrder = ["source", "inspect", "review", "learn"];

function setStep(activeStep) {
  const activeIndex = stepOrder.indexOf(activeStep);
  elements.steps.forEach((step) => {
    const index = stepOrder.indexOf(step.dataset.step);
    step.classList.toggle("active", index === activeIndex);
    step.classList.toggle("done", index > -1 && index < activeIndex);
  });
}

function nowLabel() {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date()).replace(",", " -");
}

function renderSamples() {
  elements.grid.innerHTML = samples.map((sample) => `
    <button class="sample-tile${sample.id === selected.id ? " active" : ""}" type="button" data-id="${sample.id}">
      <img src="${sample.file}" alt="${sample.part} sample scan">
      <span>${String(sample.id).padStart(2, "0")} - ${sample.part}</span>
    </button>
  `).join("");
}

function updatePreview(source = "Sample scan") {
  elements.preview.src = selected.file;
  elements.preview.alt = `${selected.part} inspection image`;
  elements.partName.textContent = selected.part;
  elements.station.textContent = selected.station;
  elements.material.textContent = selected.material;
  elements.timestamp.textContent = nowLabel();
  elements.sourcePill.textContent = source;
  elements.bboxLabel.textContent = `${selected.defect.toLowerCase()} - ${selected.confidence}%`;
  elements.learnCard.hidden = true;
  elements.decisionTitle.textContent = "Waiting for inspection";
  elements.decisionTitle.className = "";
  elements.decisionBody.textContent = "Run the simulated inspection to generate an AI suggestion.";
  elements.confidenceValue.textContent = "--";
  elements.confidenceBar.style.width = "0%";
  elements.defectClass.textContent = "--";
  elements.rootCause.textContent = "--";
  setStep("source");
  renderSamples();
}

function runInspection() {
  const tone = selected.outcome.toLowerCase();
  elements.decisionTitle.textContent = selected.outcome;
  elements.decisionTitle.className = `decision-${tone}`;
  elements.decisionBody.textContent = selected.outcome === "PASS"
    ? "No critical defect detected. Human review is still available for audit."
    : "AI detected a visual anomaly and recommends human validation before release.";
  elements.confidenceValue.textContent = `${selected.confidence}%`;
  elements.confidenceBar.style.width = `${selected.confidence}%`;
  elements.defectClass.textContent = selected.defect;
  elements.rootCause.textContent = selected.rootCause;
  setStep("review");
  elements.hitlCard.scrollIntoView({behavior: "smooth", block: "center"});
}

function recordReview(label, copy) {
  verified += 1;
  queue += selected.outcome === "PASS" ? 0 : 1;
  elements.reviewDecision.textContent = label;
  elements.reviewCopy.textContent = copy;
  elements.verifiedCount.textContent = verified;
  elements.queueCount.textContent = queue;
  elements.learnCard.hidden = false;
  setStep("learn");
  elements.learnCard.scrollIntoView({behavior: "smooth", block: "center"});
}

elements.grid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  const id = Number(button.dataset.id);
  selected = samples.find((sample) => sample.id === id) || samples[0];
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  updatePreview("Sample scan");
});

elements.upload?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  selected = {
    id: 0,
    file: objectUrl,
    part: file.name.replace(/\.[^.]+$/, "") || "Uploaded part",
    defect: "Unknown anomaly",
    station: "Manual upload / Investor demo",
    material: "User supplied image",
    outcome: "REVIEW",
    confidence: 89,
    rootCause: "Needs human label before training"
  };
  updatePreview("Uploaded image");
});

elements.reset?.addEventListener("click", () => {
  selected = samples[0];
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  elements.upload.value = "";
  updatePreview("Sample scan");
});

elements.inspect?.addEventListener("click", runInspection);
document.querySelector("#confirm")?.addEventListener("click", () => recordReview("Approved for dataset", "The quality reviewer accepted the AI finding and added it to the learning queue."));
document.querySelector("#reject")?.addEventListener("click", () => recordReview("Rejected by reviewer", "The reviewer blocked release and preserved the image as a verified defect example."));
document.querySelector("#wrong")?.addEventListener("click", () => recordReview("Prediction corrected", "The reviewer corrected the label, creating high-value training data for the next model."));

renderSamples();
updatePreview();
