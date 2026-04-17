
let scrolling = false;
let interval;
let floatingButton = null;
let speedSlider = null;
let autoStartButton = null;
let voiceButton = null;
let currentSpeed = 5;
let autoStartEnabled = false;
let voiceEnabled = false;
let recognition = null;
let isListening = false;

// Inject CSS styles
function injectStyles() {
  // Check if styles already exist
  if (document.getElementById('autoscroller-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'autoscroller-styles';
  style.textContent = `
    #autoscroller-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      z-index: 2147483647;
      pointer-events: auto !important;
      background: rgba(255, 255, 255, 0.85);
      padding: 10px 6px;
      border-radius: 24px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
    }
    @media (prefers-color-scheme: dark) {
      #autoscroller-container {
        background: rgba(30, 30, 30, 0.9);
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      }
    }
    #autoscroller-floating-btn {
      width: 44px;
      height: 44px;
      background: #4285f4;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
      flex-shrink: 0;
      border: none;
    }
    #autoscroller-floating-btn:hover {
      background: #3367d6;
      transform: scale(1.08);
      box-shadow: 0 2px 8px rgba(66, 133, 244, 0.4);
    }
    #autoscroller-floating-btn:active {
      transform: scale(0.96);
    }
    #autoscroller-floating-btn.paused {
      background: #34a853;
    }
    #autoscroller-floating-btn.paused:hover {
      background: #2d8f47;
      box-shadow: 0 2px 8px rgba(52, 168, 83, 0.4);
    }
    #autoscroller-auto-start-btn {
      width: 44px;
      height: 44px;
      background: rgba(128, 128, 128, 0.2);
      color: #666;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
      flex-shrink: 0;
      border: 2px solid transparent;
      position: relative;
    }
    @media (prefers-color-scheme: dark) {
      #autoscroller-auto-start-btn {
        background: rgba(255, 255, 255, 0.1);
        color: #aaa;
      }
    }
    #autoscroller-auto-start-btn:hover {
      background: rgba(128, 128, 128, 0.3);
      transform: scale(1.08);
    }
    @media (prefers-color-scheme: dark) {
      #autoscroller-auto-start-btn:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }
    #autoscroller-auto-start-btn:active {
      transform: scale(0.96);
    }
    #autoscroller-auto-start-btn.enabled {
      background: #34a853;
      color: white;
      border-color: #2d8f47;
    }
    #autoscroller-auto-start-btn.enabled:hover {
      background: #2d8f47;
      box-shadow: 0 2px 8px rgba(52, 168, 83, 0.4);
    }
    #autoscroller-auto-start-icon {
      width: 20px;
      height: 20px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    #autoscroller-voice-btn {
      width: 44px;
      height: 44px;
      background: rgba(128, 128, 128, 0.2);
      color: #666;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
      flex-shrink: 0;
      border: 2px solid transparent;
      position: relative;
    }
    @media (prefers-color-scheme: dark) {
      #autoscroller-voice-btn {
        background: rgba(255, 255, 255, 0.1);
        color: #aaa;
      }
    }
    #autoscroller-voice-btn:hover {
      background: rgba(128, 128, 128, 0.3);
      transform: scale(1.08);
    }
    @media (prefers-color-scheme: dark) {
      #autoscroller-voice-btn:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }
    #autoscroller-voice-btn:active {
      transform: scale(0.96);
    }
    #autoscroller-voice-btn.enabled {
      background: #ea4335;
      color: white;
      border-color: #d33b2c;
    }
    #autoscroller-voice-btn.enabled:hover {
      background: #d33b2c;
      box-shadow: 0 2px 8px rgba(234, 67, 53, 0.4);
    }
    #autoscroller-voice-btn.listening {
      background: #ea4335;
      color: white;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.7);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(234, 67, 53, 0);
      }
    }
    #autoscroller-speed-slider {
      width: 100px;
      height: 4px;
      border-radius: 2px;
      background: rgba(0, 0, 0, 0.1);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      transform: rotate(-90deg);
      margin: 50px 0;
      cursor: pointer;
    }
    @media (prefers-color-scheme: dark) {
      #autoscroller-speed-slider {
        background: rgba(255, 255, 255, 0.15);
      }
    }
    #autoscroller-speed-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #4285f4;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    #autoscroller-speed-slider::-webkit-slider-thumb:hover {
      background: #3367d6;
      transform: scale(1.2);
      box-shadow: 0 2px 6px rgba(66, 133, 244, 0.4);
    }
    #autoscroller-speed-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #4285f4;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    #autoscroller-speed-slider::-moz-range-thumb:hover {
      background: #3367d6;
      transform: scale(1.2);
      box-shadow: 0 2px 6px rgba(66, 133, 244, 0.4);
    }
    #autoscroller-speed-value {
      font-size: 10px;
      color: #666;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-weight: 600;
      letter-spacing: 0.5px;
      min-height: 14px;
    }
    @media (prefers-color-scheme: dark) {
      #autoscroller-speed-value {
        color: #aaa;
      }
    }
    #autoscroller-tutorial {
      position: fixed;
      bottom: 200px;
      right: 20px;
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10001;
      max-width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @media (prefers-color-scheme: dark) {
      #autoscroller-tutorial {
        background: #2d2d2d;
        color: #e0e0e0;
      }
    }
    #autoscroller-tutorial h3 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 20px;
    }
    @media (prefers-color-scheme: dark) {
      #autoscroller-tutorial h3 {
        color: #e0e0e0;
      }
    }
    #autoscroller-tutorial p {
      margin: 10px 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }
    @media (prefers-color-scheme: dark) {
      #autoscroller-tutorial p {
        color: #bbb;
      }
    }
    #autoscroller-tutorial ul {
      margin: 10px 0;
      padding-left: 20px;
      color: #666;
      font-size: 14px;
    }
    @media (prefers-color-scheme: dark) {
      #autoscroller-tutorial ul {
        color: #bbb;
      }
    }
    #autoscroller-tutorial li {
      margin: 8px 0;
      line-height: 1.5;
    }
    #autoscroller-tutorial button {
      margin-top: 15px;
      padding: 10px 20px;
      background: #4285f4;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }
    #autoscroller-tutorial button:hover {
      background: #3367d6;
    }
  `;
  document.head.appendChild(style);
}

// Create floating controls (button + speed slider + auto-start toggle)
function createFloatingControls() {
  // Check if container already exists
  if (document.getElementById('autoscroller-container')) {
    floatingButton = document.getElementById('autoscroller-floating-btn');
    speedSlider = document.getElementById('autoscroller-speed-slider');
    autoStartButton = document.getElementById('autoscroller-auto-start-btn');
    voiceButton = document.getElementById('autoscroller-voice-btn');
    updateButtonState();
    updateAutoStartButton();
    updateVoiceButton();
    return;
  }
  
  // Create container
  const container = document.createElement('div');
  container.id = 'autoscroller-container';
  
  // Create play/pause button
  const button = document.createElement('div');
  button.id = 'autoscroller-floating-btn';
  button.innerHTML = scrolling ? '⏸' : '▶';
  button.title = scrolling ? 'Pause scrolling' : 'Start scrolling';
  
  // Add click handler with better event handling
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleScroll();
  }, true); // Use capture phase for better reliability
  
  // Create speed slider (vertical - rotated via CSS)
  const slider = document.createElement('input');
  slider.id = 'autoscroller-speed-slider';
  slider.type = 'range';
  slider.min = '1';
  slider.max = '20';
  slider.value = currentSpeed;
  slider.title = 'Scroll speed';
  
  // Create speed value display
  const valueDisplay = document.createElement('span');
  valueDisplay.id = 'autoscroller-speed-value';
  valueDisplay.textContent = currentSpeed;
  
  // Slider change handler
  slider.addEventListener('input', () => {
    currentSpeed = parseInt(slider.value);
    valueDisplay.textContent = currentSpeed;
    chrome.storage.sync.set({ speed: currentSpeed });
    
    // Update scroll speed if currently scrolling
    if (scrolling) {
      stopScroll();
      startScroll(currentSpeed);
    }
  });
  
  // Create auto-start toggle button
  const autoStartBtn = document.createElement('div');
  autoStartBtn.id = 'autoscroller-auto-start-btn';
  const autoStartIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  autoStartIcon.id = 'autoscroller-auto-start-icon';
  autoStartIcon.setAttribute('viewBox', '0 0 24 24');
  autoStartIcon.setAttribute('width', '20');
  autoStartIcon.setAttribute('height', '20');
  autoStartIcon.innerHTML = '<path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>';
  autoStartBtn.appendChild(autoStartIcon);
  autoStartBtn.title = autoStartEnabled ? 'Auto-start enabled (click to disable)' : 'Auto-start disabled (click to enable)';
  
  // Add click handler for auto-start with better event handling
  autoStartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    autoStartEnabled = !autoStartEnabled;
    chrome.storage.sync.set({ autoStart: autoStartEnabled });
    updateAutoStartButton();
  }, true); // Use capture phase for better reliability
  
  // Create voice control button
  const voiceBtn = document.createElement('div');
  voiceBtn.id = 'autoscroller-voice-btn';
  voiceBtn.innerHTML = '🎤';
  voiceBtn.title = voiceEnabled ? 'Voice control enabled (click to disable)' : 'Voice control disabled (click to enable)';
  
  // Add click handler for voice control
  voiceBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleVoiceControl();
  }, true);
  
  // Assemble container (vertical layout)
  container.appendChild(button);
  container.appendChild(slider);
  container.appendChild(valueDisplay);
  container.appendChild(autoStartBtn);
  container.appendChild(voiceBtn);
  
  // Append to body or PDF viewer - try multiple methods
  let targetElement = null;
  const isPDF = isPDFViewer();
  
  // For PDFs, try to find the viewer container
  if (isPDF) {
    // Try to find the main PDF viewer container
    targetElement = document.querySelector('body') ||
                   document.querySelector('#plugin') ||
                   document.querySelector('embed') ||
                   document.querySelector('#viewerContainer') ||
                   document.documentElement;
  } else {
    // Regular pages
    targetElement = document.body || document.documentElement;
  }
  
  // Last resort: try to append to document
  if (!targetElement && document) {
    targetElement = document.documentElement || document;
  }
  
  if (targetElement) {
    try {
      targetElement.appendChild(container);
      // For PDFs, ensure z-index is high enough and pointer events work
      if (isPDF) {
        container.style.zIndex = '2147483647'; // Maximum z-index
        container.style.pointerEvents = 'auto';
        // Make sure all child elements can receive clicks
        const allChildren = container.querySelectorAll('*');
        allChildren.forEach(child => {
          child.style.pointerEvents = 'auto';
        });
      }
    } catch (e) {
      console.error('AutoScroller: Failed to append container', e);
      // Try again after a short delay
      setTimeout(() => {
        if (targetElement && !document.getElementById('autoscroller-container')) {
          try {
            targetElement.appendChild(container);
            if (isPDF) {
              container.style.zIndex = '2147483647';
              container.style.pointerEvents = 'auto';
              const allChildren = container.querySelectorAll('*');
              allChildren.forEach(child => {
                child.style.pointerEvents = 'auto';
              });
            }
          } catch (e2) {
            console.error('AutoScroller: Retry failed', e2);
          }
        }
      }, 100);
    }
  }
  
  floatingButton = button;
  speedSlider = slider;
  autoStartButton = autoStartBtn;
  voiceButton = voiceBtn;
  updateButtonState();
  updateAutoStartButton();
  updateVoiceButton();
}

