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
].map((row, index) => {
  const id = index + 1;
  return {
    id,
    file: `assets/samples/${row[0]}`,
    part: row[1],
    defect: row[2],
    station: row[3],
    material: row[4],
    outcome: row[5],
    confidence: row[6],
    rootCause: row[7],
    box: sampleBox(id),
    inScope: true,
    simulated: false
  };
});

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
  aiCard: document.querySelector("#decisionTitle")?.closest(".decision-card"),
  decisionTitle: document.querySelector("#decisionTitle"),
  decisionBody: document.querySelector("#decisionBody"),
  confidenceValue: document.querySelector("#confidenceValue"),
  confidenceBar: document.querySelector("#confidenceBar"),
  defectClass: document.querySelector("#defectClass"),
  rootCause: document.querySelector("#rootCause"),
  bbox: document.querySelector("#bbox"),
  bboxLabel: document.querySelector("#bboxLabel"),
  steps: Array.from(document.querySelectorAll("[data-step]")),
  reviewButtons: Array.from(document.querySelectorAll("#confirm,#reject,#wrong")),
  hitlCard: document.querySelector("#hitlCard"),
  learnCard: document.querySelector("#learnCard"),
  reviewDecision: document.querySelector("#reviewDecision"),
  reviewCopy: document.querySelector("#reviewCopy"),
  verifiedCount: document.querySelector("#verifiedCount"),
  queueCount: document.querySelector("#queueCount"),
  pilotContact: document.querySelector("#pilotContact"),
  contactPanel: document.querySelector("#contactPanel")
};

let selected = samples[0];
let objectUrl = null;
let verified = 249;
let queue = 18;
const stepOrder = ["source", "inspect", "review", "learn"];

function sampleBox(id) {
  const boxes = [
    [47, 22, 21, 33], [50, 28, 22, 32], [62, 20, 15, 22], [32, 23, 18, 31],
    [27, 52, 34, 18], [44, 16, 16, 49], [70, 50, 15, 24], [66, 22, 17, 30],
    [36, 18, 18, 46], [31, 55, 28, 17], [59, 30, 17, 25], [23, 24, 27, 24],
    [72, 24, 14, 35], [32, 42, 14, 21], [62, 24, 17, 41], [58, 21, 18, 31],
    [51, 50, 22, 21], [28, 28, 18, 37], [40, 58, 25, 17], [61, 18, 18, 38]
  ];
  const [left, top, width, height] = boxes[(id - 1) % boxes.length];
  return {left, top, width, height};
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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
  elements.sourcePill.textContent = selected.inScope === false ? "Out of scope" : source;
  elements.bboxLabel.textContent = selected.inScope === false
    ? "outside inspection scope"
    : `${selected.defect.toLowerCase()} - ${selected.confidence}%`;
  elements.bbox.classList.toggle("is-hidden", selected.inScope === false || selected.inScope === null);
  placeBox(selected.box || sampleBox(1));
  elements.learnCard.hidden = true;
  elements.decisionTitle.textContent = "Waiting for inspection";
  elements.decisionTitle.className = "";
  elements.decisionBody.textContent = "Run the simulated inspection to generate an AI suggestion.";
  elements.confidenceValue.textContent = "--";
  elements.confidenceBar.style.width = "0%";
  elements.defectClass.textContent = "--";
  elements.rootCause.textContent = "--";
  elements.reviewButtons.forEach((button) => {
    button.disabled = false;
  });
  elements.inspect.textContent = selected.inScope === false ? "Review image scope" : "Run simulated inspection";
  elements.contactPanel.hidden = true;
  elements.pilotContact.textContent = "Discuss a real pilot";
  setStep("source");
  renderSamples();
}

function placeBox(box) {
  elements.bbox.style.left = `${box.left}%`;
  elements.bbox.style.top = `${box.top}%`;
  elements.bbox.style.width = `${box.width}%`;
  elements.bbox.style.height = `${box.height}%`;
}

