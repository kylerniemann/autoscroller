
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleScroll");
  const speedSlider = document.getElementById("speedSlider");
  const speedValue = document.getElementById("speedValue");
  const autoStart = document.getElementById("autoStart");
  const autoStartToggle = document.getElementById("autoStartToggle");
  const toggleSwitch = document.getElementById("toggleSwitch");
  const voiceEnabled = document.getElementById("voiceEnabled");
  const voiceToggle = document.getElementById("voiceToggle");
  const voiceSwitch = document.getElementById("voiceSwitch");

  // Load saved settings
  chrome.storage.sync.get(["speed", "autoStart", "voiceEnabled"], data => {
    if (data.speed) {
      speedSlider.value = data.speed;
      speedValue.textContent = data.speed;
    }
    if (data.autoStart !== undefined) {
      autoStart.checked = data.autoStart;
      toggleSwitch.classList.toggle('enabled', data.autoStart);
    }
    if (data.voiceEnabled !== undefined) {
      voiceEnabled.checked = data.voiceEnabled;
      voiceSwitch.classList.toggle('enabled', data.voiceEnabled);
    }
  });

  // Speed slider
  speedSlider.addEventListener("input", () => {
    const speed = parseInt(speedSlider.value);
    speedValue.textContent = speed;
    chrome.storage.sync.set({ speed: speed });
    // Notify content script of speed change
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "speedChange", speed: speed }).catch(() => {
          // Ignore errors if content script isn't ready
        });
      }
    });
  });

  // Auto-start toggle
  autoStartToggle.addEventListener("click", () => {
    autoStart.checked = !autoStart.checked;
    toggleSwitch.classList.toggle('enabled', autoStart.checked);
    chrome.storage.sync.set({ autoStart: autoStart.checked });
    // Notify content script of auto-start change
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "autoStartChange", enabled: autoStart.checked }).catch(() => {
          // Ignore errors if content script isn't ready
        });
      }
    });
  });

  // Voice control toggle
  voiceToggle.addEventListener("click", () => {
    voiceEnabled.checked = !voiceEnabled.checked;
    voiceSwitch.classList.toggle('enabled', voiceEnabled.checked);
    chrome.storage.sync.set({ voiceEnabled: voiceEnabled.checked });
    // Notify content script of voice control change
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "voiceChange", enabled: voiceEnabled.checked }).catch(() => {
          // Ignore errors if content script isn't ready
        });
      }
    });
  });

  // Toggle scroll button
  toggleBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggle" }).then(() => {
          // Update button text after toggle
          setTimeout(() => {
            const currentText = toggleBtn.textContent.trim();
            toggleBtn.textContent = currentText.includes('▶') ? '⏸ Pause' : '▶ Start';
          }, 100);
        }).catch(() => {
          // Ignore errors if content script isn't ready
        });
      }
    });
  });
});