// Update auto-start button appearance
function updateAutoStartButton() {
  if (autoStartButton) {
    autoStartButton.classList.toggle('enabled', autoStartEnabled);
    autoStartButton.title = autoStartEnabled ? 'Auto-start enabled (click to disable)' : 'Auto-start disabled (click to enable)';
  }
}

// Initialize voice recognition
function initVoiceRecognition() {
  // Check if browser supports speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('AutoScroller: Speech recognition not supported in this browser');
    return null;
  }
  
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onresult = (event) => {
    const lastResult = event.results[event.results.length - 1];
    const transcript = lastResult[0].transcript.toLowerCase().trim();
    
    console.log('AutoScroller: Voice command detected:', transcript);
    
    // Handle voice commands
    if (transcript.includes('scroll') || transcript.includes('start')) {
      if (!scrolling) {
        startScroll(currentSpeed);
      }
    } else if (transcript.includes('pause') || transcript.includes('stop')) {
      if (scrolling) {
        stopScroll();
      }
    } else if (transcript.includes('speed up') || transcript.includes('faster')) {
      if (currentSpeed < 20) {
        currentSpeed = Math.min(20, currentSpeed + 2);
        if (speedSlider) {
          speedSlider.value = currentSpeed;
          const valueDisplay = document.getElementById('autoscroller-speed-value');
          if (valueDisplay) {
            valueDisplay.textContent = currentSpeed;
          }
        }
        chrome.storage.sync.set({ speed: currentSpeed });
        if (scrolling) {
          stopScroll();
          startScroll(currentSpeed);
        }
      }
    } else if (transcript.includes('slow down') || transcript.includes('slower')) {
      if (currentSpeed > 1) {
        currentSpeed = Math.max(1, currentSpeed - 2);
        if (speedSlider) {
          speedSlider.value = currentSpeed;
          const valueDisplay = document.getElementById('autoscroller-speed-value');
          if (valueDisplay) {
            valueDisplay.textContent = currentSpeed;
          }
        }
        chrome.storage.sync.set({ speed: currentSpeed });
        if (scrolling) {
          stopScroll();
          startScroll(currentSpeed);
        }
      }
    }
  };
  
  recognition.onerror = (event) => {
    console.error('AutoScroller: Speech recognition error:', event.error);
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
      // These are common and can be ignored
      return;
    }
    // Stop listening on other errors
    if (isListening) {
      try {
        recognition.stop();
      } catch (e) {
        // Ignore stop errors
      }
      isListening = false;
      updateVoiceButton();
    }
  };
  
  recognition.onend = () => {
    // Restart recognition if voice is still enabled
    if (voiceEnabled && !isListening) {
      try {
        recognition.start();
        isListening = true;
        updateVoiceButton();
      } catch (e) {
        console.error('AutoScroller: Failed to restart voice recognition:', e);
        voiceEnabled = false;
        updateVoiceButton();
      }
    } else {
      isListening = false;
      updateVoiceButton();
    }
  };
  
  return recognition;
}