function runInspection() {
  if (selected.inScope === false) {
    elements.decisionTitle.textContent = "OUT OF SCOPE";
    elements.decisionTitle.className = "decision-out";
    elements.decisionBody.textContent = "Industrial steel or metal part not detected. This demo refuses to score unrelated images.";
    elements.confidenceValue.textContent = "--";
    elements.confidenceBar.style.width = "0%";
    elements.defectClass.textContent = "Not an industrial metal part";
    elements.rootCause.textContent = "Use a steel beam, machined component, casting, bracket, rail or another metal inspection image.";
    elements.reviewButtons.forEach((button) => {
      button.disabled = true;
    });
    setStep("inspect");
    elements.aiCard.scrollIntoView({behavior: "smooth", block: "center"});
    return;
  }

  const tone = selected.outcome.toLowerCase();
  elements.decisionTitle.textContent = selected.outcome;
  elements.decisionTitle.className = `decision-${tone}`;
  elements.decisionBody.textContent = selected.simulated
    ? "Browser-side simulated vision scan estimated visual risk from contrast, edge density and image structure."
    : selected.outcome === "PASS"
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
  if (selected.inScope === false) return;
  verified += 1;
  queue += selected.outcome === "PASS" ? 0 : 1;
  elements.reviewDecision.textContent = label;
  elements.reviewCopy.textContent = copy;
  elements.verifiedCount.textContent = verified;
  elements.queueCount.textContent = queue;
  elements.learnCard.hidden = false;
  elements.contactPanel.hidden = true;
  setStep("learn");
  elements.learnCard.scrollIntoView({behavior: "smooth", block: "center"});
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read uploaded image."));
    image.src = url;
  });
}

