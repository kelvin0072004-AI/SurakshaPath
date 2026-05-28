// SurakshaPath - Application Logic & Audio Engine

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  lucide.createIcons();

  // State Variables
  let audioContext = null;
  let sirenInterval = null;
  let ringtoneInterval = null;
  let activeSirenNodes = [];
  let activeRingtoneNodes = [];
  let sosActive = false;
  let fakeCallActive = false;
  let callTimerInterval = null;
  let countdownTimer = null;

  // Nodes Coordinates Database (Map grid SVG size: 800x500)
  const mapNodes = {
    "Sector 62 (Metro Hub)": { x: 50, y: 80 },
    "Tech Zone Park": { x: 650, y: 360 },
    "Police Booth": { x: 200, y: 220 },
    "Supermarket": { x: 500, y: 80 },
    "Police Hub": { x: 350, y: 360 }
  };

  // Preset Safe Routes
  // A safe path bypasses the hazard zones and routes through safehouse checkpoints
  const safePaths = [
    "M 50 80 L 200 220 L 350 360 L 500 80 L 650 360",
    "M 50 80 L 200 220 L 350 360 L 650 360",
    "M 50 80 L 200 220 L 350 220 L 500 80 L 650 360"
  ];

  // DOM Elements
  const triggerSosBtn = document.getElementById('triggerSosBtn');
  const sosOverlay = document.getElementById('sosOverlay');
  const cancelSosBtn = document.getElementById('cancelSosBtn');
  const dispatchText = document.getElementById('dispatchText');

  const routeStart = document.getElementById('routeStart');
  const routeEnd = document.getElementById('routeEnd');
  const calculateRouteBtn = document.getElementById('calculateRouteBtn');
  const calculatedPath = document.getElementById('calculatedPath');
  const startMarker = document.getElementById('startMarker');
  const endMarker = document.getElementById('endMarker');
  const userLocation = document.getElementById('userLocation');
  const safetyScore = document.getElementById('safetyScore');

  const callerName = document.getElementById('callerName');
  const callDelay = document.getElementById('callDelay');
  const scheduleCallBtn = document.getElementById('scheduleCallBtn');
  const callBtnText = document.getElementById('callBtnText');
  const fakeCallOverlay = document.getElementById('fakeCallOverlay');
  const callerNameText = document.getElementById('callerNameText');
  const declineCallBtn = document.getElementById('declineCallBtn');
  const acceptCallBtn = document.getElementById('acceptCallBtn');
  const activeCallScreen = document.getElementById('activeCallScreen');
  const callTimer = document.getElementById('callTimer');
  const hangUpCallBtn = document.getElementById('hangUpCallBtn');

  const reportType = document.getElementById('reportType');
  const addReportPinBtn = document.getElementById('addReportPinBtn');
  const reportedPins = document.getElementById('reportedPins');
  
  const mapTooltip = document.getElementById('mapTooltip');
  const mapSvg = document.getElementById('mapSvg');

  // AUDIO ENGINE (Web Audio API)
  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  // Play Police/Alert Siren (Two alternating oscillators)
  function startSiren() {
    initAudio();
    if (sirenInterval) return;

    // Pulse frequency back and forth
    let frequencyState = true;
    
    sirenInterval = setInterval(() => {
      // Clean up previous sound nodes
      stopActiveNodes(activeSirenNodes);

      const osc1 = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      // Alternating high-low tactical alarm frequency
      const targetFreq = frequencyState ? 850 : 600;
      osc1.frequency.setValueAtTime(targetFreq, audioContext.currentTime);
      osc2.frequency.setValueAtTime(targetFreq / 2, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      osc1.start();
      osc2.start();

      activeSirenNodes.push(osc1, osc2, gainNode);
      frequencyState = !frequencyState;
    }, 400);
  }

  function stopSiren() {
    if (sirenInterval) {
      clearInterval(sirenInterval);
      sirenInterval = null;
    }
    stopActiveNodes(activeSirenNodes);
    activeSirenNodes = [];
  }

  // Play Phone Ringtone synthesizer
  function startRingtone() {
    initAudio();
    if (ringtoneInterval) return;

    ringtoneInterval = setInterval(() => {
      stopActiveNodes(activeRingtoneNodes);

      const osc = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      osc.type = 'sine';
      // Standard US Ringback tone combination simulation (440Hz + 480Hz modulated)
      osc.frequency.setValueAtTime(440, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      
      // Simulate ring pattern
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 1.2);
      gainNode.gain.linearRampToValueAtTime(0.001, audioContext.currentTime + 1.5);

      osc.connect(gainNode);
      gainNode.connect(audioContext.destination);

      osc.start();
      activeRingtoneNodes.push(osc, gainNode);
    }, 2000);
  }

  function stopRingtone() {
    if (ringtoneInterval) {
      clearInterval(ringtoneInterval);
      ringtoneInterval = null;
    }
    stopActiveNodes(activeRingtoneNodes);
    activeRingtoneNodes = [];
  }

  function stopActiveNodes(nodesList) {
    nodesList.forEach(node => {
      try {
        if (node.stop) {
          node.stop();
        }
      } catch (e) {
        // Already stopped
      }
    });
  }

  // Play simple notification beep
  function playBeep(freq = 600, duration = 0.15) {
    initAudio();
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + duration);
  }

  // INTERACTIVE ROUTING SIMULATOR
  calculateRouteBtn.addEventListener('click', () => {
    playBeep(480, 0.2);

    // Set markers visible & update location
    startMarker.classList.remove('hidden');
    endMarker.classList.remove('hidden');

    // Pick random safe path outline
    const randomPathIdx = Math.floor(Math.random() * safePaths.length);
    const selectedPath = safePaths[randomPathIdx];

    // Reset path animation class
    calculatedPath.classList.remove('animate-draw');
    calculatedPath.setAttribute('d', selectedPath);
    
    // Trigger layout redraw to re-enable CSS animation
    void calculatedPath.offsetWidth;
    calculatedPath.classList.add('animate-draw');

    // Animate user dot moving along path
    simulateUserMovement(selectedPath);

    // Randomize dynamic safety metrics slightly
    const safetyVal = Math.floor(Math.random() * 8) + 90; // 90% to 98%
    safetyScore.textContent = `${safetyVal}%`;
    safetyScore.className = `stat-value text-success`;
  });

  function simulateUserMovement(pathString) {
    // Basic animation of moving user marker along the path
    const pathNode = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathNode.setAttribute("d", pathString);
    const pathLength = pathNode.getTotalLength();
    
    let progress = 0;
    const speed = 1.5; // pixels per frame

    function step() {
      if (!calculatedPath.classList.contains('animate-draw')) return; // Cancel if path reset
      
      progress += speed;
      if (progress > pathLength) {
        progress = pathLength; // Stop at end
      }

      const point = pathNode.getPointAtLength(progress);
      userLocation.querySelector('circle').setAttribute('cx', point.x);
      userLocation.querySelector('circle').setAttribute('cy', point.y);
      userLocation.querySelector('.user-ping').setAttribute('cx', point.x);
      userLocation.querySelector('.user-ping').setAttribute('cy', point.y);

      if (progress < pathLength) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // SOS SYSTEM EVENTS
  triggerSosBtn.addEventListener('click', () => {
    sosActive = true;
    sosOverlay.classList.remove('hidden');
    startSiren();

    // Random dispatch updates
    let dispatchSteps = [
      "Alert sent to emergency contacts...",
      "Emergency center broadcasting live GPS...",
      "Guards dispatched. ETA: 4 minutes.",
      "Local patrol vehicle redirected to coordinates."
    ];
    let stepIndex = 0;

    const dispatchInterval = setInterval(() => {
      if (!sosActive) {
        clearInterval(dispatchInterval);
        return;
      }
      if (stepIndex < dispatchSteps.length) {
        dispatchText.textContent = dispatchSteps[stepIndex];
        stepIndex++;
      }
    }, 2500);
  });

  cancelSosBtn.addEventListener('click', () => {
    sosActive = false;
    sosOverlay.classList.add('hidden');
    dispatchText.textContent = "Dispatching local safety guards & emergency services...";
    stopSiren();
    playBeep(400, 0.3);
  });

  // FAKE CALL SHIELD EVENTS
  scheduleCallBtn.addEventListener('click', () => {
    initAudio();
    if (countdownTimer) {
      clearTimeout(countdownTimer);
      countdownTimer = null;
      callBtnText.textContent = "Activate Call Shield";
      scheduleCallBtn.className = "btn btn-warning btn-full";
      return;
    }

    const delay = parseInt(callDelay.value);
    playBeep(520, 0.15);

    let timeLeft = delay;
    callBtnText.textContent = `Ringing in ${timeLeft}s...`;
    scheduleCallBtn.className = "btn btn-secondary btn-full";

    const updateCountdown = () => {
      timeLeft--;
      if (timeLeft <= 0) {
        triggerFakeCall();
      } else {
        callBtnText.textContent = `Ringing in ${timeLeft}s...`;
        countdownTimer = setTimeout(updateCountdown, 1000);
      }
    };

    countdownTimer = setTimeout(updateCountdown, 1000);
  });

  function triggerFakeCall() {
    countdownTimer = null;
    callBtnText.textContent = "Activate Call Shield";
    scheduleCallBtn.className = "btn btn-warning btn-full";
    
    // Set identity
    callerNameText.textContent = callerName.value;
    
    // Show Call UI & play ringing noise
    fakeCallOverlay.classList.remove('hidden');
    startRingtone();
  }

  declineCallBtn.addEventListener('click', () => {
    stopRingtone();
    fakeCallOverlay.classList.add('hidden');
    playBeep(350, 0.25);
  });

  acceptCallBtn.addEventListener('click', () => {
    stopRingtone();
    activeCallScreen.classList.remove('hidden');
    
    // Start fake call elapsed timer
    let secondsElapsed = 0;
    callTimer.textContent = "00:00";

    callTimerInterval = setInterval(() => {
      secondsElapsed++;
      const minutes = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
      const seconds = (secondsElapsed % 60).toString().padStart(2, '0');
      callTimer.textContent = `${minutes}:${seconds}`;
    }, 1000);
  });

  hangUpCallBtn.addEventListener('click', () => {
    if (callTimerInterval) {
      clearInterval(callTimerInterval);
      callTimerInterval = null;
    }
    activeCallScreen.classList.add('hidden');
    fakeCallOverlay.classList.add('hidden');
    playBeep(350, 0.2);
  });

  // INCIDENT REPORTER
  addReportPinBtn.addEventListener('click', () => {
    // Generate random coordinate away from current safe house nodes
    let randomX, randomY;
    let valid = false;

    // Retry until finding coordinates that look natural on streets but not on safe nodes
    while (!valid) {
      randomX = Math.floor(Math.random() * 700) + 50;
      randomY = Math.floor(Math.random() * 400) + 50;

      // Ensure some distance from safehouses
      let distanceOk = true;
      document.querySelectorAll('.safehouse').forEach(el => {
        const cx = parseInt(el.querySelector('circle').getAttribute('cx'));
        const cy = parseInt(el.querySelector('circle').getAttribute('cy'));
        const dist = Math.hypot(randomX - cx, randomY - cy);
        if (dist < 60) distanceOk = false;
      });

      if (distanceOk) valid = true;
    }

    // Map reported types to human readable strings
    const hazardLabels = {
      "light": "No Street Lights 🔦",
      "crowd": "Suspicious Crowd 👥",
      "barrier": "Blocked Road 🚧",
      "other": "Safety Concern ⚠️"
    };

    const label = hazardLabels[reportType.value];

    // Create SVG marker pin element
    const pinGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    pinGroup.setAttribute("class", "reported-pin");
    pinGroup.setAttribute("data-info", label);

    const outerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    outerCircle.setAttribute("cx", randomX);
    outerCircle.setAttribute("cy", randomY);
    outerCircle.setAttribute("r", 8);

    const textIcon = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textIcon.setAttribute("x", randomX);
    textIcon.setAttribute("y", randomY - 12);
    textIcon.setAttribute("text-anchor", "middle");
    textIcon.textContent = "⚠️";

    pinGroup.appendChild(outerCircle);
    pinGroup.appendChild(textIcon);
    reportedPins.appendChild(pinGroup);

    // Dynamic hover tooltip binding
    bindTooltipEvents(pinGroup);

    // Beep sound feedback
    playBeep(700, 0.1);

    // Drop overall safety score slightly
    let currentVal = parseInt(safetyScore.textContent);
    currentVal = Math.max(50, currentVal - Math.floor(Math.random() * 5) - 3);
    safetyScore.textContent = `${currentVal}%`;

    if (currentVal < 70) {
      safetyScore.className = "stat-value text-danger";
    } else if (currentVal < 88) {
      safetyScore.className = "stat-value text-warning";
    }
  });

  // TOOLTIP EVENTS
  function bindTooltipEvents(element) {
    element.addEventListener('mouseenter', (e) => {
      const infoText = element.getAttribute('data-info');
      mapTooltip.textContent = infoText;
      mapTooltip.classList.remove('hidden');
    });

    element.addEventListener('mousemove', (e) => {
      const rect = mapViewport.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      mapTooltip.style.left = `${x}px`;
      mapTooltip.style.top = `${y - 45}px`;
    });

    element.addEventListener('mouseleave', () => {
      mapTooltip.classList.add('hidden');
    });
  }

  // Bind tooltip to pre-existing safe houses
  document.querySelectorAll('.safehouse').forEach(bindTooltipEvents);
});