// Toggle voice control
function toggleVoiceControl() {
  voiceEnabled = !voiceEnabled;
  chrome.storage.sync.set({ voiceEnabled: voiceEnabled });
  updateVoiceButton();
  
  if (voiceEnabled) {
    if (!recognition) {
      recognition = initVoiceRecognition();
    }
    if (recognition) {
      try {
        recognition.start();
        isListening = true;
        updateVoiceButton();
      } catch (e) {
        console.error('AutoScroller: Failed to start voice recognition:', e);
        voiceEnabled = false;
        updateVoiceButton();
        alert('Voice recognition failed to start. Please check your microphone permissions.');
      }
    } else {
      voiceEnabled = false;
      updateVoiceButton();
      alert('Voice recognition is not supported in this browser.');
    }
  } else {
    if (recognition && isListening) {
      try {
        recognition.stop();
        isListening = false;
        updateVoiceButton();
      } catch (e) {
        console.error('AutoScroller: Failed to stop voice recognition:', e);
      }
    }
  }
}

// Update voice button appearance
function updateVoiceButton() {
  if (voiceButton) {
    voiceButton.classList.toggle('enabled', voiceEnabled);
    voiceButton.classList.toggle('listening', isListening);
    if (isListening) {
      voiceButton.title = 'Voice control listening... Say "scroll", "pause", "speed up", or "slow down"';
    } else if (voiceEnabled) {
      voiceButton.title = 'Voice control enabled (click to disable)';
    } else {
      voiceButton.title = 'Voice control disabled (click to enable)';
    }
  }
}

