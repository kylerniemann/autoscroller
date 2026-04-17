
const DEFAULTS = {
  speed: 6,
  autoStart: false,
  voiceEnabled: false
};

const popupState = {
  ...DEFAULTS,
  connected: false,
  scrolling: false,
  supportsVoice: true,
  pageTitle: "",
  tabUrl: ""
};

const elements = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  await loadPopupState();
}

function cacheElements() {
  elements.toggleScroll = document.getElementById("toggleScroll");
  elements.speedSlider = document.getElementById("speedSlider");
  elements.speedValue = document.getElementById("speedValue");
  elements.autoStartToggle = document.getElementById("autoStartToggle");
  elements.autoStartSwitch = document.getElementById("autoStartSwitch");
  elements.voiceToggle = document.getElementById("voiceToggle");
  elements.voiceSwitch = document.getElementById("voiceSwitch");
  elements.voiceCopy = document.getElementById("voiceCopy");
  elements.tabStatus = document.getElementById("tabStatus");
  elements.statusCopy = document.getElementById("statusCopy");
  elements.presetButtons = Array.from(document.querySelectorAll("[data-speed]"));
}

function bindEvents() {
  elements.toggleScroll.addEventListener("click", async () => {
    if (!popupState.connected) {
      return;
    }

    const response = await sendToActiveTab({ action: "toggle" });
    mergeRuntimeState(response);
    render();
  });

  elements.speedSlider.addEventListener("input", async (event) => {
    const speed = clamp(Number(event.target.value) || DEFAULTS.speed, 1, 20);
    popupState.speed = speed;
    render();
    await storageSet({ speed });
    const response = await sendToActiveTab({ action: "setSpeed", speed });
    mergeRuntimeState(response);
    render();
  });

  elements.autoStartToggle.addEventListener("click", async () => {
    const enabled = !popupState.autoStart;
    popupState.autoStart = enabled;
    render();
    await storageSet({ autoStart: enabled });
    const response = await sendToActiveTab({ action: "setAutoStart", enabled });
    mergeRuntimeState(response);
    render();
  });

  elements.voiceToggle.addEventListener("click", async () => {
    const enabled = !popupState.voiceEnabled;
    popupState.voiceEnabled = enabled;
    render();
    await storageSet({ voiceEnabled: enabled });
    const response = await sendToActiveTab({ action: "setVoiceEnabled", enabled });
    mergeRuntimeState(response);
    render();
  });

  elements.presetButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const speed = clamp(Number(button.dataset.speed) || DEFAULTS.speed, 1, 20);
      popupState.speed = speed;
      render();
      await storageSet({ speed });
      const response = await sendToActiveTab({ action: "setSpeed", speed });
      mergeRuntimeState(response);
      render();
    });
  });
}

async function loadPopupState() {
  const stored = await storageGet(["speed", "autoStart", "voiceEnabled"]);
  Object.assign(popupState, DEFAULTS, stored);

  const tab = await getActiveTab();
  if (tab) {
    popupState.pageTitle = tab.title || "";
    popupState.tabUrl = tab.url || "";
  }

  const runtimeState = await sendToActiveTab({ action: "getState" });
  mergeRuntimeState(runtimeState);
  render();
}

function mergeRuntimeState(runtimeState) {
  if (!runtimeState) {
    popupState.connected = false;
    popupState.scrolling = false;
    return;
  }

  Object.assign(popupState, runtimeState, { connected: true });
}

function render() {
  elements.speedSlider.value = String(popupState.speed);
  elements.speedValue.textContent = `${popupState.speed}/20`;

  elements.toggleScroll.disabled = !popupState.connected;
  elements.toggleScroll.textContent = popupState.connected
    ? popupState.scrolling
      ? "Pause scrolling"
      : "Start scrolling"
    : "Open a supported tab";
  elements.toggleScroll.classList.toggle("is-active", popupState.scrolling);

  syncToggle(elements.autoStartToggle, elements.autoStartSwitch, popupState.autoStart);
  syncToggle(elements.voiceToggle, elements.voiceSwitch, popupState.voiceEnabled);

  elements.presetButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.speed) === popupState.speed);
  });

  const pageLabel = shortPageLabel(popupState.pageTitle || popupState.tabUrl || "this page");

  if (popupState.connected && popupState.scrolling) {
    setStatus("live", "Live", `Scrolling on ${pageLabel}.`);
  } else if (popupState.connected) {
    setStatus("ready", "Ready", `Controls are available on ${pageLabel}.`);
  } else {
    setStatus(
      "unsupported",
      "Unsupported",
      "Open a standard webpage or PDF tab to control scrolling."
    );
  }

  elements.voiceCopy.textContent = popupState.supportsVoice
    ? "Say start, pause, faster, or slower."
    : "Voice control is unavailable on this page.";
}

function setStatus(kind, label, copy) {
  elements.tabStatus.className = `status-badge ${kind}`;
  elements.tabStatus.textContent = label;
  elements.statusCopy.textContent = copy;
}

function syncToggle(button, switchElement, enabled) {
  button.classList.toggle("is-on", enabled);
  button.setAttribute("aria-pressed", String(enabled));
  switchElement.classList.toggle("enabled", enabled);
}

function shortPageLabel(value) {
  if (!value) {
    return "this page";
  }

  const trimmed = value.trim();
  return trimmed.length > 42 ? `${trimmed.slice(0, 39)}...` : trimmed;
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, resolve);
  });
}

function storageSet(nextValues) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(nextValues, resolve);
  });
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] || null);
    });
  });
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();
  if (!tab?.id) {
    return null;
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    return null;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
