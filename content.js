const STORAGE_KEYS = ["speed", "autoStart", "voiceEnabled", "dockCollapsed", "onboardingSeen"];
const DEFAULTS = {
  speed: 6,
  autoStart: false,
  voiceEnabled: false,
  dockCollapsed: false,
  onboardingSeen: false
};

const state = {
  ...DEFAULTS,
  scrolling: false,
  isListening: false,
  supportsVoice: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
};

let host = null;
let shadow = null;
let ui = {};
let listenersBound = false;
let scrollFrameId = 0;
let lastFrameTime = 0;
let stuckFrames = 0;
let scrollTarget = null;
let recognition = null;
let toastTimer = 0;
let voiceRestartTimer = 0;
let suppressVoiceRestart = false;

bootstrap();

function bootstrap() {
  if (window.top !== window.self && !isPdfContext()) {
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}

async function init() {
  const stored = await storageGet(STORAGE_KEYS);
  Object.assign(state, DEFAULTS, stored);

  ensureUi();
  bindGlobalListeners();
  render();

  if (!state.onboardingSeen) {
    showToast("AutoScroller is ready. Press Alt+S to start.", 5200);
    state.onboardingSeen = true;
    saveSettings({ onboardingSeen: true });
  }

  if (state.voiceEnabled) {
    setVoiceEnabled(true, { force: true, skipPersist: true, announce: false });
  }

  if (state.autoStart) {
    window.setTimeout(() => {
      startScroll({ announce: false });
    }, 250);
  }
}

function ensureUi() {
  if (host && document.contains(host)) {
    return;
  }

  host = document.createElement("div");
  host.id = "autoscroller-root";
  host.style.position = "fixed";
  host.style.right = "20px";
  host.style.bottom = "20px";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";

  shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host {
        color-scheme: light dark;
      }

      * {
        box-sizing: border-box;
      }

      .shell {
        position: relative;
        font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
        pointer-events: none;
      }

      .panel,
      .compact-bar {
        pointer-events: auto;
      }

      .panel {
        width: min(320px, calc(100vw - 32px));
        display: grid;
        gap: 14px;
        padding: 16px;
        border-radius: 20px;
        border: 1px solid rgba(148, 163, 184, 0.32);
        background: rgba(248, 250, 252, 0.96);
        color: #0f172a;
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
      }

      .panel.hidden,
      .compact-bar.hidden {
        display: none;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 12px;
      }

      .eyebrow {
        margin: 0 0 6px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #64748b;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid transparent;
        font-size: 12px;
        font-weight: 700;
      }

      .status-badge[data-state="ready"] {
        background: #e2e8f0;
        border-color: #cbd5e1;
        color: #334155;
      }

      .status-badge[data-state="scrolling"] {
        background: #dbeafe;
        border-color: #bfdbfe;
        color: #1d4ed8;
      }

      .status-badge[data-state="listening"] {
        background: #fef3c7;
        border-color: #fcd34d;
        color: #92400e;
      }

      .ghost-button,
      .step-button,
      .toggle-chip,
      .compact-primary,
      .compact-secondary,
      .primary-button {
        border: 0;
        cursor: pointer;
        transition:
          transform 140ms ease,
          background-color 140ms ease,
          border-color 140ms ease,
          box-shadow 140ms ease,
          color 140ms ease;
      }

      .ghost-button:focus-visible,
      .step-button:focus-visible,
      .toggle-chip:focus-visible,
      .compact-primary:focus-visible,
      .compact-secondary:focus-visible,
      .primary-button:focus-visible,
      .slider:focus-visible {
        outline: 2px solid #2563eb;
        outline-offset: 2px;
      }

      .ghost-button {
        min-height: 36px;
        padding: 0 12px;
        border-radius: 12px;
        background: rgba(226, 232, 240, 0.9);
        color: #334155;
        font-size: 12px;
        font-weight: 700;
      }

      .ghost-button:hover,
      .ghost-button:active {
        background: rgba(203, 213, 225, 0.95);
      }

      .primary-button {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        min-height: 48px;
        padding: 0 16px;
        border-radius: 14px;
        background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
        color: #ffffff;
        font-size: 15px;
        font-weight: 700;
        box-shadow: 0 12px 28px rgba(37, 99, 235, 0.22);
      }

      .primary-button:hover {
        transform: translateY(-1px);
      }

      .primary-button.is-active {
        background: linear-gradient(135deg, #b45309 0%, #d97706 100%);
        box-shadow: 0 12px 28px rgba(217, 119, 6, 0.22);
      }

      .speed-card {
        display: grid;
        gap: 12px;
        padding: 14px;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.26);
        background: rgba(255, 255, 255, 0.8);
      }

      .speed-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .speed-header label {
        font-size: 13px;
        font-weight: 700;
        color: #334155;
      }

      .speed-header output {
        font-size: 13px;
        font-weight: 700;
        color: #1d4ed8;
      }

      .stepper {
        display: grid;
        grid-template-columns: 40px 1fr 40px;
        align-items: center;
        gap: 12px;
      }

      .step-button {
        min-width: 40px;
        min-height: 40px;
        border-radius: 12px;
        background: rgba(226, 232, 240, 0.92);
        color: #0f172a;
        font-size: 22px;
        line-height: 1;
      }

      .step-button:hover {
        transform: translateY(-1px);
        background: rgba(203, 213, 225, 0.98);
      }

      .slider {
        width: 100%;
        height: 6px;
        margin: 0;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(37, 99, 235, 0.18) 0%, rgba(37, 99, 235, 0.52) 100%);
        appearance: none;
      }

      .slider::-webkit-slider-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        background: #2563eb;
        appearance: none;
        box-shadow: 0 4px 10px rgba(37, 99, 235, 0.35);
      }

      .slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border: 2px solid #ffffff;
        border-radius: 50%;
        background: #2563eb;
        box-shadow: 0 4px 10px rgba(37, 99, 235, 0.35);
      }

      .option-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .toggle-chip {
        display: grid;
        gap: 4px;
        min-height: 74px;
        padding: 12px;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        background: rgba(255, 255, 255, 0.86);
        text-align: left;
        color: #0f172a;
      }

      .toggle-chip:hover {
        transform: translateY(-1px);
        border-color: rgba(96, 165, 250, 0.5);
      }

      .toggle-chip.is-on {
        border-color: rgba(37, 99, 235, 0.4);
        background: #eff6ff;
        box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.16);
      }

      .toggle-chip:disabled {
        cursor: not-allowed;
        opacity: 0.6;
        transform: none;
      }

      .toggle-title {
        font-size: 13px;
        font-weight: 700;
      }

      .toggle-meta {
        font-size: 11px;
        line-height: 1.45;
        color: #64748b;
      }

      .footer-note {
        margin: 0;
        font-size: 11px;
        line-height: 1.5;
        color: #64748b;
      }

      .compact-bar {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 10px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.96);
        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.28);
      }

      .compact-primary,
      .compact-secondary {
        min-height: 40px;
        padding: 0 14px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 700;
      }

      .compact-primary {
        background: #2563eb;
        color: #ffffff;
      }

      .compact-primary.is-active {
        background: #d97706;
      }

      .compact-secondary {
        background: rgba(226, 232, 240, 0.12);
        color: #e2e8f0;
      }

      .toast {
        position: absolute;
        right: 0;
        bottom: calc(100% + 12px);
        max-width: 280px;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(15, 23, 42, 0.96);
        color: #f8fafc;
        font-size: 12px;
        line-height: 1.45;
        box-shadow: 0 14px 28px rgba(15, 23, 42, 0.24);
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 160ms ease, transform 160ms ease;
        pointer-events: none;
      }

      .toast.visible {
        opacity: 1;
        transform: translateY(0);
      }

      @media (prefers-color-scheme: dark) {
        .panel {
          border-color: rgba(71, 85, 105, 0.82);
          background: rgba(15, 23, 42, 0.96);
          color: #e2e8f0;
          box-shadow: 0 20px 56px rgba(2, 6, 23, 0.42);
        }

        .eyebrow,
        .toggle-meta,
        .footer-note {
          color: #94a3b8;
        }

        .status-badge[data-state="ready"] {
          background: rgba(51, 65, 85, 0.88);
          border-color: rgba(100, 116, 139, 0.72);
          color: #e2e8f0;
        }

        .status-badge[data-state="scrolling"] {
          background: rgba(29, 78, 216, 0.2);
          border-color: rgba(96, 165, 250, 0.38);
          color: #bfdbfe;
        }

        .status-badge[data-state="listening"] {
          background: rgba(180, 83, 9, 0.24);
          border-color: rgba(251, 191, 36, 0.42);
          color: #fde68a;
        }

        .ghost-button,
        .step-button {
          background: rgba(51, 65, 85, 0.9);
          color: #e2e8f0;
        }

        .ghost-button:hover,
        .step-button:hover {
          background: rgba(71, 85, 105, 0.94);
        }

        .speed-card,
        .toggle-chip {
          border-color: rgba(71, 85, 105, 0.72);
          background: rgba(15, 23, 42, 0.84);
          color: #e2e8f0;
        }

        .toggle-chip.is-on {
          background: rgba(30, 64, 175, 0.3);
          border-color: rgba(96, 165, 250, 0.4);
        }

        .speed-header label {
          color: #cbd5e1;
        }

        .speed-header output {
          color: #93c5fd;
        }
      }

      @media (max-width: 640px) {
        .panel {
          width: min(300px, calc(100vw - 24px));
          padding: 14px;
          gap: 12px;
        }

        .option-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
    <div class="shell">
      <section id="panel" class="panel">
        <div class="header">
          <div>
            <p class="eyebrow">AutoScroller</p>
            <p id="statusBadge" class="status-badge" data-state="ready">Ready</p>
          </div>
          <button id="collapseButton" class="ghost-button" type="button" aria-label="Collapse controls">
            Hide
          </button>
        </div>

        <button id="toggleButton" class="primary-button" type="button">
          Start scrolling
        </button>

        <div class="speed-card">
          <div class="speed-header">
            <label for="speedSlider">Speed</label>
            <output id="speedValue" for="speedSlider">6/20</output>
          </div>

          <div class="stepper">
            <button id="slowerButton" class="step-button" type="button" aria-label="Decrease speed">
              -
            </button>
            <input id="speedSlider" class="slider" type="range" min="1" max="20" value="6" />
            <button id="fasterButton" class="step-button" type="button" aria-label="Increase speed">
              +
            </button>
          </div>
        </div>

        <div class="option-grid">
          <button id="autoStartButton" class="toggle-chip" type="button" aria-pressed="false">
            <span class="toggle-title">Auto-start</span>
            <span class="toggle-meta">Begin on page load</span>
          </button>

          <button id="voiceButton" class="toggle-chip" type="button" aria-pressed="false">
            <span class="toggle-title">Voice</span>
            <span id="voiceMeta" class="toggle-meta">Start, pause, faster, slower</span>
          </button>
        </div>

        <p id="footerNote" class="footer-note">
          Shortcuts: Alt+S to start or pause, Alt+[ and Alt+] to adjust speed.
        </p>
      </section>

      <div id="compactBar" class="compact-bar hidden">
        <button id="compactToggle" class="compact-primary" type="button">Start</button>
        <button id="expandButton" class="compact-secondary" type="button">Open</button>
      </div>

      <div id="toast" class="toast" role="status" aria-live="polite"></div>
    </div>
  `;

  (document.body || document.documentElement).appendChild(host);

  ui = {
    panel: shadow.getElementById("panel"),
    statusBadge: shadow.getElementById("statusBadge"),
    collapseButton: shadow.getElementById("collapseButton"),
    toggleButton: shadow.getElementById("toggleButton"),
    speedSlider: shadow.getElementById("speedSlider"),
    speedValue: shadow.getElementById("speedValue"),
    slowerButton: shadow.getElementById("slowerButton"),
    fasterButton: shadow.getElementById("fasterButton"),
    autoStartButton: shadow.getElementById("autoStartButton"),
    voiceButton: shadow.getElementById("voiceButton"),
    voiceMeta: shadow.getElementById("voiceMeta"),
    footerNote: shadow.getElementById("footerNote"),
    compactBar: shadow.getElementById("compactBar"),
    compactToggle: shadow.getElementById("compactToggle"),
    expandButton: shadow.getElementById("expandButton"),
    toast: shadow.getElementById("toast")
  };

  bindUiListeners();
}

function bindUiListeners() {
  ui.toggleButton.addEventListener("click", () => {
    toggleScroll({ announce: true });
  });

  ui.compactToggle.addEventListener("click", () => {
    toggleScroll({ announce: true });
  });

  ui.collapseButton.addEventListener("click", () => {
    setDockCollapsed(true);
  });

  ui.expandButton.addEventListener("click", () => {
    setDockCollapsed(false);
  });

  ui.slowerButton.addEventListener("click", () => {
    updateSpeed(state.speed - 1, { announce: true });
  });

  ui.fasterButton.addEventListener("click", () => {
    updateSpeed(state.speed + 1, { announce: true });
  });

  ui.speedSlider.addEventListener("input", (event) => {
    updateSpeed(Number(event.target.value), { announce: false });
  });

  ui.speedSlider.addEventListener("change", () => {
    showToast(`Speed set to ${state.speed}/20.`);
  });

  ui.autoStartButton.addEventListener("click", () => {
    setAutoStart(!state.autoStart, { announce: true });
  });

  ui.voiceButton.addEventListener("click", () => {
    setVoiceEnabled(!state.voiceEnabled, { announce: true });
  });
}

function bindGlobalListeners() {
  if (listenersBound) {
    return;
  }

  listenersBound = true;

  document.addEventListener("keydown", handleDocumentKeydown, true);
  document.addEventListener("wheel", handleManualInterrupt, { passive: true, capture: true });
  document.addEventListener("touchstart", handleManualInterrupt, { passive: true, capture: true });
  window.addEventListener("beforeunload", cleanup, { once: true });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleRuntimeMessage(message, sendResponse);
    return true;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    if (changes.speed && Number(changes.speed.newValue) !== state.speed) {
      state.speed = clamp(Number(changes.speed.newValue) || DEFAULTS.speed, 1, 20);
      render();
    }

    if (changes.autoStart && Boolean(changes.autoStart.newValue) !== state.autoStart) {
      state.autoStart = Boolean(changes.autoStart.newValue);
      render();
    }

    if (changes.dockCollapsed && Boolean(changes.dockCollapsed.newValue) !== state.dockCollapsed) {
      state.dockCollapsed = Boolean(changes.dockCollapsed.newValue);
      render();
    }

    if (changes.voiceEnabled && Boolean(changes.voiceEnabled.newValue) !== state.voiceEnabled) {
      setVoiceEnabled(Boolean(changes.voiceEnabled.newValue), {
        force: true,
        skipPersist: true,
        announce: false
      });
    }
  });
}

function handleRuntimeMessage(message, sendResponse) {
  switch (message?.action) {
    case "getState":
      sendResponse(buildStateSnapshot());
      return;
    case "toggle":
      sendResponse(toggleScroll({ announce: false }));
      return;
    case "setSpeed":
    case "speedChange":
      updateSpeed(message.speed, { announce: false, skipPersist: true });
      sendResponse(buildStateSnapshot());
      return;
    case "setAutoStart":
    case "autoStartChange":
      setAutoStart(message.enabled, { announce: false, skipPersist: true });
      sendResponse(buildStateSnapshot());
      return;
    case "setVoiceEnabled":
    case "voiceChange":
      setVoiceEnabled(message.enabled, { force: true, announce: false, skipPersist: true });
      sendResponse(buildStateSnapshot());
      return;
    default:
      sendResponse(buildStateSnapshot());
  }
}

function render() {
  if (!ui.panel) {
    return;
  }

  const status = getStatusPresentation();
  ui.statusBadge.dataset.state = status.state;
  ui.statusBadge.textContent = status.label;

  ui.toggleButton.textContent = state.scrolling ? "Pause scrolling" : "Start scrolling";
  ui.toggleButton.classList.toggle("is-active", state.scrolling);

  ui.speedSlider.value = String(state.speed);
  ui.speedValue.textContent = `${state.speed}/20`;

  syncToggleButton(ui.autoStartButton, state.autoStart);
  syncToggleButton(ui.voiceButton, state.voiceEnabled && state.supportsVoice);
  ui.voiceButton.disabled = !state.supportsVoice;
  ui.voiceButton.setAttribute("aria-disabled", String(!state.supportsVoice));

  if (!state.supportsVoice) {
    ui.voiceMeta.textContent = "Speech recognition is unavailable here";
  } else if (state.isListening) {
    ui.voiceMeta.textContent = "Listening for start, pause, faster, slower";
  } else {
    ui.voiceMeta.textContent = "Start, pause, faster, slower";
  }

  ui.footerNote.textContent = state.supportsVoice
    ? "Shortcuts: Alt+S to start or pause, Alt+[ and Alt+] to adjust speed."
    : "Shortcuts: Alt+S to start or pause, Alt+[ and Alt+] to adjust speed. Voice is unavailable on this page.";

  ui.panel.classList.toggle("hidden", state.dockCollapsed);
  ui.compactBar.classList.toggle("hidden", !state.dockCollapsed);
  ui.compactToggle.textContent = state.scrolling ? "Pause" : "Start";
  ui.compactToggle.classList.toggle("is-active", state.scrolling);
}

function syncToggleButton(button, enabled) {
  button.classList.toggle("is-on", enabled);
  button.setAttribute("aria-pressed", String(enabled));
}

function getStatusPresentation() {
  if (state.scrolling) {
    return { state: "scrolling", label: "Scrolling" };
  }

  if (state.isListening) {
    return { state: "listening", label: "Listening" };
  }

  return { state: "ready", label: "Ready" };
}

function setDockCollapsed(collapsed) {
  state.dockCollapsed = Boolean(collapsed);
  render();
  saveSettings({ dockCollapsed: state.dockCollapsed });
}

function toggleScroll(options = {}) {
  return state.scrolling
    ? stopScroll({ announce: options.announce !== false, message: "Scrolling paused." })
    : startScroll(options);
}

function startScroll(options = {}) {
  const nextTarget = resolveScrollTarget();
  if (!nextTarget) {
    showToast("No scrollable area was detected on this page.");
    return buildStateSnapshot();
  }

  scrollTarget = nextTarget;
  state.scrolling = true;
  lastFrameTime = 0;
  stuckFrames = 0;

  if (scrollFrameId) {
    cancelAnimationFrame(scrollFrameId);
  }

  scrollFrameId = requestAnimationFrame(runScrollLoop);
  render();

  if (options.announce !== false) {
    showToast("Scrolling started.");
  }

  return buildStateSnapshot();
}

function stopScroll(options = {}) {
  if (scrollFrameId) {
    cancelAnimationFrame(scrollFrameId);
    scrollFrameId = 0;
  }

  state.scrolling = false;
  lastFrameTime = 0;
  stuckFrames = 0;
  scrollTarget = null;
  render();

  if (options.announce !== false && options.message) {
    showToast(options.message);
  }

  return buildStateSnapshot();
}

function runScrollLoop(timestamp) {
  if (!state.scrolling) {
    return;
  }

  if (!lastFrameTime) {
    lastFrameTime = timestamp;
    scrollFrameId = requestAnimationFrame(runScrollLoop);
    return;
  }

  const deltaMs = Math.min(64, timestamp - lastFrameTime);
  lastFrameTime = timestamp;

  if (!isUsableScrollTarget(scrollTarget)) {
    scrollTarget = resolveScrollTarget();
  }

  if (!scrollTarget) {
    stopScroll({ announce: true, message: "No scrollable area was detected on this page." });
    return;
  }

  const before = readScrollPosition(scrollTarget);
  applyScrollStep(scrollTarget, speedToPixelsPerSecond(state.speed) * (deltaMs / 1000));
  const after = readScrollPosition(scrollTarget);

  if (Math.abs(after - before) < 0.5) {
    const nextTarget = resolveScrollTarget();
    if (nextTarget && nextTarget !== scrollTarget) {
      scrollTarget = nextTarget;
    }

    stuckFrames += 1;
  } else {
    stuckFrames = 0;
  }

  if (stuckFrames >= 18) {
    stopScroll({ announce: true, message: "Reached the end of this view." });
    return;
  }

  scrollFrameId = requestAnimationFrame(runScrollLoop);
}

function resolveScrollTarget() {
  const candidates = [];
  const activeScrollable = getScrollableAncestor(document.activeElement);
  if (activeScrollable) {
    candidates.push(activeScrollable);
  }

  if (isPdfContext()) {
    candidates.push(
      document.querySelector("#viewerContainer"),
      document.querySelector(".pdfViewer"),
      document.querySelector("#scroller"),
      document.querySelector("#plugin"),
      document.querySelector('embed[type="application/pdf"]'),
      document.querySelector('embed[type="application/x-google-chrome-pdf"]'),
      document.querySelector("embed")
    );
  }

  candidates.push(document.scrollingElement, document.documentElement, document.body);

  const selectorCandidates = [
    "#viewerContainer",
    ".pdfViewer",
    "[data-testid*='scroll']",
    "[class*='scroll']",
    "[class*='overflow']",
    "main",
    "[role='main']",
    "article",
    "section"
  ];

  for (const selector of selectorCandidates) {
    const nodes = document.querySelectorAll(selector);
    const limit = Math.min(nodes.length, 20);
    for (let index = 0; index < limit; index += 1) {
      candidates.push(nodes[index]);
    }
  }

  const uniqueCandidates = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);
    uniqueCandidates.push(candidate);
  }

  return (
    uniqueCandidates
      .filter(isUsableScrollTarget)
      .sort((left, right) => scoreScrollTarget(right) - scoreScrollTarget(left))[0] || null
  );
}

function isUsableScrollTarget(element) {
  if (!element) {
    return false;
  }

  if (host === element || (shadow && shadow.contains(element))) {
    return false;
  }

  if (isDocumentTarget(element)) {
    return getScrollRange(element) > 40;
  }

  if (!(element instanceof Element)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 80) {
    return false;
  }

  if (rect.bottom < -40 || rect.top > window.innerHeight + 40) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  const className = typeof element.className === "string" ? element.className.toLowerCase() : "";
  const looksScrollable =
    overflowY === "auto" ||
    overflowY === "scroll" ||
    overflowY === "overlay" ||
    className.includes("scroll") ||
    className.includes("overflow");

  return looksScrollable && getScrollRange(element) > 60;
}

function scoreScrollTarget(element) {
  const range = getScrollRange(element);
  const visibleHeight = isDocumentTarget(element)
    ? window.innerHeight
    : Math.min(element.clientHeight || 0, window.innerHeight);
  const documentBonus = isDocumentTarget(element) ? 220 : 0;
  const activeBonus = element?.contains?.(document.activeElement) ? 80 : 0;
  const pdfBonus = isPdfContext() ? 60 : 0;

  return range + visibleHeight + documentBonus + activeBonus + pdfBonus;
}

function getScrollableAncestor(node) {
  let current = node;
  while (current && current !== document.body && current !== document.documentElement) {
    if (isUsableScrollTarget(current)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function getScrollRange(element) {
  if (!element) {
    return 0;
  }

  if (isDocumentTarget(element)) {
    const scrollingElement = document.scrollingElement || document.documentElement || document.body;
    if (!scrollingElement) {
      return 0;
    }

    return Math.max(0, scrollingElement.scrollHeight - window.innerHeight);
  }

  return Math.max(0, (element.scrollHeight || 0) - (element.clientHeight || 0));
}

function readScrollPosition(element) {
  if (isDocumentTarget(element)) {
    const root = document.scrollingElement || document.documentElement || document.body;
    return Math.max(window.scrollY || 0, root?.scrollTop || 0);
  }

  return element.scrollTop || 0;
}

function applyScrollStep(element, amount) {
  if (!element || amount <= 0) {
    return;
  }

  if (isPdfContext()) {
    dispatchSyntheticWheel(element, amount);
  }

  if (isDocumentTarget(element)) {
    const before = readScrollPosition(element);

    if (typeof window.scrollBy === "function") {
      window.scrollBy({ top: amount, left: 0, behavior: "auto" });
    }

    const after = readScrollPosition(element);
    const scrollingElement = document.scrollingElement || document.documentElement || document.body;
    if (scrollingElement && Math.abs(after - before) < 0.5) {
      scrollingElement.scrollTop += amount;
    }

    return;
  }

  if (typeof element.scrollBy === "function") {
    element.scrollBy({ top: amount, left: 0, behavior: "auto" });
    return;
  }

  if ("scrollTop" in element) {
    element.scrollTop += amount;
  }
}

function dispatchSyntheticWheel(element, amount) {
  try {
    const wheelEvent = new WheelEvent("wheel", {
      deltaY: amount,
      bubbles: true,
      cancelable: true,
      view: window
    });

    element.dispatchEvent(wheelEvent);
  } catch (error) {
    // Ignore PDF viewer wheel dispatch failures.
  }
}

function speedToPixelsPerSecond(speed) {
  return 60 + clamp(Number(speed) || DEFAULTS.speed, 1, 20) * 36;
}

function updateSpeed(nextSpeed, options = {}) {
  const clampedSpeed = clamp(Number(nextSpeed) || DEFAULTS.speed, 1, 20);
  const changed = clampedSpeed !== state.speed;

  state.speed = clampedSpeed;
  render();

  if (!options.skipPersist) {
    saveSettings({ speed: state.speed });
  }

  if (options.announce && changed) {
    showToast(`Speed set to ${state.speed}/20.`);
  }

  return buildStateSnapshot();
}

function setAutoStart(enabled, options = {}) {
  const nextValue = Boolean(enabled);
  const changed = nextValue !== state.autoStart;
  state.autoStart = nextValue;
  render();

  if (!options.skipPersist) {
    saveSettings({ autoStart: state.autoStart });
  }

  if (options.announce && changed) {
    showToast(state.autoStart ? "Auto-start enabled." : "Auto-start disabled.");
  }

  return buildStateSnapshot();
}

function setVoiceEnabled(enabled, options = {}) {
  const nextValue = Boolean(enabled);

  if (nextValue && !state.supportsVoice) {
    state.voiceEnabled = false;
    render();

    if (!options.skipPersist) {
      saveSettings({ voiceEnabled: false });
    }

    if (options.announce !== false) {
      showToast("Voice control is not supported on this page.");
    }

    return buildStateSnapshot();
  }

  const changed = nextValue !== state.voiceEnabled;
  state.voiceEnabled = nextValue;
  render();

  if (!options.skipPersist) {
    saveSettings({ voiceEnabled: state.voiceEnabled });
  }

  if (!changed && !options.force) {
    return buildStateSnapshot();
  }

  if (state.voiceEnabled) {
    startVoiceRecognition();
  } else {
    stopVoiceRecognition();
  }

  if (options.announce && changed) {
    showToast(state.voiceEnabled ? "Voice control enabled." : "Voice control disabled.");
  }

  return buildStateSnapshot();
}

function startVoiceRecognition() {
  if (!state.supportsVoice) {
    return;
  }

  if (!recognition) {
    recognition = createRecognition();
  }

  if (!recognition || state.isListening) {
    render();
    return;
  }

  suppressVoiceRestart = false;
  window.clearTimeout(voiceRestartTimer);

  try {
    recognition.start();
    state.isListening = true;
    render();
  } catch (error) {
    if (!String(error?.message || error).toLowerCase().includes("already")) {
      disableVoiceControl("Voice control could not start. Check microphone access.");
    }
  }
}

function stopVoiceRecognition() {
  suppressVoiceRestart = true;
  window.clearTimeout(voiceRestartTimer);

  if (recognition && state.isListening) {
    try {
      recognition.stop();
    } catch (error) {
      // Ignore stop failures when the recognizer is already idle.
    }
  }

  state.isListening = false;
  render();
}

function createRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }

  const instance = new SpeechRecognition();
  instance.continuous = true;
  instance.interimResults = false;
  instance.lang = "en-US";

  instance.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript.toLowerCase().trim();

    if (transcript.includes("pause") || transcript.includes("stop")) {
      stopScroll({ announce: true, message: "Paused by voice command." });
      return;
    }

    if (transcript.includes("faster") || transcript.includes("speed up")) {
      updateSpeed(state.speed + 1, { announce: true });
      return;
    }

    if (transcript.includes("slower") || transcript.includes("slow down")) {
      updateSpeed(state.speed - 1, { announce: true });
      return;
    }

    if (transcript.includes("scroll") || transcript.includes("start")) {
      startScroll({ announce: true });
    }
  };

  instance.onerror = (event) => {
    if (event.error === "no-speech") {
      return;
    }

    if (
      event.error === "audio-capture" ||
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      disableVoiceControl("Voice control needs microphone permission in Chrome.");
      return;
    }

    state.isListening = false;
    render();
  };

  instance.onend = () => {
    state.isListening = false;
    render();

    if (!state.voiceEnabled || suppressVoiceRestart) {
      return;
    }

    voiceRestartTimer = window.setTimeout(() => {
      try {
        recognition.start();
        state.isListening = true;
        render();
      } catch (error) {
        disableVoiceControl("Voice control could not restart. Check microphone access.");
      }
    }, 500);
  };

  return instance;
}

function disableVoiceControl(message) {
  state.voiceEnabled = false;
  state.isListening = false;
  suppressVoiceRestart = true;
  render();
  saveSettings({ voiceEnabled: false });
  showToast(message);
}

function handleDocumentKeydown(event) {
  if (!event.isTrusted) {
    return;
  }

  if (eventTargetsDock(event) || isEditableTarget(event.target)) {
    return;
  }

  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    if (event.code === "KeyS") {
      event.preventDefault();
      toggleScroll({ announce: true });
      return;
    }

    if (event.code === "BracketLeft") {
      event.preventDefault();
      updateSpeed(state.speed - 1, { announce: true });
      return;
    }

    if (event.code === "BracketRight") {
      event.preventDefault();
      updateSpeed(state.speed + 1, { announce: true });
    }
  }

  if (state.scrolling && isNavigationKey(event.code)) {
    stopScroll({ announce: true, message: "Paused after manual input." });
  }
}

function handleManualInterrupt(event) {
  if (!state.scrolling || !event.isTrusted || eventTargetsDock(event)) {
    return;
  }

  stopScroll({ announce: true, message: "Paused after manual input." });
}

function eventTargetsDock(event) {
  return event.composedPath?.().includes(host) || false;
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.isContentEditable ||
      target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")
  );
}

function isNavigationKey(code) {
  return [
    "ArrowDown",
    "ArrowUp",
    "PageDown",
    "PageUp",
    "Space",
    "Home",
    "End"
  ].includes(code);
}

function buildStateSnapshot() {
  return {
    connected: true,
    scrolling: state.scrolling,
    speed: state.speed,
    autoStart: state.autoStart,
    voiceEnabled: state.voiceEnabled,
    supportsVoice: state.supportsVoice,
    dockCollapsed: state.dockCollapsed,
    pageTitle: document.title || ""
  };
}

function showToast(message, duration = 2600) {
  if (!ui.toast || !message) {
    return;
  }

  ui.toast.textContent = message;
  ui.toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    ui.toast.classList.remove("visible");
  }, duration);
}

function cleanup() {
  stopScroll({ announce: false });
  stopVoiceRecognition();
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, resolve);
  });
}

function saveSettings(nextSettings) {
  chrome.storage.sync.set(nextSettings);
}

function isDocumentTarget(element) {
  return (
    element === document.scrollingElement ||
    element === document.documentElement ||
    element === document.body
  );
}

function isPdfContext() {
  const href = window.location.href.toLowerCase();
  return (
    href.endsWith(".pdf") ||
    document.contentType === "application/pdf" ||
    Boolean(
      document.querySelector("#viewerContainer") ||
        document.querySelector(".pdfViewer") ||
        document.querySelector('embed[type="application/pdf"]') ||
        document.querySelector('embed[type="application/x-google-chrome-pdf"]')
    )
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