// Update button appearance based on scroll state
function updateButtonState() {
  if (floatingButton) {
    floatingButton.innerHTML = scrolling ? '⏸' : '▶';
    floatingButton.title = scrolling ? 'Pause scrolling' : 'Start scrolling';
    floatingButton.classList.toggle('paused', !scrolling);
  }
}

// Toggle scroll function
function toggleScroll() {
  if (scrolling) {
    stopScroll();
  } else {
    startScroll(currentSpeed);
  }
}

// Show tutorial popup
function showTutorial() {
  // Check if tutorial already exists
  if (document.getElementById('autoscroller-tutorial')) {
    return;
  }
  
  // Wait a bit to ensure controls are visible
  setTimeout(() => {
    const tutorial = document.createElement('div');
    tutorial.id = 'autoscroller-tutorial';
    tutorial.innerHTML = `
      <h3>Welcome to AutoScroller! 🎉</h3>
      <p>Here's how to use the floating controls:</p>
      <ul>
        <li><strong>▶/⏸ Button</strong> - Start or pause scrolling</li>
        <li><strong>Vertical Slider</strong> - Adjust scroll speed (1-20)</li>
        <li><strong>Auto Button</strong> - Toggle auto-start on new pages</li>
        <li><strong>🎤 Button</strong> - Voice control: Say "scroll", "pause", "speed up", or "slow down"</li>
      </ul>
      <p style="margin-bottom: 0;">Controls are in the bottom-right corner ↓</p>
      <button id="autoscroller-tutorial-close">Got it!</button>
    `;
    
    const closeBtn = tutorial.querySelector('#autoscroller-tutorial-close');
    closeBtn.addEventListener('click', () => {
      tutorial.remove();
      chrome.storage.sync.set({ tutorialShown: true });
    });
    
    // Append to body or documentElement
    const target = document.body || document.documentElement;
    if (target) {
      target.appendChild(tutorial);
      
      // Auto-close after 10 seconds
      setTimeout(() => {
        if (tutorial.parentNode) {
          tutorial.remove();
          chrome.storage.sync.set({ tutorialShown: true });
        }
      }, 10000);
    }
  }, 800);
}