async function analyzeUploadedImage(url, fileName) {
  const image = await loadImage(url);
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", {willReadFrequently: true});
  ctx.drawImage(image, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size).data;
  const gray = new Float32Array(size * size);
  let sum = 0;
  let dark = 0;
  let bright = 0;
  let saturation = 0;
  let neutral = 0;
  let colored = 0;
  let midTone = 0;

  for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const value = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[p] = value;
    sum += value;
    if (value < 55) dark += 1;
    if (value > 210) bright += 1;
    const sat = max === 0 ? 0 : (max - min) / max;
    saturation += sat;
    if (sat < 0.18 && value > 35 && value < 235) neutral += 1;
    if (sat > 0.32 && value > 45) colored += 1;
    if (value > 70 && value < 205) midTone += 1;
  }

  const total = gray.length;
  const mean = sum / total;
  let variance = 0;
  let edgeSum = 0;
  let edgeCount = 0;
  let minX = size;
  let minY = size;
  let maxX = 0;
  let maxY = 0;
  let hotX = 0;
  let hotY = 0;
  let hotWeight = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const value = gray[index];
      variance += (value - mean) ** 2;
      if (x < size - 1 && y < size - 1) {
        const edge = Math.abs(value - gray[index + 1]) + Math.abs(value - gray[index + size]);
        edgeSum += edge;
        edgeCount += 1;
        if (edge > 52) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          hotX += x * edge;
          hotY += y * edge;
          hotWeight += edge;
        }
      }
    }
  }

  const contrast = Math.sqrt(variance / total);
  const edgeDensity = edgeSum / edgeCount / 255;
  const darkRatio = dark / total;
  const brightRatio = bright / total;
  const colorfulness = saturation / total;
  const neutralRatio = neutral / total;
  const coloredRatio = colored / total;
  const midToneRatio = midTone / total;
  const name = fileName.toLowerCase();
  const metalNameHint = /steel|metal|alum|aluminum|aluminium|iron|casting|cast|weld|beam|flange|gear|rail|bracket|bearing|housing|machined|part|component|sheet|plate|bolt|screw|pipe|tube|profile/.test(name);
  const nonIndustrialNameHint = /screenshot|screen|diagram|chart|logo|presentation|slide|generated|loop|dashboard|website|web|ui|mockup|poster|person|face|animal|flower|landscape/.test(name);
  const metalVisualScore =
    neutralRatio * 0.52 +
    clamp(contrast / 82, 0, 1) * 0.22 +
    clamp(edgeDensity / 0.16, 0, 1) * 0.22 +
    midToneRatio * 0.12 -
    coloredRatio * 0.55 -
    (darkRatio > 0.62 ? 0.22 : 0) -
    (brightRatio > 0.72 ? 0.18 : 0);
  const visuallyMetal =
    metalVisualScore >= 0.48 &&
    neutralRatio >= 0.46 &&
    coloredRatio <= 0.2 &&
    edgeDensity >= 0.025 &&
    contrast >= 18 &&
    midToneRatio >= 0.18;
  const namedMetal =
    metalNameHint &&
    neutralRatio >= 0.32 &&
    coloredRatio <= 0.34 &&
    contrast >= 12;
  const inScope = !nonIndustrialNameHint && (namedMetal || visuallyMetal);

  if (!inScope) {
    return {
      id: 0,
      file: url,
      part: fileName.replace(/\.[^.]+$/, "") || "Uploaded image",
      defect: "Not an industrial metal part",
      station: "Manual upload / Scope gate",
      material: "Out of KanbAI demo scope",
      outcome: "OUT OF SCOPE",
      confidence: null,
      rootCause: "The demo only scores steel or metal inspection images. Use a machined component, casting, rail, bracket, beam or similar factory part.",
      box: {left: 42, top: 28, width: 22, height: 30},
      inScope: false,
      simulated: true
    };
  }

  const hints = [
    [/crack|fracture|broken|fissure/, "Crack", "FAIL", "Likely fracture or discontinuity"],
    [/scratch|scuff|abrasion/, "Scratch cluster", "REVIEW", "Surface handling or conveyor contact"],
    [/rust|corrosion|oxid/, "Corrosion", "FAIL", "Possible oxidation or surface contamination"],
    [/weld|seam/, "Weld anomaly", "REVIEW", "Possible weld bead variation"],
    [/dent|deform|bend/, "Geometry deformation", "REVIEW", "Possible handling or forming issue"],
    [/beam|steel|flange|metal/, "Surface scoring", "REVIEW", "Visible texture variation on metal surface"]
  ];
  const matched = hints.find(([pattern]) => pattern.test(name));

  let defect = matched?.[1] || "Surface anomaly";
  let outcome = matched?.[2] || "REVIEW";
  let rootCause = matched?.[3] || "Human label required before model training";

  if (!matched) {
    if (edgeDensity < 0.04 && contrast < 28) {
      defect = "No critical anomaly";
      outcome = "PASS";
      rootCause = "Low contrast variation and low edge disturbance";
    } else if (darkRatio > 0.38 || contrast > 65) {
      defect = "High-contrast defect";
      outcome = "FAIL";
      rootCause = "Strong local contrast suggests surface damage or occlusion";
    } else if (colorfulness > 0.22 && brightRatio > 0.12) {
      defect = "Coating inconsistency";
      outcome = "REVIEW";
      rootCause = "Color and brightness variance needs quality review";
    }
  }

  const confidence = clamp(Math.round(56 + contrast * 0.33 + edgeDensity * 145 + darkRatio * 16 + colorfulness * 10), 62, 97);
  const box = maxX > minX && maxY > minY && hotWeight > 0
    ? {
      left: clamp(Math.round((hotX / hotWeight / size) * 100) - 11, 6, 78),
      top: clamp(Math.round((hotY / hotWeight / size) * 100) - 14, 8, 72),
      width: clamp(Math.round(18 + edgeDensity * 42), 18, 36),
      height: clamp(Math.round(22 + contrast * 0.18), 20, 40)
    }
    : {left: 42, top: 28, width: 22, height: 30};

  return {
    id: 0,
    file: url,
    part: fileName.replace(/\.[^.]+$/, "") || "Uploaded part",
    defect,
    station: "Manual upload / Browser scan",
    material: "User supplied image",
    outcome,
    confidence,
    rootCause,
    box,
    inScope: true,
    simulated: true
  };
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

elements.upload?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  selected = {
    id: 0,
    file: objectUrl,
    part: file.name.replace(/\.[^.]+$/, "") || "Uploaded part",
    defect: "Analyzing image",
    station: "Manual upload / Browser scan",
    material: "User supplied image",
    outcome: "REVIEW",
    confidence: 67,
    rootCause: "Browser analysis in progress",
    box: {left: 42, top: 28, width: 22, height: 30},
    inScope: null,
    simulated: true
  };
  updatePreview("Analyzing image");
  elements.inspect.disabled = true;
  elements.inspect.textContent = "Analyzing image...";
  try {
    selected = await analyzeUploadedImage(objectUrl, file.name);
    updatePreview("Uploaded image analyzed");
  } catch {
    selected.rootCause = "Image could not be decoded; human review required";
    updatePreview("Uploaded image");
  } finally {
    elements.inspect.disabled = false;
  }
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
elements.pilotContact?.addEventListener("click", async () => {
  elements.contactPanel.hidden = false;
  try {
    await navigator.clipboard.writeText("zeynep.balkan2009@gmail.com");
    elements.pilotContact.textContent = "Email copied";
  } catch {
    elements.pilotContact.textContent = "Contact details shown";
  }
});

renderSamples();
updatePreview();
