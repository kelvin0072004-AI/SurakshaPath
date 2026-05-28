// SurakshaPath | Application Core Engine & Synthesizer

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  lucide.createIcons();

  // ==========================================
  // SUPABASE CONFIGURATION (Replace with your actual keys)
  // ==========================================
  const SUPABASE_URL = 'https://qifcuziltteolhvymtdo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_rSbnWhS0LTvtVm7vKoUNqg_4ScFYHOs';


  let supabase = null;
  if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client Initialized successfully.");
  } else {
    console.warn("Supabase script not loaded or offline. Falling back to local storage.");
  }

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  let currentRole = null;       // 'citizen', 'police', or 'admin'
  let audioContext = null;
  let activeTabId = null;

  // SOS & Ringtone states
  let sirenInterval = null;
  let ringtoneInterval = null;
  let activeSirenNodes = [];
  let activeRingtoneNodes = [];
  let sosActive = false;
  let countdownTimer = null;

  // Gamification states (Citizen)
  let citizenXp = parseInt(localStorage.getItem('citizen_xp')) || 150;
  let citizenStreak = parseInt(localStorage.getItem('citizen_streak')) || 3;
  let currentQuizIndex = 0;

  // Fitness states (Police)
  let totalCardio = parseFloat(localStorage.getItem('total_cardio')) || 24.5;
  let totalPushups = parseInt(localStorage.getItem('total_pushups')) || 210;

  // Courses Databases
  const citizenCourses = [
    // Cyber Crime
    { id: 'c1', title: 'Phishing Awareness & Safety', category: 'cyber', time: '10 min read' },
    { id: 'c2', title: 'OTP Fraud & Vishing Protection', category: 'cyber', time: '8 min read' },
    { id: 'c3', title: 'UPI Scams & QR Code Traps', category: 'cyber', time: '7 min read' },
    { id: 'c4', title: 'Social Media Hacking & Privacy', category: 'cyber', time: '12 min read' },
    { id: 'c5', title: 'Preserving Digital Evidence', category: 'cyber', time: '15 min read' },
    // Law Training
    { id: 'c6', title: 'Introduction to BNS (Bharatiya Nyaya Sanhita)', category: 'legal', time: '12 min read' },
    { id: 'c7', title: 'Understanding BNSS Procedures', category: 'legal', time: '10 min read' },
    { id: 'c8', title: 'Essential Cyber Laws for Citizens', category: 'legal', time: '9 min read' },
    { id: 'c9', title: 'FIR Filing Process & Guidance', category: 'legal', time: '8 min read' },
    { id: 'c10', title: 'Women Protection Laws in India', category: 'legal', time: '15 min read' },
    // Soft Skills / General
    { id: 'c11', title: 'Public Speaking & Communication', category: 'behavioral', time: '11 min read' },
    { id: 'c12', title: 'Stress & Anger Control Techniques', category: 'behavioral', time: '10 min read' },
    // Safety
    { id: 'c13', title: 'Emergency Contacts & SOS Usage', category: 'safety', time: '5 min read' },
    { id: 'c14', title: 'Spotting Fake News Online', category: 'behavioral', time: '8 min read' }
  ];

  const policeCourses = [
    { id: 'p1', title: 'IPC to BNS (Bharatiya Nyaya Sanhita) Transition', category: 'legal', rank: 'all' },
    { id: 'p2', title: 'BNSS Procedure & Custody Guidelines', category: 'legal', rank: 'si' },
    { id: 'p3', title: 'Phishing & Email Header Analysis', category: 'cyber', rank: 'si' },
    { id: 'p4', title: 'OTP Fraud Tracing & Mobile Forensics', category: 'cyber', rank: 'si' },
    { id: 'p5', title: 'UPI Transaction Flow & Log Extraction', category: 'cyber', rank: 'all' },
    { id: 'p6', title: 'Social Media Hacking Takedown Process', category: 'cyber', rank: 'inspector' },
    { id: 'p7', title: 'Digital Evidence Collection under BNSS', category: 'cyber', rank: 'all' },
    { id: 'p8', title: 'Public Speaking & Media Briefing Skills', category: 'behavioral', rank: 'inspector' },
    { id: 'p9', title: 'Anger Management & Stress Control under Duty', category: 'behavioral', rank: 'constable' }
  ];

  // Quiz Questions Database (Citizen)
  const citizenQuizQuestions = [
    {
      q: "If you receive an OTP from an unknown source requesting verification for an online order you didn't place, what should you do?",
      options: [
        "Share it immediately to resolve the order",
        "Ignore the request and never share the OTP",
        "Forward the OTP to your close friends for advice",
        "Reply with a fake OTP code to trick them"
      ],
      correct: 1,
      explanation: "Correct! Never share One-Time Passwords (OTPs) with anyone. Police/Banks will never ask for them."
    },
    {
      q: "Under Indian law, which emergency contact number acts as the unified emergency response support system (ERSS)?",
      options: [
        "100",
        "1090",
        "112",
        "108"
      ],
      correct: 2,
      explanation: "Correct! 112 is the single unified emergency helpline for police, fire, and health emergencies."
    },
    {
      q: "A news post claims water supply in your area will be cut off for 15 days, citing no official source. How should you verify this?",
      options: [
        "Share it to all your WhatsApp groups immediately",
        "Check official municipal websites or verified news channels",
        "Panic and start storing water without verification",
        "Assume it is true because a friend forwarded it"
      ],
      correct: 1,
      explanation: "Correct! Always check verified governmental channels before believing or forwarding unsourced news."
    },
    {
      q: "What is a 'Zero FIR'?",
      options: [
        "An FIR that costs zero rupees to file",
        "An FIR filed in any police station irrespective of the place of incident",
        "An FIR filed when no evidence is present at all",
        "An FIR filed against anonymous suspects"
      ],
      correct: 1,
      explanation: "Correct! A Zero FIR allows any station to record the complaint, which is later transferred to the appropriate jurisdiction."
    }
  ];

  // Map Coordinates & Route Paths
  const mapNodes = {
    "Sector 62 (Metro Hub)": { x: 50, y: 80 },
    "Tech Zone Park": { x: 650, y: 360 }
  };

  const safePaths = [
    "M 50 80 L 200 220 L 350 360 L 500 80 L 650 360",
    "M 50 80 L 200 220 L 350 360 L 650 360",
    "M 50 80 L 200 220 L 350 220 L 500 80 L 650 360"
  ];

  // ==========================================
  // DOM ELEMENT REFERENCES
  // ==========================================
  const loginScreen = document.getElementById('loginScreen');
  const appContainer = document.getElementById('appContainer');
  const userRoleSub = document.getElementById('userRoleSub');
  const roleBadge = document.getElementById('roleBadge');
  const roleBadgeText = document.getElementById('roleBadgeText');
  const navTabsContainer = document.getElementById('navTabsContainer');
  const logoutBtn = document.getElementById('logoutBtn');

  // Dashboard views
  const citizenDashboard = document.getElementById('citizenDashboard');
  const policeDashboard = document.getElementById('policeDashboard');
  const adminDashboard = document.getElementById('adminDashboard');

  // SOS and Fake Call
  const sosOverlay = document.getElementById('sosOverlay');
  const cancelSosBtn = document.getElementById('cancelSosBtn');
  const dispatchText = document.getElementById('dispatchText');
  const fakeCallOverlay = document.getElementById('fakeCallOverlay');
  const callerNameText = document.getElementById('callerNameText');
  const declineCallBtn = document.getElementById('declineCallBtn');
  const acceptCallBtn = document.getElementById('acceptCallBtn');
  const activeCallScreen = document.getElementById('activeCallScreen');
  const callTimer = document.getElementById('callTimer');
  const hangUpCallBtn = document.getElementById('hangUpCallBtn');

  // ==========================================
  // AUDIO SYNTHESIZER
  // ==========================================
  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  function playSynthSound(freqs, type = 'sine', duration = 0.15, gainVal = 0.1) {
    initAudio();
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqs[0], audioContext.currentTime);
    if (freqs.length > 1) {
      osc.frequency.exponentialRampToValueAtTime(freqs[1], audioContext.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(gainVal, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + duration);
  }

  function playSuccessBeep() {
    // Double high beep
    playSynthSound([523.25], 'sine', 0.1, 0.12);
    setTimeout(() => playSynthSound([659.25], 'sine', 0.15, 0.12), 100);
  }

  function playFailBuzz() {
    // Low sliding buzz
    playSynthSound([220, 110], 'sawtooth', 0.35, 0.15);
  }

  function startSiren() {
    initAudio();
    if (sirenInterval) return;
    let high = true;
    sirenInterval = setInterval(() => {
      stopActiveNodes(activeSirenNodes);
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(high ? 800 : 550, audioContext.currentTime);
      gain.gain.setValueAtTime(0.12, audioContext.currentTime);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      activeSirenNodes.push(osc, gain);
      high = !high;
    }, 450);
  }

  function stopSiren() {
    if (sirenInterval) { clearInterval(sirenInterval); sirenInterval = null; }
    stopActiveNodes(activeSirenNodes);
    activeSirenNodes = [];
  }

  function startRingtone() {
    initAudio();
    if (ringtoneInterval) return;
    ringtoneInterval = setInterval(() => {
      stopActiveNodes(activeRingtoneNodes);
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioContext.currentTime);
      gain.gain.setValueAtTime(0.15, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.6);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      activeRingtoneNodes.push(osc, gain);
    }, 2000);
  }

  function stopRingtone() {
    if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
    stopActiveNodes(activeRingtoneNodes);
    activeRingtoneNodes = [];
  }

  function stopActiveNodes(nodes) {
    nodes.forEach(n => { try { n.stop(); } catch (e) { } });
  }

  // ==========================================
  // USER DATABASE / AUTHENTICATION STATE
  // ==========================================
  const defaultUsers = [
    { email: 'citizen@surakshapath.in', password: 'password123', role: 'citizen', name: 'Default Citizen' },
    { email: 'police@surakshapath.in', password: 'password123', role: 'police', name: 'Default Police' },
    { email: 'admin@surakshapath.in', password: 'password123', role: 'admin', name: 'Default Admin' }
  ];

  function getUsers() {
    const localUsers = localStorage.getItem('surakshapath_users');
    if (!localUsers) {
      localStorage.setItem('surakshapath_users', JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    return JSON.parse(localUsers);
  }

  function saveUser(user) {
    const users = getUsers();
    users.push(user);
    localStorage.setItem('surakshapath_users', JSON.stringify(users));
  }

  // Auth form tabs
  const tabSignIn = document.getElementById('tabSignIn');
  const tabSignUp = document.getElementById('tabSignUp');
  const loginFormContainer = document.getElementById('loginFormContainer');
  const signupFormContainer = document.getElementById('signupFormContainer');

  tabSignIn.addEventListener('click', () => {
    tabSignIn.classList.add('active');
    tabSignUp.classList.remove('active');
    loginFormContainer.classList.remove('hidden');
    signupFormContainer.classList.add('hidden');
    playSynthSound([500], 'sine', 0.08, 0.05);
  });

  tabSignUp.addEventListener('click', () => {
    tabSignUp.classList.add('active');
    tabSignIn.classList.remove('active');
    signupFormContainer.classList.remove('hidden');
    loginFormContainer.classList.add('hidden');
    playSynthSound([500], 'sine', 0.08, 0.05);
  });

  // Role selector state
  let loginRole = 'citizen';
  let signupRole = 'citizen';

  document.querySelectorAll('[data-auth-role]').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('[data-auth-role]').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      loginRole = card.getAttribute('data-auth-role');
      playSynthSound([600], 'sine', 0.05, 0.03);
    });
  });

  document.querySelectorAll('[data-signup-role]').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('[data-signup-role]').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      signupRole = card.getAttribute('data-signup-role');
      playSynthSound([600], 'sine', 0.05, 0.03);
    });
  });

  // Quick demo logins
  document.getElementById('quickLoginCitizen').addEventListener('click', () => {
    document.getElementById('loginEmail').value = 'citizen@surakshapath.in';
    document.getElementById('loginPassword').value = 'password123';
    document.querySelectorAll('[data-auth-role]').forEach(c => c.classList.remove('active'));
    const citizenCard = document.querySelector('[data-auth-role="citizen"]');
    if (citizenCard) citizenCard.classList.add('active');
    loginRole = 'citizen';
    handleSignIn('citizen@surakshapath.in', 'password123', 'citizen');
  });

  document.getElementById('quickLoginPolice').addEventListener('click', () => {
    document.getElementById('loginEmail').value = 'police@surakshapath.in';
    document.getElementById('loginPassword').value = 'password123';
    document.querySelectorAll('[data-auth-role]').forEach(c => c.classList.remove('active'));
    const policeCard = document.querySelector('[data-auth-role="police"]');
    if (policeCard) policeCard.classList.add('active');
    loginRole = 'police';
    handleSignIn('police@surakshapath.in', 'password123', 'police');
  });

  document.getElementById('quickLoginAdmin').addEventListener('click', () => {
    document.getElementById('loginEmail').value = 'admin@surakshapath.in';
    document.getElementById('loginPassword').value = 'password123';
    document.querySelectorAll('[data-auth-role]').forEach(c => c.classList.remove('active'));
    const adminCard = document.querySelector('[data-auth-role="admin"]');
    if (adminCard) adminCard.classList.add('active');
    loginRole = 'admin';
    handleSignIn('admin@surakshapath.in', 'password123', 'admin');
  });

  async function handleSignIn(email, password, role) {
    const errorEl = document.getElementById('loginErrorMsg');
    errorEl.classList.add('hidden');

    let user = null;

    // Supabase Fallback Check
    if (supabase && SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co') {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('password', password)
          .maybeSingle();

        if (error) throw error;
        user = data;
      } catch (err) {
        console.error("Supabase signin error, using local storage fallback:", err);
      }
    }

    // Local Storage Fallback
    if (!user) {
      const users = getUsers();
      user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    }

    if (!user) {
      playFailBuzz();
      errorEl.textContent = '❌ Invalid email or password.';
      errorEl.classList.remove('hidden');
      return;
    }

    if (user.role !== role) {
      playFailBuzz();
      errorEl.textContent = `❌ Account registered but not as a ${role.toUpperCase()}. Select correct access level.`;
      errorEl.classList.remove('hidden');
      return;
    }

    // Login successful
    login(role, user.name);
  }

  // Form submit for sign in
  document.getElementById('signInForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    await handleSignIn(email, password, loginRole);
  });

  // Form submit for sign up
  document.getElementById('signUpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const errorEl = document.getElementById('signupErrorMsg');
    const successEl = document.getElementById('signupSuccessMsg');

    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    let signupSuccess = false;

    // Supabase Fallback Check
    if (supabase && SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co') {
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('email')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
          playFailBuzz();
          errorEl.textContent = '❌ An account with this email already exists on Supabase.';
          errorEl.classList.remove('hidden');
          return;
        }

        const { error: insertError } = await supabase
          .from('users')
          .insert([{ name, email, password, role: signupRole }]);

        if (insertError) throw insertError;
        signupSuccess = true;
        console.log("Registered successfully on Supabase.");
      } catch (err) {
        console.error("Supabase signup error, using local storage fallback:", err);
      }
    }

    // Local Storage Fallback if not completed by Supabase
    if (!signupSuccess) {
      const users = getUsers();
      const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        playFailBuzz();
        errorEl.textContent = '❌ An account with this email already exists.';
        errorEl.classList.remove('hidden');
        return;
      }

      const newUser = { name, email, password, role: signupRole };
      saveUser(newUser);
      signupSuccess = true;
    }

    if (signupSuccess) {
      playSuccessBeep();
      successEl.textContent = '🎉 Account created successfully! Redirecting to Sign In...';
      successEl.classList.remove('hidden');

      setTimeout(() => {
        document.getElementById('signUpForm').reset();
        successEl.classList.add('hidden');
        tabSignIn.click();

        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginPassword').focus();

        document.querySelectorAll('[data-auth-role]').forEach(c => c.classList.remove('active'));
        const card = document.querySelector(`[data-auth-role="${signupRole}"]`);
        if (card) card.classList.add('active');
        loginRole = signupRole;
      }, 1500);
    }
  });

  function login(role, userName = '') {
    currentRole = role;
    initAudio();
    playSynthSound([500, 700], 'sine', 0.2, 0.1);

    // Toggle layouts
    loginScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');

    // Reset layout views
    citizenDashboard.classList.add('hidden');
    policeDashboard.classList.add('hidden');
    adminDashboard.classList.add('hidden');

    // Customize layout per role
    if (role === 'citizen') {
      citizenDashboard.classList.remove('hidden');
      userRoleSub.textContent = "UP Citizen Portal";
      roleBadgeText.textContent = userName || "Citizen";
      roleBadge.className = "role-badge info";
      setupTabs([
        { id: 'citizen-safety-tab', label: 'Safety Map & SOS', icon: 'map' },
        { id: 'citizen-academy-tab', label: 'Cyber & Law Academy', icon: 'graduation-cap' },
        { id: 'citizen-fir-tab', label: 'FIR Assistant', icon: 'file-text' }
      ]);
      renderCitizenCourses();
      renderCitizenQuiz();
    } else if (role === 'police') {
      policeDashboard.classList.remove('hidden');
      userRoleSub.textContent = "UP Police Officer Portal";
      roleBadgeText.textContent = userName || "UP Police (SI)";
      roleBadge.className = "role-badge warning";
      setupTabs([
        { id: 'police-training-tab', label: 'Internal Academy', icon: 'book-open' },
        { id: 'police-simulator-tab', label: 'Emergency Simulator', icon: 'alert-triangle' },
        { id: 'police-fitness-tab', label: 'Fitness Log', icon: 'dumbbell' }
      ]);
      renderPoliceCourses();
      initPoliceSimulator();
    } else if (role === 'admin') {
      adminDashboard.classList.remove('hidden');
      userRoleSub.textContent = "SurakshaPath Operations Desk";
      roleBadgeText.textContent = userName || "Administrator";
      roleBadge.className = "role-badge success";
      setupTabs([
        { id: 'admin-course-tab', label: 'Publish Center', icon: 'plus-circle' }
      ]);
    }

    lucide.createIcons();
  }

  logoutBtn.addEventListener('click', () => {
    currentRole = null;
    appContainer.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    stopSiren();
    stopRingtone();
    playSynthSound([400, 300], 'sine', 0.2, 0.1);
    document.getElementById('loginPassword').value = '';
  });

  function setupTabs(tabsConfig) {
    navTabsContainer.innerHTML = '';
    tabsConfig.forEach((tab, index) => {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
      btn.setAttribute('data-target', tab.id);
      btn.innerHTML = `<i data-lucide="${tab.icon}"></i> ${tab.label}`;

      btn.addEventListener('click', () => {
        // Toggle tab active button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle corresponding content view
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
        document.getElementById(tab.id).classList.remove('hidden');

        playSynthSound([600], 'sine', 0.05, 0.05);
      });

      navTabsContainer.appendChild(btn);
    });

    // Set first tab active
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
    document.getElementById(tabsConfig[0].id).classList.remove('hidden');

    activeTabId = tabsConfig[0].id;
  }

  // ==========================================
  // CITIZEN AWARENESS COURSES RENDERING
  // ==========================================
  function renderCitizenCourses() {
    const list = document.getElementById('citizenCoursesList');
    list.innerHTML = '';
    citizenCourses.forEach(c => {
      const card = document.createElement('div');
      card.className = 'course-item-card';
      card.innerHTML = `
        <div class="course-info">
          <h4>${c.title}</h4>
          <span class="tag-${c.category}">${c.category.toUpperCase()}</span>
        </div>
        <i data-lucide="chevron-right" class="course-action-icon"></i>
      `;
      card.addEventListener('click', () => {
        playSynthSound([750], 'sine', 0.1, 0.05);
        alert(`Opening Awareness Module: "${c.title}"\nContents: Standard Citizen guidelines prepared by UP Cybercrime cell.`);
      });
      list.appendChild(card);
    });
    lucide.createIcons();
  }

  // ==========================================
  // GAMIFIED DUOLINGO-STYLE QUIZ MODULE
  // ==========================================
  const citizenOptionsList = document.getElementById('citizenOptionsList');
  const citizenQuestionText = document.getElementById('citizenQuestionText');
  const quizProgressFill = document.getElementById('quizProgressFill');
  const quizIndexText = document.getElementById('quizIndexText');
  const quizFeedbackArea = document.getElementById('quizFeedbackArea');
  const feedbackMessageText = document.getElementById('feedbackMessageText');
  const nextQuestionBtn = document.getElementById('nextQuestionBtn');

  function renderCitizenQuiz() {
    const qCount = citizenQuizQuestions.length;
    const currentQ = citizenQuizQuestions[currentQuizIndex];

    // Update progress elements
    quizProgressFill.style.width = `${((currentQuizIndex + 1) / qCount) * 100}%`;
    quizIndexText.textContent = `Question ${currentQuizIndex + 1} of ${qCount}`;
    citizenQuestionText.textContent = currentQ.q;

    citizenOptionsList.innerHTML = '';
    quizFeedbackArea.classList.add('hidden');

    currentQ.options.forEach((opt, idx) => {
      const optBtn = document.createElement('button');
      optBtn.className = 'quiz-opt-btn';
      optBtn.textContent = opt;

      optBtn.addEventListener('click', () => {
        // Disable all options after select
        document.querySelectorAll('.quiz-opt-btn').forEach(btn => btn.disabled = true);

        if (idx === currentQ.correct) {
          optBtn.classList.add('correct');
          feedbackMessageText.textContent = currentQ.explanation;
          feedbackMessageText.parentElement.querySelector('i').className = 'text-success feedback-icon';
          feedbackMessageText.parentElement.querySelector('i').setAttribute('data-lucide', 'check-circle-2');

          playSuccessBeep();

          // Boost XP
          citizenXp += 20;
          document.getElementById('citizenXpText').textContent = `${citizenXp} XP`;
          localStorage.setItem('citizen_xp', citizenXp);
        } else {
          optBtn.classList.add('incorrect');
          feedbackMessageText.textContent = `Incorrect! The correct answer was: "${currentQ.options[currentQ.correct]}"`;
          feedbackMessageText.parentElement.querySelector('i').className = 'text-danger feedback-icon';
          feedbackMessageText.parentElement.querySelector('i').setAttribute('data-lucide', 'x-circle');

          playFailBuzz();
        }

        lucide.createIcons();
        quizFeedbackArea.classList.remove('hidden');
      });

      citizenOptionsList.appendChild(optBtn);
    });
  }

  nextQuestionBtn.addEventListener('click', () => {
    currentQuizIndex++;
    if (currentQuizIndex >= citizenQuizQuestions.length) {
      // Loop quiz and reward streak
      currentQuizIndex = 0;
      citizenStreak += 1;
      document.getElementById('citizenStreakText').textContent = `${citizenStreak} Day Streak!`;
      localStorage.setItem('citizen_streak', citizenStreak);
      playSuccessBeep();
      alert(`🎉 Quiz Completed! Your daily learning streak has increased to ${citizenStreak} days.`);
    }
    renderCitizenQuiz();
  });

  // ==========================================
  // CITIZEN FIR ASSISTANT CHAT
  // ==========================================
  const firChatViewport = document.getElementById('firChatViewport');

  const firResponses = {
    what_is_fir: "A First Information Report (FIR) is a written document prepared by police organizations when they receive information about the commission of a cognizable offence. It starts the criminal justice system process.",
    how_to_file: "1. Visit the closest police station.\n2. Detail the incident orally or in writing to the Duty Officer.\n3. Verify your report, sign it, and ensure you receive a free copy of the FIR on the spot (it is your legal right).",
    zero_fir: "A Zero FIR is registered in case an incident occurs outside the jurisdiction of the police station receiving the report. The police must register it without assigning a number, and immediately forward it to the concerned station.",
    online_fir: "Yes, you can register an e-FIR for non-cognizable reports or lost items on the official UP Police Portal (uppolice.gov.in) or using the 'UPCOP' mobile application.",
    refuse_fir: "If an officer refuses to file an FIR, you can write directly to the Superintendent of Police (SP) under Section 154(3) CrPC, or file a complaint before the Judicial Magistrate under Section 156(3) CrPC."
  };

  document.querySelectorAll('.chat-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const intent = btn.getAttribute('data-intent');
      const question = btn.textContent;
      const answer = firResponses[intent];

      // Add user message bubble
      appendChatMessage(question, 'user');
      playSynthSound([500], 'sine', 0.1, 0.05);

      // Disable buttons temporarily
      btn.disabled = true;

      // Add simulated bot reply delay
      setTimeout(() => {
        appendChatMessage(answer, 'bot');
        playSynthSound([600], 'sine', 0.15, 0.05);
        btn.disabled = false;
      }, 700);
    });
  });

  function appendChatMessage(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `chat-message ${sender}`;
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    firChatViewport.appendChild(bubble);

    // Auto Scroll to bottom
    firChatViewport.scrollTop = firChatViewport.scrollHeight;
  }

  // ==========================================
  // POLICE TRAINING CATALOG
  // ==========================================
  const officerRankSelect = document.getElementById('officerRank');

  function renderPoliceCourses() {
    const list = document.getElementById('policeCoursesList');
    if (!list) return;
    list.innerHTML = '';

    const activeRank = officerRankSelect.value;

    // Filter courses based on rank selection
    const filtered = policeCourses.filter(c => c.rank === 'all' || c.rank === activeRank);

    filtered.forEach(c => {
      const card = document.createElement('div');
      card.className = 'course-item-card';
      card.innerHTML = `
        <div class="course-info">
          <h4>${c.title}</h4>
          <span class="tag-${c.category}">${c.category.toUpperCase()}</span>
        </div>
        <i data-lucide="book-open" class="course-action-icon"></i>
      `;
      card.addEventListener('click', () => {
        playSynthSound([800], 'sine', 0.1, 0.05);
        alert(`Launching internal training course: "${c.title}"\nIncludes slides and video tutorials authorized by UP Police Academy, Moradabad.`);
      });
      list.appendChild(card);
    });
    lucide.createIcons();
  }

  if (officerRankSelect) {
    officerRankSelect.addEventListener('change', renderPoliceCourses);
  }

  // ==========================================
  // POLICE EMERGENCY DISPATCH SIMULATOR
  // ==========================================
  const simDisplay = document.getElementById('simDisplay');
  const simChoices = document.getElementById('simChoices');

  let simStage = 0;
  let metrics = { response: 100, safety: 100, deescalation: 100 };

  const simScenarios = {
    0: {
      text: "⚠️ CASE 1: Alarm triggered at Sector 4 State Bank. CCTV shows two masked individuals breaking in. ETA of closest patrol vehicle is 6 mins.",
      options: [
        { text: "Dispatch closest patrol vehicle immediately with sirens on.", next: 1, val: { response: 0, safety: -10, deescalation: -15 } },
        { text: "Redirect patrol vehicle to maintain silent approach, notify backup.", next: 2, val: { response: -5, safety: +10, deescalation: +10 } }
      ]
    },
    // Siren outcome
    1: {
      text: "🚨 Alert sirens warned the intruders. They have taken a security guard hostage inside. Negotiation is required.",
      options: [
        { text: "Order unit to breach immediately to secure hostage.", next: 3, val: { response: 0, safety: -40, deescalation: -30 } },
        { text: "Deploy hostage negotiation specialist and cordon area.", next: 4, val: { response: -10, safety: +15, deescalation: +30 } }
      ]
    },
    // Silent outcome
    2: {
      text: "🔒 Silent approach successful. Backup arrived. Suspects cornered at exit but they are armed with rods.",
      options: [
        { text: "Issue strict verbal warnings, order suspects to lie down.", next: 4, val: { response: 0, safety: +15, deescalation: +20 } },
        { text: "Deploy containment nets and warning physical force.", next: 5, val: { response: 0, safety: +5, deescalation: -10 } }
      ]
    },
    // Final Outcomes
    3: {
      text: "❌ SIMULATION OVER: Breach failed. Hostage suffered minor injuries. Tactical review required.",
      options: []
    },
    4: {
      text: "✅ SIMULATION COMPLETED: Area secured safely. Suspects detained without injuries. Excellent officer response rating.",
      options: []
    },
    5: {
      text: "⚠️ SIMULATION COMPLETED: Suspects detained, but physical altercation caused damage. Feedback: De-escalation tactics could be optimized.",
      options: []
    }
  };

  function initPoliceSimulator() {
    simStage = 0;
    metrics = { response: 100, safety: 100, deescalation: 100 };
    updateSimStats();
    simDisplay.innerHTML = '';
    renderSimStage();
  }

  function renderSimStage() {
    const stage = simScenarios[simStage];
    appendSimLog(stage.text, 'threat');

    simChoices.innerHTML = '';

    if (stage.options.length === 0) {
      appendSimLog("System assessment complete. Press Reset to try again.", 'system');
      return;
    }

    appendSimLog("Determine Duty Action:", 'question');

    stage.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'sim-opt-btn';
      btn.textContent = opt.text;

      btn.addEventListener('click', () => {
        // Log action chosen
        appendSimLog(`Choice: "${opt.text}"`, 'action');
        playSynthSound([480], 'sine', 0.1, 0.05);

        // Update metrics
        metrics.response = Math.max(10, Math.min(100, metrics.response + opt.val.response));
        metrics.safety = Math.max(10, Math.min(100, metrics.safety + opt.val.safety));
        metrics.deescalation = Math.max(10, Math.min(100, metrics.deescalation + opt.val.deescalation));
        updateSimStats();

        // Increment stage
        simStage = opt.next;
        setTimeout(renderSimStage, 800);
      });
      simChoices.appendChild(btn);
    });
  }

  function appendSimLog(text, className) {
    const log = document.createElement('div');
    log.className = `sim-log-msg ${className}`;
    log.textContent = text;
    simDisplay.appendChild(log);
    simDisplay.scrollTop = simDisplay.scrollHeight;
  }

  function updateSimStats() {
    document.getElementById('simResponseScore').textContent = `${metrics.response}%`;
    document.getElementById('simSafetyScore').textContent = `${metrics.safety}%`;
    document.getElementById('simDeescalationScore').textContent = `${metrics.deescalation}%`;

    // Toggle score colors
    adjustMetricColor('simResponseScore', metrics.response);
    adjustMetricColor('simSafetyScore', metrics.safety);
    adjustMetricColor('simDeescalationScore', metrics.deescalation);
  }

  function adjustMetricColor(elementId, value) {
    const el = document.getElementById(elementId);
    if (value < 60) { el.className = 'val text-danger'; }
    else if (value < 85) { el.className = 'val text-warning'; }
    else { el.className = 'val text-success'; }
  }

  const resetSimBtn = document.getElementById('resetSimBtn');
  if (resetSimBtn) {
    resetSimBtn.addEventListener('click', () => {
      playSynthSound([400, 500], 'sine', 0.2, 0.05);
      initPoliceSimulator();
    });
  }

  // ==========================================
  // POLICE FITNESS TRACKER
  // ==========================================
  const logFitnessBtn = document.getElementById('logFitnessBtn');

  if (logFitnessBtn) {
    logFitnessBtn.addEventListener('click', () => {
      const runningInput = parseFloat(document.getElementById('fitRunning').value) || 0;
      const pushupsInput = parseInt(document.getElementById('fitPushups').value) || 0;

      playSynthSound([520, 640], 'sine', 0.25, 0.1);

      // Update totals
      totalCardio = parseFloat((totalCardio + runningInput).toFixed(1));
      totalPushups += pushupsInput;

      // Persist values
      localStorage.setItem('total_cardio', totalCardio);
      localStorage.setItem('total_pushups', totalPushups);

      // Render
      document.getElementById('totalCardioText').textContent = `${totalCardio} km`;
      document.getElementById('totalPushupsText').textContent = `${totalPushups} Reps`;

      // Update tier level based on pushups
      const tierText = document.getElementById('fitnessTierText');
      if (totalPushups > 300) {
        tierText.textContent = "Tier Level: Elite Commander (Level 5)";
      } else if (totalPushups > 200) {
        tierText.textContent = "Tier Level: Combat Ready (Level 4)";
      } else {
        tierText.textContent = "Tier Level: Fitness Regular (Level 3)";
      }

      alert("💪 Fitness metrics updated successfully! Log persisted.");
    });
  }

  // ==========================================
  // ADMIN COURSE CREATOR
  // ==========================================
  const addCourseBtn = document.getElementById('addCourseBtn');
  const analyticsTableBody = document.getElementById('analyticsTableBody');

  if (addCourseBtn) {
    addCourseBtn.addEventListener('click', () => {
      const title = document.getElementById('newCourseTitle').value.trim();
      const audience = document.getElementById('newCourseAudience').value;
      const category = document.getElementById('newCourseCategory').value;
      const desc = document.getElementById('newCourseDesc').value.trim();

      if (!title || !desc) {
        playFailBuzz();
        alert("Please fill out both the Course Title and Description fields.");
        return;
      }

      playSuccessBeep();

      // Push course to database
      if (audience === 'citizen') {
        citizenCourses.push({ id: `c_${Date.now()}`, title: title, category: category, time: '5 min read' });
        renderCitizenCourses();
      } else {
        policeCourses.push({ id: `p_${Date.now()}`, title: title, category: category, rank: 'all' });
        renderPoliceCourses();
      }

      // Add to admin analytics feed
      const newRow = document.createElement('tr');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      newRow.innerHTML = `
        <td>Published module: "${title}"</td>
        <td>Admin</td>
        <td><span class="status-badge success">Live</span></td>
        <td>${timeStr}</td>
      `;
      analyticsTableBody.insertBefore(newRow, analyticsTableBody.firstChild);

      // Reset form fields
      document.getElementById('newCourseTitle').value = '';
      document.getElementById('newCourseDesc').value = '';

      alert(`🚀 Published Course: "${title}" is now live in the ${audience.toUpperCase()} catalog.`);
    });
  }

  // ==========================================
  // CITIZEN SAFETY HUB (MAP ROUTING & SOS)
  // ==========================================
  const calculateRouteBtn = document.getElementById('calculateRouteBtn');
  const startMarker = document.getElementById('startMarker');
  const endMarker = document.getElementById('endMarker');
  const calculatedPath = document.getElementById('calculatedPath');
  const userLocation = document.getElementById('userLocation');
  const safetyScore = document.getElementById('safetyScore');

  if (calculateRouteBtn) {
    calculateRouteBtn.addEventListener('click', () => {
      playSynthSound([480], 'sine', 0.15, 0.08);

      startMarker.classList.remove('hidden');
      endMarker.classList.remove('hidden');

      const selectedPath = safePaths[Math.floor(Math.random() * safePaths.length)];
      calculatedPath.classList.remove('animate-draw');
      calculatedPath.setAttribute('d', selectedPath);

      void calculatedPath.offsetWidth; // Trigger reflow
      calculatedPath.classList.add('animate-draw');

      simulateUserMovement(selectedPath);

      // Randomize index slightly
      safetyScore.textContent = `${Math.floor(Math.random() * 8) + 91}%`;
    });
  }

  function simulateUserMovement(pathString) {
    const pathNode = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathNode.setAttribute("d", pathString);
    const pathLength = pathNode.getTotalLength();
    let progress = 0;

    function step() {
      if (!calculatedPath.classList.contains('animate-draw')) return;
      progress += 1.8;
      if (progress > pathLength) progress = pathLength;

      const pt = pathNode.getPointAtLength(progress);
      userLocation.querySelector('circle').setAttribute('cx', pt.x);
      userLocation.querySelector('circle').setAttribute('cy', pt.y);
      userLocation.querySelector('.user-ping').setAttribute('cx', pt.x);
      userLocation.querySelector('.user-ping').setAttribute('cy', pt.y);

      if (progress < pathLength) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  // SOS button events
  const triggerSosBtns = document.querySelectorAll('#triggerSosBtn');
  triggerSosBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sosActive = true;
      sosOverlay.classList.remove('hidden');
      startSiren();

      let idx = 0;
      const updates = [
        "Transmitting GPS telemetry coordinates...",
        "Dispatch Command Center notified.",
        "Patrol vehicle redirected. ETA: 3 minutes."
      ];

      const interval = setInterval(() => {
        if (!sosActive) { clearInterval(interval); return; }
        if (idx < updates.length) {
          dispatchText.textContent = updates[idx];
          idx++;
        }
      }, 2500);
    });
  });

  cancelSosBtn.addEventListener('click', () => {
    sosActive = false;
    sosOverlay.classList.add('hidden');
    dispatchText.textContent = "Dispatching local safety guards & emergency services...";
    stopSiren();
    playSynthSound([350], 'sine', 0.2, 0.1);
  });

  // Fake Call Events
  const scheduleCallBtn = document.getElementById('scheduleCallBtn');
  if (scheduleCallBtn) {
    scheduleCallBtn.addEventListener('click', () => {
      if (countdownTimer) {
        clearTimeout(countdownTimer);
        countdownTimer = null;
        scheduleCallBtn.textContent = "Schedule Fake Call";
        scheduleCallBtn.className = "btn btn-warning btn-full";
        return;
      }

      const delay = parseInt(document.getElementById('callDelay').value);
      playSynthSound([520], 'sine', 0.15, 0.1);

      let timeLeft = delay;
      scheduleCallBtn.textContent = `Call in ${timeLeft}s...`;
      scheduleCallBtn.className = "btn btn-secondary btn-full";

      const countdown = () => {
        timeLeft--;
        if (timeLeft <= 0) {
          countdownTimer = null;
          scheduleCallBtn.textContent = "Schedule Fake Call";
          scheduleCallBtn.className = "btn btn-warning btn-full";

          callerNameText.textContent = document.getElementById('callerName').value;
          fakeCallOverlay.classList.remove('hidden');
          startRingtone();
        } else {
          scheduleCallBtn.textContent = `Call in ${timeLeft}s...`;
          countdownTimer = setTimeout(countdown, 1000);
        }
      };
      countdownTimer = setTimeout(countdown, 1000);
    });
  }

  declineCallBtn.addEventListener('click', () => {
    stopRingtone();
    fakeCallOverlay.classList.add('hidden');
  });

  acceptCallBtn.addEventListener('click', () => {
    stopRingtone();
    activeCallScreen.classList.remove('hidden');

    let sec = 0;
    callTimer.textContent = "00:00";
    callTimerInterval = setInterval(() => {
      sec++;
      const m = Math.floor(sec / 60).toString().padStart(2, '0');
      const s = (sec % 60).toString().padStart(2, '0');
      callTimer.textContent = `${m}:${s}`;
    }, 1000);
  });

  hangUpCallBtn.addEventListener('click', () => {
    if (callTimerInterval) clearInterval(callTimerInterval);
    activeCallScreen.classList.add('hidden');
    fakeCallOverlay.classList.add('hidden');
  });

  // Pin hazards
  const addReportPinBtn = document.getElementById('addReportPinBtn');
  const reportedPins = document.getElementById('reportedPins');

  if (addReportPinBtn) {
    addReportPinBtn.addEventListener('click', () => {
      const rx = Math.floor(Math.random() * 650) + 70;
      const ry = Math.floor(Math.random() * 320) + 60;
      const hazardType = document.getElementById('reportType').value;
      const icon = hazardType === 'light' ? '🔦' : '👥';

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "reported-pin");
      g.setAttribute("data-info", hazardType === 'light' ? 'Unlit Area' : 'Suspicious Gathering');

      g.innerHTML = `
        <circle cx="${rx}" cy="${ry}" r="8" />
        <text x="${rx}" y="${ry - 12}" text-anchor="middle">${icon}</text>
      `;
      reportedPins.appendChild(g);
      bindTooltip(g);

      playSynthSound([700], 'sine', 0.1, 0.05);

      // Decrement safety
      let scoreVal = parseInt(safetyScore.textContent);
      safetyScore.textContent = `${Math.max(50, scoreVal - 4)}%`;

      alert("⚠️ Incident hazard pinned on target map. Local control room alerted.");
    });
  }

  function bindTooltip(el) {
    const mapViewport = document.getElementById('mapViewport');
    const mapTooltip = document.getElementById('mapTooltip');

    el.addEventListener('mouseenter', () => {
      mapTooltip.textContent = el.getAttribute('data-info');
      mapTooltip.classList.remove('hidden');
    });
    el.addEventListener('mousemove', (e) => {
      const rect = mapViewport.getBoundingClientRect();
      mapTooltip.style.left = `${e.clientX - rect.left}px`;
      mapTooltip.style.top = `${e.clientY - rect.top - 40}px`;
    });
    el.addEventListener('mouseleave', () => mapTooltip.classList.add('hidden'));
  }

  document.querySelectorAll('.safehouse').forEach(bindTooltip);
});