// Check if we're in a PDF viewer
function isPDFViewer() {
  // Check URL
  if (window.location.href.includes('.pdf') || 
      window.location.href.startsWith('chrome-extension://') ||
      window.location.href.startsWith('chrome://')) {
    // Check for PDF viewer elements
    if (document.querySelector('embed[type="application/pdf"]') ||
        document.querySelector('embed[type="application/x-google-chrome-pdf"]') ||
        document.querySelector('#plugin') ||
        document.querySelector('embed') ||
        document.querySelector('iframe[src*=".pdf"]')) {
      return true;
    }
    // Chrome's PDF viewer might not have these elements immediately
    // Check if we're in the PDF viewer by looking at the document structure
    if (document.body && document.body.classList.contains('pdf-viewer')) {
      return true;
    }
    // Check for PDF.js viewer (used by some browsers)
    if (document.querySelector('#viewer') || 
        document.querySelector('.pdfViewer') ||
        window.PDFViewerApplication) {
      return true;
    }
  }
  return false;
}

// Initialize on page load
function init() {
  let retryCount = 0;
  const maxRetries = 50; // 5 seconds max wait
  
  // More robust initialization that works on various sites
  const tryInit = () => {
    retryCount++;
    
    // Check if we can access the document
    if (typeof document === 'undefined') {
      if (retryCount < maxRetries) {
        setTimeout(tryInit, 100);
      }
      return;
    }
    
    // For PDFs, check if we're in the viewer frame
    const pdfViewer = isPDFViewer();
    
    // Try multiple methods to find a target element
    let targetElement = null;
    
    // Method 1: Try document.body
    if (document.body) {
      targetElement = document.body;
    }
    // Method 2: Try document.documentElement
    else if (document.documentElement) {
      targetElement = document.documentElement;
    }
    // Method 3: For PDF viewer, try plugin element
    else if (pdfViewer) {
      targetElement = document.querySelector('#plugin') || 
                     document.querySelector('embed') ||
                     document.documentElement;
    }
    // Method 4: Wait for body to appear (for dynamic sites like OpenAI)
    else if (document.readyState === 'loading') {
      if (retryCount < maxRetries) {
        document.addEventListener('DOMContentLoaded', tryInit);
        setTimeout(tryInit, 100);
      }
      return;
    }
    
    // If we have a target or can inject styles, proceed
    if (targetElement || document.head || document.documentElement) {
      try {
        injectStyles();
        chrome.storage.sync.get(["speed", "autoStart", "voiceEnabled", "tutorialShown"], data => {
          currentSpeed = data.speed || 5;
          autoStartEnabled = data.autoStart || false;
          voiceEnabled = data.voiceEnabled || false;
          
          // Show tutorial on first use (skip for PDFs)
          if (!data.tutorialShown && !pdfViewer) {
            showTutorial();
          }
          
          // Create controls - this will handle finding the right target
          createFloatingControls();
          
          // Initialize voice recognition if enabled
          if (voiceEnabled) {
            recognition = initVoiceRecognition();
            if (recognition) {
              try {
                recognition.start();
                isListening = true;
                updateVoiceButton();
              } catch (e) {
                console.error('AutoScroller: Failed to start voice recognition:', e);
                voiceEnabled = false;
                updateVoiceButton();
              }
            }
          }
          
          if (autoStartEnabled) {
            // Small delay for PDFs to ensure viewer is ready
            setTimeout(() => {
              startScroll(currentSpeed);
            }, pdfViewer ? 300 : 0);
          }
        });
      } catch (e) {
        console.error('AutoScroller init error:', e);
        // Retry after a delay
        if (retryCount < maxRetries) {
          setTimeout(tryInit, 200);
        }
      }
    } else {
      // Wait a bit more and retry (for dynamic sites)
      if (retryCount < maxRetries) {
        setTimeout(tryInit, 100);
      }
    }
  };
  
  // Start initialization
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    tryInit();
  } else {
    window.addEventListener('load', tryInit);
    // Also try immediately in case load already fired
    setTimeout(tryInit, 0);
  }
  
  // Additional retry for slow-loading sites (like OpenAI)
  setTimeout(() => {
    if (!document.getElementById('autoscroller-container')) {
      tryInit();
    }
  }, 1000);
}

// Debug: Log frame info for PDFs
if (window.location.href.includes('.pdf') || window.location.href.startsWith('chrome-extension://')) {
  console.log('AutoScroller: Running in frame', {
    url: window.location.href,
    hasBody: !!document.body,
    hasDocumentElement: !!document.documentElement,
    isPDF: isPDFViewer()
  });
}

init();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "toggle") {
    toggleScroll();
  } else if (msg.action === "speedChange") {
    if (speedSlider) {
      speedSlider.value = msg.speed;
      currentSpeed = msg.speed;
      const valueDisplay = document.getElementById('autoscroller-speed-value');
      if (valueDisplay) {
        valueDisplay.textContent = msg.speed;
      }
      if (scrolling) {
        stopScroll();
        startScroll(currentSpeed);
      }
    }
  } else if (msg.action === "autoStartChange") {
    autoStartEnabled = msg.enabled;
    updateAutoStartButton();
  } else if (msg.action === "voiceChange") {
    voiceEnabled = msg.enabled;
    if (voiceEnabled) {
      if (!recognition) {
        recognition = initVoiceRecognition();
      }
      if (recognition) {
        try {
          recognition.start();
          isListening = true;
          updateVoiceButton();
        } catch (e) {
          console.error('AutoScroller: Failed to start voice recognition:', e);
          voiceEnabled = false;
          updateVoiceButton();
        }
      }
    } else {
      if (recognition && isListening) {
        try {
          recognition.stop();
          isListening = false;
          updateVoiceButton();
        } catch (e) {
          console.error('AutoScroller: Failed to stop voice recognition:', e);
        }
      }
    }
    updateVoiceButton();
  }
});

function startScroll(speed) {
  scrolling = true;
  const scrollAmount = parseInt(speed);
  const isPDF = isPDFViewer();
  
  // For PDFs, use multiple methods to scroll
  if (isPDF) {
    // Find the PDF embed element
    const pdfEmbed = document.querySelector('embed[type="application/pdf"]') ||
                     document.querySelector('embed[type="application/x-google-chrome-pdf"]') ||
                     document.querySelector('embed') ||
                     document.querySelector('#plugin');
    
    // Try to focus the PDF viewer first (one-time setup)
    if (pdfEmbed) {
      try {
        pdfEmbed.focus();
        // Also try clicking on it to ensure it has focus
        pdfEmbed.click();
      } catch (e) {
        // Focus/click might fail due to security restrictions
      }
    }
    
    // Use a faster interval for PDFs to make scrolling smoother
    const pdfInterval = 30; // 30ms instead of 50ms for smoother PDF scrolling
    
    interval = setInterval(() => {
      try {
        // Method 1: Simulate mouse wheel events (most reliable for Chrome PDF viewer)
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: scrollAmount,
          deltaMode: 0, // Pixels
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        // Dispatch wheel events to multiple targets
        if (pdfEmbed) {
          pdfEmbed.dispatchEvent(wheelEvent);
        }
        window.dispatchEvent(wheelEvent);
        document.dispatchEvent(wheelEvent);
        if (document.body) {
          document.body.dispatchEvent(wheelEvent);
        }
        if (document.documentElement) {
          document.documentElement.dispatchEvent(wheelEvent);
        }
        
        // Method 2: Try keyboard events with proper initialization
        const keyDownEvent = new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          code: 'ArrowDown',
          keyCode: 40,
          which: 40,
          bubbles: true,
          cancelable: false,
          view: window,
          charCode: 0
        });
        
        const keyPressEvent = new KeyboardEvent('keypress', {
          key: 'ArrowDown',
          code: 'ArrowDown',
          keyCode: 40,
          which: 40,
          bubbles: true,
          cancelable: false,
          view: window,
          charCode: 0
        });
        
        // Focus and dispatch to embed first
        if (pdfEmbed) {
          try {
            pdfEmbed.focus();
            pdfEmbed.dispatchEvent(keyDownEvent);
            pdfEmbed.dispatchEvent(keyPressEvent);
          } catch (e) {
            // Cross-origin or other issue
          }
        }
        
        // Also dispatch to window/document
        window.dispatchEvent(keyDownEvent);
        document.dispatchEvent(keyDownEvent);
        if (document.body) {
          document.body.dispatchEvent(keyDownEvent);
        }
        
        // Method 3: Try scrolling the window directly
        if (window.scrollBy) {
          window.scrollBy(0, scrollAmount);
        }
        
        // Method 4: Try scrolling document elements
        if (document.documentElement && document.documentElement.scrollTop !== undefined) {
          const currentScroll = document.documentElement.scrollTop;
          document.documentElement.scrollTop = currentScroll + scrollAmount;
        }
        if (document.body && document.body.scrollTop !== undefined) {
          const currentScroll = document.body.scrollTop;
          document.body.scrollTop = currentScroll + scrollAmount;
        }
        
        // Method 5: Try using window.scrollY
        if (window.scrollY !== undefined) {
          window.scrollTo({
            top: window.scrollY + scrollAmount,
            left: 0,
            behavior: 'auto'
          });
        }
        
        // Method 6: Try to find and scroll the actual scrollable container
        // Chrome's PDF viewer might have a scrollable container we can access
        const possibleContainers = [
          document.querySelector('#plugin'),
          document.querySelector('embed'),
          document.querySelector('body'),
          document.querySelector('html'),
          document.documentElement,
          document.body
        ];
        
        for (const container of possibleContainers) {
          if (container) {
            try {
              // Try multiple scroll methods on each container
              if (container.scrollTop !== undefined) {
                container.scrollTop += scrollAmount;
              }
              if (container.scrollBy) {
                container.scrollBy(0, scrollAmount);
              }
              if (container.scroll) {
                container.scroll(0, (container.scrollTop || 0) + scrollAmount);
              }
            } catch (e) {
              // Some containers might not be scrollable or accessible
            }
          }
        }
        
        // Method 7: Try to access the embed's contentDocument if accessible
        if (pdfEmbed && pdfEmbed.contentDocument) {
          try {
            const embedDoc = pdfEmbed.contentDocument;
            if (embedDoc.body) {
              embedDoc.body.scrollTop += scrollAmount;
            }
            if (embedDoc.documentElement) {
              embedDoc.documentElement.scrollTop += scrollAmount;
            }
          } catch (e) {
            // Cross-origin restriction - expected for PDFs
          }
        }
        
        // Method 8: Try PDF.js viewer if present
        if (window.PDFViewerApplication) {
          try {
            const viewer = document.querySelector('#viewerContainer') || 
                          document.querySelector('.pdfViewer') ||
                          document.querySelector('#viewer');
            if (viewer && viewer.scrollTop !== undefined) {
              viewer.scrollTop += scrollAmount;
            }
          } catch (e) {
            // PDF.js access might fail
          }
        }
        
        // Method 9: Try using Chrome's PDF viewer page navigation as last resort
        // This is a workaround - navigate pages if we can't scroll
        // Only use this if other methods consistently fail
        try {
          // Check if we can access the PDF viewer's internal state
          if (window.chrome && window.chrome.pdfViewer) {
            // Chrome's internal API - might not be accessible
          }
        } catch (e) {
          // Expected to fail
        }
      } catch (e) {
        console.debug('AutoScroller PDF scroll error:', e);
      }
    }, pdfInterval);
  } else {
    // Regular page scrolling
    interval = setInterval(() => {
      try {
        // Method 1: window.scrollBy (most common)
        if (typeof window !== 'undefined' && window.scrollBy) {
          window.scrollBy(0, scrollAmount);
        }
        // Method 2: document.documentElement.scrollTop
        else if (document.documentElement) {
          document.documentElement.scrollTop += scrollAmount;
        }
        // Method 3: document.body.scrollTop
        else if (document.body) {
          document.body.scrollTop += scrollAmount;
        }
        // Method 4: window.scrollY
        else if (typeof window !== 'undefined' && window.scrollY !== undefined) {
          window.scrollTo(0, window.scrollY + scrollAmount);
        }
      } catch (e) {
        console.debug('AutoScroller scroll error:', e);
      }
    }, 50);
  }
  
  updateButtonState();
}

function stopScroll() {
  scrolling = false;
  clearInterval(interval);
  updateButtonState();
}
