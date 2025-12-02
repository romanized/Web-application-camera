/**
 * EmotionLens Arena - Multiplayer Emotion Battle
 * Real-time face detection and emotion recognition game using face-api.js + PeerJS
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // Model paths
  MODEL_URL: "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/",

  // Detection settings
  detectionInterval: 80,
  smoothingFactor: 0.35,
  minConfidence: 0.5,

  // Game settings
  targetPercent: 99, // Emotion percentage needed to win
  roundTimeLimit: 15, // Seconds per round
  roundsToWin: 5, // First to X points wins
  roundDelay: 3000, // Delay between rounds (ms)

  // Emotions config
  emotions: {
    happy: { name: "Happy", emoji: "😊", color: "#00ff88" },
    sad: { name: "Sad", emoji: "😢", color: "#4a9eff" },
    angry: { name: "Angry", emoji: "😠", color: "#ff4757" },
    surprised: { name: "Surprised", emoji: "😲", color: "#ffa502" },
    neutral: { name: "Neutral", emoji: "😐", color: "#747d8c" },
    // Removed fearful and disgusted as they're harder to reliably detect
  },
};

// ============================================
// GAME STATE
// ============================================
const state = {
  // App state
  isModelLoaded: false,
  isVideoPlaying: false,
  isDetecting: false,
  cameraPermissionGranted: false,

  // Game mode
  gameMode: null, // 'solo', 'host', 'join'
  isHost: false,

  // Player info
  playerName: "Player",
  opponentName: "Opponent",

  // Connection
  peer: null,
  connection: null,
  peerId: null,
  mediaConnection: null,
  opponentStream: null,
  isReady: false,
  opponentReady: false,

  // Game state
  isGameActive: false,
  currentRound: 1,
  currentEmotion: null,
  roundTimer: null,
  roundTimeLeft: CONFIG.roundTimeLimit,

  // Scores
  myScore: 0,
  opponentScore: 0,

  // Detection
  smoothedEmotions: {},
  myEmotionValue: 0,
  opponentEmotionValue: 0,
  detectionLoop: null,

  // Round state
  roundWinner: null,
  isRoundActive: false,
};

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {};

function initElements() {
  // Loading screen
  elements.loadingScreen = document.getElementById("loading-screen");
  elements.loaderStatus = document.getElementById("loader-status");
  elements.loaderProgressBar = document.getElementById("loader-progress-bar");

  // Lobby screen
  elements.lobbyScreen = document.getElementById("lobby-screen");
  elements.modeSelection = document.getElementById("mode-selection");
  elements.btnSoloMode = document.getElementById("btn-solo-mode");
  elements.btnCreateRoom = document.getElementById("btn-create-room");
  elements.btnJoinRoom = document.getElementById("btn-join-room");

  // Create room panel
  elements.createPanel = document.getElementById("create-panel");
  elements.roomCodeValue = document.getElementById("room-code-value");
  elements.btnCopyCode = document.getElementById("btn-copy-code");
  elements.createStatus = document.getElementById("create-status");
  elements.btnCancelCreate = document.getElementById("btn-cancel-create");

  // Join room panel
  elements.joinPanel = document.getElementById("join-panel");
  elements.joinCodeInput = document.getElementById("join-code-input");
  elements.joinStatus = document.getElementById("join-status");
  elements.btnCancelJoin = document.getElementById("btn-cancel-join");
  elements.btnConnect = document.getElementById("btn-connect");

  // Player name
  elements.playerName = document.getElementById("player-name");

  // Game screen
  elements.gameScreen = document.getElementById("game-screen");
  elements.video = document.getElementById("video");
  elements.canvas = document.getElementById("overlay-canvas");

  // Scoreboard
  elements.scoreLeft = document.getElementById("score-left");
  elements.scoreRight = document.getElementById("score-right");
  elements.scoreNameLeft = document.getElementById("score-name-left");
  elements.scoreNameRight = document.getElementById("score-name-right");
  elements.roundValue = document.getElementById("round-value");
  elements.btnLeave = document.getElementById("btn-leave");

  // Challenge
  elements.challengeEmoji = document.getElementById("challenge-emoji");
  elements.challengeName = document.getElementById("challenge-name");
  elements.targetPercent = document.getElementById("target-percent");
  elements.timerProgress = document.getElementById("timer-progress");
  elements.timerValue = document.getElementById("timer-value");

  // Players
  elements.playerLeftName = document.getElementById("player-left-name");
  elements.playerRightName = document.getElementById("player-right-name");
  elements.playerLeftStatus = document.getElementById("player-left-status");
  elements.playerRightStatus = document.getElementById("player-right-status");

  // Progress rings
  elements.ringLeft = document.getElementById("ring-left");
  elements.ringRight = document.getElementById("ring-right");
  elements.ringValueLeft = document.getElementById("ring-value-left");
  elements.ringValueRight = document.getElementById("ring-value-right");
  elements.progressRingLeft = document.getElementById("progress-ring-left");
  elements.progressRingRight = document.getElementById("progress-ring-right");

  // Emotion bars
  elements.emotionBarLeft = document.getElementById("emotion-bar-left");
  elements.emotionBarRight = document.getElementById("emotion-bar-right");
  elements.emotionValueLeft = document.getElementById("emotion-value-left");
  elements.emotionValueRight = document.getElementById("emotion-value-right");

  // Winner badges
  elements.winnerBadgeLeft = document.getElementById("winner-badge-left");
  elements.winnerBadgeRight = document.getElementById("winner-badge-right");

  // Opponent display
  elements.opponentEmoji = document.getElementById("opponent-emoji");
  elements.opponentEmotion = document.getElementById("opponent-emotion");

  // Overlays
  elements.roundResult = document.getElementById("round-result");
  elements.resultEmoji = document.getElementById("result-emoji");
  elements.resultText = document.getElementById("result-text");
  elements.resultSubtext = document.getElementById("result-subtext");

  elements.gameOver = document.getElementById("game-over");
  elements.gameOverTrophy = document.getElementById("game-over-trophy");
  elements.gameOverTitle = document.getElementById("game-over-title");
  elements.finalScoreLeft = document.getElementById("final-score-left");
  elements.finalScoreRight = document.getElementById("final-score-right");
  elements.gameOverMessage = document.getElementById("game-over-message");
  elements.btnPlayAgain = document.getElementById("btn-play-again");
  elements.btnBackLobby = document.getElementById("btn-back-lobby");

  elements.countdownOverlay = document.getElementById("countdown-overlay");
  elements.countdownNumber = document.getElementById("countdown-number");

  elements.toastContainer = document.getElementById("toast-container");
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  console.log("🎮 Initializing EmotionLens Arena...");

  initElements();

  // Initialize emotion smoothing
  Object.keys(CONFIG.emotions).forEach((emotion) => {
    state.smoothedEmotions[emotion] = 0;
  });

  // Set default player name
  const savedName = localStorage.getItem("emotionlens_name");
  if (savedName) {
    elements.playerName.value = savedName;
    state.playerName = savedName;
  } else {
    state.playerName = "Player " + Math.floor(Math.random() * 1000);
    elements.playerName.value = state.playerName;
  }

  try {
    // Load AI models
    await loadModels();

    // Setup event listeners
    setupEventListeners();

    // Setup diagnostics
    initDiagnostics();

    // Show lobby
    showLobby();

    console.log("✅ EmotionLens Arena ready!");
  } catch (error) {
    console.error("❌ Initialization error:", error);
    showError(error.message);
  }
}

// ============================================
// MODEL LOADING
// ============================================
async function loadModels() {
  updateLoadingStatus("Loading face detection model...", 10);
  await faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL);

  updateLoadingStatus("Loading facial landmarks model...", 40);
  await faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL);

  updateLoadingStatus("Loading expression recognition model...", 70);
  await faceapi.nets.faceExpressionNet.loadFromUri(CONFIG.MODEL_URL);

  updateLoadingStatus("Models loaded!", 100);
  state.isModelLoaded = true;

  await new Promise((resolve) => setTimeout(resolve, 500));
}

function updateLoadingStatus(message, progress) {
  elements.loaderStatus.textContent = message;
  elements.loaderProgressBar.style.width = `${progress}%`;
}

// ============================================
// CAMERA
// ============================================
async function startCamera() {
  const constraints = {
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    audio: false,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    elements.video.srcObject = stream;

    return new Promise((resolve) => {
      elements.video.onloadedmetadata = () => {
        elements.video.play();
        state.isVideoPlaying = true;
        resizeCanvas();
        resolve();
      };
    });
  } catch (error) {
    if (error.name === "NotAllowedError") {
      throw new Error("Camera access denied. Please allow camera access.");
    }
    throw error;
  }
}

function stopCamera() {
  const stream = elements.video.srcObject;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    elements.video.srcObject = null;
  }
  state.isVideoPlaying = false;
}

function resizeCanvas() {
  elements.canvas.width = elements.video.videoWidth;
  elements.canvas.height = elements.video.videoHeight;
}

// ============================================
// PEER CONNECTION
// ============================================
function initPeer() {
  return new Promise((resolve, reject) => {
    // Generate a short room code
    const roomCode = generateRoomCode();

    console.log("🔄 Creating room with code:", roomCode);

    // Destroy existing peer if any
    if (state.peer) {
      state.peer.destroy();
      state.peer = null;
    }

    // Use PeerJS default servers (includes their TURN servers)
    state.peer = new Peer(roomCode, {
      debug: 2,
    });

    state.peer.on("open", (id) => {
      console.log("📡 Room created with ID:", id);
      state.peerId = id;
      resolve(id);
    });

    state.peer.on("connection", (conn) => {
      console.log("🤝 Incoming connection from:", conn.peer);
      handleConnection(conn);
    });

    // Handle incoming video calls
    state.peer.on("call", (call) => {
      console.log("📹 Incoming video call from:", call.peer);
      answerVideoCall(call);
    });

    state.peer.on("disconnected", () => {
      console.log("Peer disconnected, attempting reconnect...");
      if (state.peer && !state.peer.destroyed) {
        state.peer.reconnect();
      }
    });

    state.peer.on("error", (err) => {
      console.error("Peer error:", err);
      if (err.type === "unavailable-id") {
        // Room code taken, generate new one
        state.peer.destroy();
        initPeer().then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

function connectToPeer(peerId) {
  return new Promise((resolve, reject) => {
    let isResolved = false;
    const targetId = peerId.toUpperCase().trim();

    // Create a new peer for the joiner
    console.log("🔄 Creating peer for joining...");
    console.log("🎯 Target room:", targetId);

    // Destroy existing peer if any
    if (state.peer) {
      state.peer.destroy();
      state.peer = null;
    }

    // Use PeerJS default servers (includes their TURN servers)
    state.peer = new Peer({
      debug: 2,
    });

    state.peer.on("open", (myId) => {
      console.log("📡 My peer ID:", myId);
      console.log("📡 Attempting connection to:", targetId);

      const conn = state.peer.connect(targetId, {
        reliable: true,
        serialization: "json",
      });

      // Set up data handler immediately
      conn.on("data", (data) => {
        console.log("📨 Received data:", data.type);
        handleMessage(data);
      });

      conn.on("open", () => {
        console.log("✅ Joiner: Connection opened!");
        if (!isResolved) {
          isResolved = true;
          state.connection = conn;

          // Send player info immediately
          console.log("📤 Sending player info...");
          conn.send({
            type: "player_info",
            name: state.playerName,
          });

          resolve(conn);
        }
      });

      conn.on("close", () => {
        console.log("❌ Connection closed");
        handleDisconnect();
      });

      conn.on("error", (err) => {
        console.error("Connection error:", err);
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
      });
    });

    state.peer.on("error", (err) => {
      console.error("Peer error:", err.type, err);
      if (!isResolved) {
        isResolved = true;
        if (err.type === "peer-unavailable") {
          reject(new Error("Room not found. Check the code."));
        } else if (err.type === "network") {
          reject(new Error("Network error. Check your connection."));
        } else if (err.type === "server-error") {
          reject(new Error("Server error. Try again."));
        } else {
          reject(new Error(err.message || "Connection failed."));
        }
      }
    });

    state.peer.on("disconnected", () => {
      console.log("Peer disconnected from server...");
    });

    // Handle incoming video calls (joiner receives call from host)
    state.peer.on("call", (call) => {
      console.log("📹 Incoming video call from host:", call.peer);
      answerVideoCall(call);
    });

    // Timeout
    setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.log("⏰ Connection timeout after 20 seconds");
        reject(
          new Error("Connection timeout. Room may not exist or host left.")
        );
      }
    }, 20000);
  });
}

function handleConnection(conn) {
  console.log("🔗 handleConnection called, connection open:", conn.open);
  state.connection = conn;

  // Function to run when connection is ready
  const onConnectionReady = () => {
    console.log("✅ Connection established and ready!");

    // Send player info
    sendMessage({
      type: "player_info",
      name: state.playerName,
    });

    if (state.isHost) {
      elements.createStatus.textContent = "Opponent connected! Setting up...";
      elements.createStatus.classList.add("success");
      showToast("Opponent connected!", "success");

      // Start video call to opponent
      startVideoCall(conn.peer);

      // Go to game screen but wait for opponent to be ready
      setTimeout(() => {
        showGameScreen();
        // Send ready signal and wait for opponent
        state.isReady = true;
        sendMessage({ type: "ready" });
        checkBothReady();
      }, 1000);
    }
  };

  // Check if connection is already open
  if (conn.open) {
    onConnectionReady();
  } else {
    conn.on("open", onConnectionReady);
  }

  conn.on("data", (data) => {
    console.log("📨 Received data:", data.type);
    handleMessage(data);
  });

  conn.on("close", () => {
    console.log("❌ Connection closed");
    handleDisconnect();
  });

  conn.on("error", (err) => {
    console.error("Connection error:", err);
    showToast("Connection error", "error");
  });
}

// ============================================
// VIDEO CALLING
// ============================================
function startVideoCall(peerId) {
  if (!state.isVideoPlaying || !elements.video.srcObject) {
    console.warn("Video not ready for call");
    return;
  }

  console.log("📹 Starting video call to:", peerId);
  const call = state.peer.call(peerId, elements.video.srcObject);
  
  if (call) {
    state.mediaConnection = call;
    
    call.on("stream", (remoteStream) => {
      console.log("📹 Received remote stream");
      state.opponentStream = remoteStream;
      displayOpponentVideo(remoteStream);
    });

    call.on("close", () => {
      console.log("📹 Video call closed");
    });

    call.on("error", (err) => {
      console.error("📹 Video call error:", err);
    });
  }
}

function answerVideoCall(call) {
  if (!state.isVideoPlaying || !elements.video.srcObject) {
    console.warn("Video not ready to answer call");
    return;
  }

  console.log("📹 Answering video call");
  call.answer(elements.video.srcObject);
  state.mediaConnection = call;

  call.on("stream", (remoteStream) => {
    console.log("📹 Received remote stream from host");
    state.opponentStream = remoteStream;
    displayOpponentVideo(remoteStream);
  });

  call.on("close", () => {
    console.log("📹 Video call closed");
  });

  call.on("error", (err) => {
    console.error("📹 Video call error:", err);
  });
}

function displayOpponentVideo(stream) {
  const opponentContainer = document.getElementById("video-container-right");
  const opponentDisplay = document.getElementById("opponent-display");
  
  // Hide the emoji display
  if (opponentDisplay) {
    opponentDisplay.classList.add("hidden");
  }

  // Create or get opponent video element
  let opponentVideo = document.getElementById("opponent-video");
  if (!opponentVideo) {
    opponentVideo = document.createElement("video");
    opponentVideo.id = "opponent-video";
    opponentVideo.autoplay = true;
    opponentVideo.playsInline = true;
    opponentVideo.muted = true; // Muted to avoid echo
    opponentVideo.style.cssText = "width:100%;height:100%;object-fit:cover;transform:scaleX(-1);";
    opponentContainer.insertBefore(opponentVideo, opponentContainer.firstChild);
  }

  opponentVideo.srcObject = stream;
  opponentVideo.play().catch(e => console.log("Video play error:", e));
}

function checkBothReady() {
  console.log("Checking ready state:", { isReady: state.isReady, opponentReady: state.opponentReady, isHost: state.isHost });
  
  if (state.isReady && state.opponentReady && state.isHost) {
    console.log("🎮 Both players ready! Starting game...");
    showToast("Both players ready!", "success");
    startGame();
  }
}

function sendMessage(data) {
  if (state.connection && state.connection.open) {
    state.connection.send(data);
  }
}

function handleMessage(data) {
  switch (data.type) {
    case "player_info":
      state.opponentName = data.name;
      elements.playerRightName.textContent = data.name;
      elements.scoreNameRight.textContent = data.name;
      break;

    case "ready":
      console.log("📥 Opponent is ready!");
      state.opponentReady = true;
      checkBothReady();
      break;

    case "game_start":
      if (!state.isHost) {
        console.log("📥 Received game_start from host");
        state.isGameActive = true;
        state.currentRound = data.round;
        state.currentEmotion = data.emotion;
        state.myScore = data.scores.joiner;
        state.opponentScore = data.scores.host;
        state.roundWinner = null;
        state.myEmotionValue = 0;
        state.opponentEmotionValue = 0;
        updateScores();

        // Show countdown then start round (same as host)
        showCountdown(() => {
          startRound();
        });
      }
      break;

    case "emotion_update":
      updateOpponentEmotion(data.emotion, data.value);
      break;

    case "round_win":
      handleRoundWin(data.winner, data.scores);
      break;

    case "next_round":
      if (!state.isHost) {
        console.log("📥 Received next_round from host");
        elements.roundResult.classList.add("hidden");
        state.currentRound = data.round;
        state.currentEmotion = data.emotion;
        state.roundWinner = null;
        state.myEmotionValue = 0;
        state.opponentEmotionValue = 0;
        startRound();
      }
      break;

    case "game_over":
      if (!state.isHost) {
        // Apply final scores from host
        state.myScore = data.scores.joiner;
        state.opponentScore = data.scores.host;
        updateScores();
        elements.roundResult.classList.add("hidden");

        const winner = data.winner === "joiner" ? "me" : "opponent";
        showGameOver(winner);
      }
      break;

    case "play_again":
      if (!state.isHost) {
        resetGame();
        startGame();
      }
      break;

    case "leave":
      handleDisconnect();
      break;
  }
}

function handleDisconnect() {
  showToast("Opponent disconnected", "error");

  if (state.isGameActive) {
    stopGame();
    showGameOver("disconnect");
  } else {
    backToLobby();
  }
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// SCREENS
// ============================================
async function showLobby() {
  elements.loadingScreen.classList.add("hidden");
  elements.lobbyScreen.classList.remove("hidden");
  elements.gameScreen.classList.add("hidden");

  // Reset panels
  elements.modeSelection.classList.remove("hidden");
  elements.createPanel.classList.add("hidden");
  elements.joinPanel.classList.add("hidden");

  // Request camera permission early
  if (!state.cameraPermissionGranted) {
    try {
      await requestCameraPermission();
    } catch (err) {
      console.log("Camera permission not granted yet");
    }
  }
}

async function requestCameraPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    // Stop the stream immediately, we just wanted permission
    stream.getTracks().forEach((track) => track.stop());
    state.cameraPermissionGranted = true;
    console.log("📷 Camera permission granted");
    return true;
  } catch (error) {
    console.warn("📷 Camera permission denied or error:", error.message);
    showToast("Camera access needed to play!", "error");
    return false;
  }
}

function showError(message) {
  elements.loaderStatus.textContent = message;
  elements.loaderStatus.style.color = "#ff4757";
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
  };

  toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "fadeIn 0.3s ease reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// GAME FLOW
// ============================================
async function startSoloMode() {
  state.gameMode = "solo";
  state.isHost = true;
  state.opponentName = "AI Bot";

  try {
    await startCamera();
    showGameScreen();
    startGame();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function createRoom() {
  state.gameMode = "host";
  state.isHost = true;

  elements.modeSelection.classList.add("hidden");
  elements.createPanel.classList.remove("hidden");
  elements.createStatus.textContent = "Creating room...";
  elements.createStatus.classList.remove("success", "error");

  try {
    const roomCode = await initPeer();
    elements.roomCodeValue.textContent = roomCode;
    elements.createStatus.textContent = "Waiting for opponent to join...";

    // Start camera while waiting
    await startCamera();
  } catch (error) {
    elements.createStatus.textContent = "Failed to create room";
    elements.createStatus.classList.add("error");
    showToast("Failed to create room", "error");
  }
}

async function joinRoom() {
  elements.modeSelection.classList.add("hidden");
  elements.joinPanel.classList.remove("hidden");
  elements.joinCodeInput.value = "";
  elements.joinStatus.textContent = "";
  elements.joinCodeInput.focus();
}

async function connectToRoom() {
  const code = elements.joinCodeInput.value.toUpperCase().trim();

  if (code.length !== 6) {
    elements.joinStatus.textContent = "Please enter a 6-character code";
    elements.joinStatus.classList.add("error");
    return;
  }

  state.gameMode = "join";
  state.isHost = false;
  elements.joinStatus.textContent = "Starting camera...";
  elements.joinStatus.classList.remove("error", "success");
  elements.btnConnect.disabled = true;

  try {
    await startCamera();

    elements.joinStatus.textContent = "Connecting to room " + code + "...";

    await connectToPeer(code);

    elements.joinStatus.textContent = "Connected! Waiting for host...";
    elements.joinStatus.classList.add("success");

    // Go to game screen and signal ready
    setTimeout(() => {
      showGameScreen();
      // Signal that we're ready
      state.isReady = true;
      sendMessage({ type: "ready" });
      console.log("📤 Sent ready signal to host");
    }, 500);
  } catch (error) {
    console.error("Join error:", error);
    elements.joinStatus.textContent =
      error.message || "Failed to connect. Check the code.";
    elements.joinStatus.classList.add("error");
    elements.btnConnect.disabled = false;
    stopCamera();

    // Clean up peer
    if (state.peer) {
      state.peer.destroy();
      state.peer = null;
    }
  }
}

function showGameScreen() {
  elements.lobbyScreen.classList.add("hidden");
  elements.gameScreen.classList.remove("hidden");

  // Update player names
  elements.playerLeftName.textContent = state.playerName;
  elements.scoreNameLeft.textContent = state.playerName;
  elements.playerRightName.textContent = state.opponentName;
  elements.scoreNameRight.textContent = state.opponentName;

  elements.targetPercent.textContent = CONFIG.targetPercent;

  // Start detection
  startDetection();
}

function startGame() {
  state.isGameActive = true;
  state.currentRound = 1;
  state.myScore = 0;
  state.opponentScore = 0;

  updateScores();

  // Pick random emotion and start
  pickNewEmotion();

  if (state.isHost && state.connection) {
    sendMessage({
      type: "game_start",
      round: state.currentRound,
      emotion: state.currentEmotion,
      scores: { host: state.myScore, joiner: state.opponentScore },
    });
  }

  // Show countdown then start round
  showCountdown(() => {
    startRound();
  });
}

function pickNewEmotion() {
  const emotions = Object.keys(CONFIG.emotions);
  let newEmotion;

  do {
    newEmotion = emotions[Math.floor(Math.random() * emotions.length)];
  } while (newEmotion === state.currentEmotion && emotions.length > 1);

  state.currentEmotion = newEmotion;
}

function showCountdown(callback) {
  elements.countdownOverlay.classList.remove("hidden");
  let count = 3;

  elements.countdownNumber.textContent = count;

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      elements.countdownNumber.textContent = count;
      elements.countdownNumber.style.animation = "none";
      elements.countdownNumber.offsetHeight;
      elements.countdownNumber.style.animation = "countdownPop 1s ease-in-out";
    } else {
      clearInterval(interval);
      elements.countdownOverlay.classList.add("hidden");
      callback();
    }
  }, 1000);
}

function startRound() {
  state.isRoundActive = true;
  state.roundWinner = null;
  state.myEmotionValue = 0;
  state.opponentEmotionValue = 0;
  state.roundTimeLeft = CONFIG.roundTimeLimit;

  // Update UI
  elements.roundValue.textContent = state.currentRound;

  const emotionConfig = CONFIG.emotions[state.currentEmotion];
  elements.challengeEmoji.textContent = emotionConfig.emoji;
  elements.challengeName.textContent = emotionConfig.name.toUpperCase();

  // Reset progress
  updateProgress("left", 0);
  updateProgress("right", 0);
  elements.progressRingLeft.classList.add("active");
  elements.progressRingRight.classList.add("active");
  elements.winnerBadgeLeft.classList.add("hidden");
  elements.winnerBadgeRight.classList.add("hidden");

  // Update player status
  elements.playerLeftStatus.textContent = "PLAYING";
  elements.playerLeftStatus.className = "player-status playing";
  elements.playerRightStatus.textContent = "PLAYING";
  elements.playerRightStatus.className = "player-status playing";

  // Start timer
  startRoundTimer();
}

function startRoundTimer() {
  updateTimerDisplay();

  state.roundTimer = setInterval(() => {
    state.roundTimeLeft--;
    updateTimerDisplay();

    if (state.roundTimeLeft <= 0) {
      // Time's up - determine winner by highest percentage
      endRoundByTimeout();
    }
  }, 1000);
}

function updateTimerDisplay() {
  elements.timerValue.textContent = state.roundTimeLeft;

  // Update circular progress
  const progress = (state.roundTimeLeft / CONFIG.roundTimeLimit) * 100;
  const circumference = 2 * Math.PI * 15.9155;
  const offset = circumference - (progress / 100) * circumference;
  elements.timerProgress.style.strokeDasharray = circumference;
  elements.timerProgress.style.strokeDashoffset = offset;

  // Warning color when low
  if (state.roundTimeLeft <= 5) {
    elements.timerProgress.classList.add("warning");
  } else {
    elements.timerProgress.classList.remove("warning");
  }
}

function updateProgress(side, value) {
  const percent = Math.round(value * 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percent / 100) * circumference;

  if (side === "left") {
    elements.ringLeft.style.strokeDashoffset = offset;
    elements.ringValueLeft.textContent = `${percent}%`;
    elements.emotionBarLeft.style.width = `${percent}%`;
    elements.emotionValueLeft.textContent = `${percent}%`;
  } else {
    elements.ringRight.style.strokeDashoffset = offset;
    elements.ringValueRight.textContent = `${percent}%`;
    elements.emotionBarRight.style.width = `${percent}%`;
    elements.emotionValueRight.textContent = `${percent}%`;
  }
}

function checkWinCondition(value, isMe) {
  if (!state.isRoundActive || state.roundWinner) return;

  // Only host determines winners to prevent sync issues
  if (!state.isHost) return;

  if (value >= CONFIG.targetPercent / 100) {
    state.roundWinner = isMe ? "me" : "opponent";
    endRound();
  }
}

function endRound() {
  state.isRoundActive = false;
  clearInterval(state.roundTimer);

  // Update scores
  if (state.roundWinner === "me") {
    state.myScore++;
    elements.winnerBadgeLeft.classList.remove("hidden");
  } else if (state.roundWinner === "opponent") {
    state.opponentScore++;
    elements.winnerBadgeRight.classList.remove("hidden");
  }

  updateScores();

  // Notify opponent if multiplayer and host
  if (state.isHost && state.connection) {
    sendMessage({
      type: "round_win",
      winner: state.roundWinner === "me" ? "host" : "joiner",
      scores: { host: state.myScore, joiner: state.opponentScore },
    });
  }

  // Show result
  showRoundResult();
}

function endRoundByTimeout() {
  state.isRoundActive = false;
  clearInterval(state.roundTimer);

  // Determine winner by highest percentage
  if (state.myEmotionValue > state.opponentEmotionValue) {
    state.roundWinner = "me";
    state.myScore++;
    elements.winnerBadgeLeft.classList.remove("hidden");
  } else if (state.opponentEmotionValue > state.myEmotionValue) {
    state.roundWinner = "opponent";
    state.opponentScore++;
    elements.winnerBadgeRight.classList.remove("hidden");
  } else {
    state.roundWinner = "draw";
  }

  updateScores();

  if (state.isHost && state.connection) {
    sendMessage({
      type: "round_win",
      winner:
        state.roundWinner === "me"
          ? "host"
          : state.roundWinner === "opponent"
          ? "joiner"
          : "draw",
      scores: { host: state.myScore, joiner: state.opponentScore },
    });
  }

  showRoundResult();
}

function handleRoundWin(winner, scores) {
  // Joiner receives authoritative state from host
  if (!state.isHost) {
    // Stop round immediately
    state.isRoundActive = false;
    clearInterval(state.roundTimer);

    // Apply host's authoritative scores
    state.myScore = scores.joiner;
    state.opponentScore = scores.host;

    // Determine winner from joiner's perspective
    if (winner === "joiner") {
      state.roundWinner = "me";
      elements.winnerBadgeLeft.classList.remove("hidden");
      elements.winnerBadgeRight.classList.add("hidden");
    } else if (winner === "host") {
      state.roundWinner = "opponent";
      elements.winnerBadgeRight.classList.remove("hidden");
      elements.winnerBadgeLeft.classList.add("hidden");
    } else {
      state.roundWinner = "draw";
      elements.winnerBadgeLeft.classList.add("hidden");
      elements.winnerBadgeRight.classList.add("hidden");
    }

    updateScores();
    showRoundResult();
  }
}

function showRoundResult() {
  elements.roundResult.classList.remove("hidden");

  if (state.roundWinner === "me") {
    elements.resultEmoji.textContent = "🎉";
    elements.resultText.textContent = "You Win!";
    elements.resultText.className = "result-text win";
  } else if (state.roundWinner === "opponent") {
    elements.resultEmoji.textContent = "😔";
    elements.resultText.textContent = "Opponent Wins";
    elements.resultText.className = "result-text lose";
  } else {
    elements.resultEmoji.textContent = "🤝";
    elements.resultText.textContent = "Draw!";
    elements.resultText.className = "result-text draw";
  }

  // Check for game over - only host controls game flow
  if (state.isHost) {
    if (
      state.myScore >= CONFIG.roundsToWin ||
      state.opponentScore >= CONFIG.roundsToWin
    ) {
      elements.resultSubtext.textContent = "Game Over!";
      setTimeout(() => {
        elements.roundResult.classList.add("hidden");
        const winner = state.myScore >= CONFIG.roundsToWin ? "me" : "opponent";

        if (state.connection) {
          sendMessage({
            type: "game_over",
            winner: winner === "me" ? "host" : "joiner",
            scores: { host: state.myScore, joiner: state.opponentScore },
          });
        }

        showGameOver(winner);
      }, 2000);
    } else {
      elements.resultSubtext.textContent = "Next round starting...";
      setTimeout(() => {
        elements.roundResult.classList.add("hidden");
        nextRound();
      }, CONFIG.roundDelay);
    }
  } else {
    // Joiner waits for host to control game flow
    elements.resultSubtext.textContent = "Waiting for next round...";
  }
}

function nextRound() {
  state.currentRound++;

  if (state.isHost) {
    pickNewEmotion();

    if (state.connection) {
      sendMessage({
        type: "next_round",
        round: state.currentRound,
        emotion: state.currentEmotion,
      });
    }
  }

  startRound();
}

function updateScores() {
  elements.scoreLeft.textContent = state.myScore;
  elements.scoreRight.textContent = state.opponentScore;
}

function showGameOver(winner) {
  state.isGameActive = false;
  elements.progressRingLeft.classList.remove("active");
  elements.progressRingRight.classList.remove("active");

  elements.gameOver.classList.remove("hidden");
  elements.finalScoreLeft.textContent = state.myScore;
  elements.finalScoreRight.textContent = state.opponentScore;

  if (winner === "disconnect") {
    elements.gameOverTrophy.textContent = "😔";
    elements.gameOverTitle.textContent = "DISCONNECTED";
    elements.gameOverTitle.className = "game-over-title defeat";
    elements.gameOverMessage.textContent = "Your opponent left the game";
    elements.btnPlayAgain.classList.add("hidden");
  } else if (winner === "me") {
    elements.gameOverTrophy.textContent = "🏆";
    elements.gameOverTitle.textContent = "VICTORY!";
    elements.gameOverTitle.className = "game-over-title victory";
    elements.gameOverMessage.textContent =
      "Congratulations! You are the emotion master!";
    elements.btnPlayAgain.classList.remove("hidden");
  } else {
    elements.gameOverTrophy.textContent = "😢";
    elements.gameOverTitle.textContent = "DEFEAT";
    elements.gameOverTitle.className = "game-over-title defeat";
    elements.gameOverMessage.textContent = "Better luck next time!";
    elements.btnPlayAgain.classList.remove("hidden");
  }
}

function stopGame() {
  state.isGameActive = false;
  state.isRoundActive = false;
  clearInterval(state.roundTimer);
  stopDetection();
}

function resetGame() {
  state.currentRound = 1;
  state.myScore = 0;
  state.opponentScore = 0;
  state.roundWinner = null;

  elements.gameOver.classList.add("hidden");
  elements.roundResult.classList.add("hidden");

  updateScores();
}

function playAgain() {
  resetGame();

  if (state.isHost && state.connection) {
    sendMessage({ type: "play_again" });
  }

  startGame();
}

function backToLobby() {
  stopGame();
  stopCamera();

  if (state.mediaConnection) {
    state.mediaConnection.close();
    state.mediaConnection = null;
  }

  if (state.connection) {
    sendMessage({ type: "leave" });
    state.connection.close();
    state.connection = null;
  }

  if (state.peer) {
    state.peer.destroy();
    state.peer = null;
  }

  // Reset all state
  state.gameMode = null;
  state.isHost = false;
  state.isReady = false;
  state.opponentReady = false;
  state.opponentStream = null;
  elements.gameOver.classList.add("hidden");

  // Remove opponent video if exists
  const opponentVideo = document.getElementById("opponent-video");
  if (opponentVideo) {
    opponentVideo.remove();
  }
  const opponentDisplay = document.getElementById("opponent-display");
  if (opponentDisplay) {
    opponentDisplay.classList.remove("hidden");
  }

  showLobby();
}

// ============================================
// FACE DETECTION
// ============================================
function startDetection() {
  if (state.isDetecting) return;
  state.isDetecting = true;

  const detect = async () => {
    if (!state.isDetecting || !state.isVideoPlaying) return;

    try {
      const detections = await faceapi
        .detectAllFaces(
          elements.video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: CONFIG.minConfidence,
          })
        )
        .withFaceLandmarks()
        .withFaceExpressions();

      processDetections(detections);
    } catch (error) {
      console.error("Detection error:", error);
    }

    state.detectionLoop = setTimeout(detect, CONFIG.detectionInterval);
  };

  detect();
}

function stopDetection() {
  state.isDetecting = false;
  if (state.detectionLoop) {
    clearTimeout(state.detectionLoop);
    state.detectionLoop = null;
  }
}

function processDetections(detections) {
  const ctx = elements.canvas.getContext("2d");
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);

  if (detections.length === 0) {
    return;
  }

  const detection = detections[0];

  // Draw face overlay
  drawFaceOverlay(ctx, detection);

  // Process emotions
  if (detection.expressions && state.currentEmotion) {
    // Get the target emotion value
    let emotionValue = detection.expressions[state.currentEmotion] || 0;

    // Apply smoothing
    state.smoothedEmotions[state.currentEmotion] =
      state.smoothedEmotions[state.currentEmotion] *
        (1 - CONFIG.smoothingFactor) +
      emotionValue * CONFIG.smoothingFactor;

    state.myEmotionValue = state.smoothedEmotions[state.currentEmotion];

    // Update my progress
    updateProgress("left", state.myEmotionValue);

    // Send to opponent
    if (state.connection) {
      sendMessage({
        type: "emotion_update",
        emotion: state.currentEmotion,
        value: state.myEmotionValue,
      });
    }

    // Check win condition
    if (state.isRoundActive) {
      checkWinCondition(state.myEmotionValue, true);
    }

    // Solo mode: simulate opponent
    if (state.gameMode === "solo" && state.isRoundActive) {
      simulateOpponent();
    }
  }
}

function updateOpponentEmotion(emotion, value) {
  state.opponentEmotionValue = value;
  updateProgress("right", value);

  // Update opponent display
  const emotionConfig = CONFIG.emotions[emotion];
  if (emotionConfig) {
    elements.opponentEmoji.textContent = emotionConfig.emoji;
    elements.opponentEmotion.textContent = `${Math.round(value * 100)}%`;
  }

  // Only host checks win conditions (host receives opponent's emotion)
  if (state.isRoundActive && state.isHost) {
    checkWinCondition(value, false);
  }
}

function simulateOpponent() {
  // Simple AI: gradually approach target with some randomness
  const targetSpeed = 0.005 + Math.random() * 0.01;
  const noise = (Math.random() - 0.5) * 0.02;

  state.opponentEmotionValue = Math.max(
    0,
    Math.min(1, state.opponentEmotionValue + targetSpeed + noise)
  );

  updateProgress("right", state.opponentEmotionValue);

  const emotionConfig = CONFIG.emotions[state.currentEmotion];
  elements.opponentEmoji.textContent = emotionConfig?.emoji || "😐";
  elements.opponentEmotion.textContent = `${Math.round(
    state.opponentEmotionValue * 100
  )}%`;

  checkWinCondition(state.opponentEmotionValue, false);
}

function drawFaceOverlay(ctx, detection) {
  const box = detection.detection.box;
  const emotionColor =
    CONFIG.emotions[state.currentEmotion]?.color || "#00f0ff";

  // Draw detection box
  ctx.strokeStyle = emotionColor;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 5]);

  const radius = 12;
  ctx.beginPath();
  ctx.moveTo(box.x + radius, box.y);
  ctx.lineTo(box.x + box.width - radius, box.y);
  ctx.quadraticCurveTo(
    box.x + box.width,
    box.y,
    box.x + box.width,
    box.y + radius
  );
  ctx.lineTo(box.x + box.width, box.y + box.height - radius);
  ctx.quadraticCurveTo(
    box.x + box.width,
    box.y + box.height,
    box.x + box.width - radius,
    box.y + box.height
  );
  ctx.lineTo(box.x + radius, box.y + box.height);
  ctx.quadraticCurveTo(
    box.x,
    box.y + box.height,
    box.x,
    box.y + box.height - radius
  );
  ctx.lineTo(box.x, box.y + radius);
  ctx.quadraticCurveTo(box.x, box.y, box.x + radius, box.y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner accents
  const cornerSize = 20;
  ctx.lineWidth = 4;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + cornerSize);
  ctx.lineTo(box.x, box.y);
  ctx.lineTo(box.x + cornerSize, box.y);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(box.x + box.width - cornerSize, box.y);
  ctx.lineTo(box.x + box.width, box.y);
  ctx.lineTo(box.x + box.width, box.y + cornerSize);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + box.height - cornerSize);
  ctx.lineTo(box.x, box.y + box.height);
  ctx.lineTo(box.x + cornerSize, box.y + box.height);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(box.x + box.width - cornerSize, box.y + box.height);
  ctx.lineTo(box.x + box.width, box.y + box.height);
  ctx.lineTo(box.x + box.width, box.y + box.height - cornerSize);
  ctx.stroke();
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Player name
  elements.playerName.addEventListener("change", () => {
    state.playerName = elements.playerName.value || "Player";
    localStorage.setItem("emotionlens_name", state.playerName);
  });

  // Mode selection
  elements.btnSoloMode.addEventListener("click", startSoloMode);
  elements.btnCreateRoom.addEventListener("click", createRoom);
  elements.btnJoinRoom.addEventListener("click", joinRoom);

  // Create room
  elements.btnCopyCode.addEventListener("click", () => {
    navigator.clipboard.writeText(elements.roomCodeValue.textContent);
    showToast("Room code copied!", "success");
  });
  elements.btnCancelCreate.addEventListener("click", () => {
    if (state.peer) {
      state.peer.destroy();
      state.peer = null;
    }
    stopCamera();
    elements.createPanel.classList.add("hidden");
    elements.modeSelection.classList.remove("hidden");
  });

  // Join room
  elements.joinCodeInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase();
  });
  elements.joinCodeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      connectToRoom();
    }
  });
  elements.btnConnect.addEventListener("click", connectToRoom);
  elements.btnCancelJoin.addEventListener("click", () => {
    elements.joinPanel.classList.add("hidden");
    elements.modeSelection.classList.remove("hidden");
  });

  // Game controls
  elements.btnLeave.addEventListener("click", backToLobby);
  elements.btnPlayAgain.addEventListener("click", playAgain);
  elements.btnBackLobby.addEventListener("click", backToLobby);

  // Window resize
  window.addEventListener("resize", () => {
    if (state.isVideoPlaying) {
      resizeCanvas();
    }
  });
}

// ============================================
// DIAGNOSTICS
// ============================================
function initDiagnostics() {
  const panel = document.getElementById("diagnostics-panel");
  const btnOpen = document.getElementById("btn-diagnostics");
  const btnClose = document.getElementById("diagnostics-close");
  const btnRunAll = document.getElementById("btn-run-all-tests");
  const btnTestCamera = document.getElementById("btn-test-camera");
  const btnTestPeer = document.getElementById("btn-test-peer");

  if (!btnOpen) return;

  btnOpen.addEventListener("click", () => {
    panel.classList.remove("hidden");
    updateNetworkInfo();
  });

  btnClose.addEventListener("click", () => {
    panel.classList.add("hidden");
    stopDiagVideo();
  });

  panel.addEventListener("click", (e) => {
    if (e.target === panel) {
      panel.classList.add("hidden");
      stopDiagVideo();
    }
  });

  btnTestCamera.addEventListener("click", testCamera);
  btnTestPeer.addEventListener("click", testPeerConnection);
  btnRunAll.addEventListener("click", runAllTests);

  const btnTestWebRTC = document.getElementById("btn-test-webrtc");
  if (btnTestWebRTC) {
    btnTestWebRTC.addEventListener("click", testWebRTCConnectivity);
  }
}

async function testCamera() {
  const status = document.getElementById("diag-camera-status");
  const preview = document.getElementById("diag-camera-preview");
  const video = document.getElementById("diag-video");

  status.textContent = "Testing...";
  status.className = "diag-status testing";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    video.srcObject = stream;
    preview.classList.remove("hidden");

    status.textContent = "✅ Camera working";
    status.className = "diag-status success";

    // Auto-stop after 10 seconds
    setTimeout(() => stopDiagVideo(), 10000);

    return true;
  } catch (error) {
    status.textContent =
      "❌ " +
      (error.name === "NotAllowedError" ? "Permission denied" : error.message);
    status.className = "diag-status error";
    preview.classList.add("hidden");
    return false;
  }
}

function stopDiagVideo() {
  const video = document.getElementById("diag-video");
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

async function testPeerConnection() {
  const status = document.getElementById("diag-peer-status");
  const info = document.getElementById("diag-peer-info");

  status.textContent = "Connecting...";
  status.className = "diag-status testing";
  info.innerHTML = "";

  try {
    const testPeer = new Peer({
      debug: 0,
    });

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        testPeer.destroy();
        reject(new Error("Connection timeout"));
      }, 10000);

      testPeer.on("open", (id) => {
        clearTimeout(timeout);
        resolve({ id, peer: testPeer });
      });

      testPeer.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    status.textContent = "✅ Connected to PeerJS";
    status.className = "diag-status success";
    info.innerHTML = `<div>Your ID: <span>${result.id}</span></div>`;

    // Clean up
    result.peer.destroy();

    return true;
  } catch (error) {
    status.textContent = "❌ " + error.message;
    status.className = "diag-status error";
    info.innerHTML =
      '<div style="color: var(--angry);">PeerJS server unreachable. Check internet connection.</div>';
    return false;
  }
}

function updateNetworkInfo() {
  // Browser info
  const browser = document.getElementById("diag-browser");
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) browser.textContent = "Chrome";
  else if (ua.includes("Firefox")) browser.textContent = "Firefox";
  else if (ua.includes("Safari")) browser.textContent = "Safari";
  else if (ua.includes("Edge")) browser.textContent = "Edge";
  else browser.textContent = "Unknown";

  // Connection type
  const connType = document.getElementById("diag-connection-type");
  if (navigator.connection) {
    connType.textContent = navigator.connection.effectiveType || "Unknown";
  } else {
    connType.textContent = "N/A";
  }

  // WebRTC support
  const webrtc = document.getElementById("diag-webrtc");
  if (window.RTCPeerConnection) {
    webrtc.textContent = "Supported ✅";
    webrtc.style.color = "var(--happy)";
  } else {
    webrtc.textContent = "Not supported ❌";
    webrtc.style.color = "var(--angry)";
  }
}

async function testWebRTCConnectivity() {
  const status = document.getElementById("diag-webrtc");
  if (!status) return false;

  status.textContent = "Testing...";
  status.style.color = "var(--accent)";

  try {
    // Create a test RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    // Create a data channel to trigger ICE gathering
    pc.createDataChannel("test");

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE candidates
    const result = await new Promise((resolve) => {
      let hasCandidate = false;
      
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          hasCandidate = true;
          // Check candidate type
          const candidateStr = e.candidate.candidate;
          if (candidateStr.includes("srflx")) {
            resolve({ success: true, type: "STUN (can connect externally)" });
          } else if (candidateStr.includes("relay")) {
            resolve({ success: true, type: "TURN (relay connection)" });
          }
        }
      };

      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") {
          if (hasCandidate) {
            resolve({ success: true, type: "Host candidates only (may have issues)" });
          } else {
            resolve({ success: false, type: "No candidates found" });
          }
        }
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (hasCandidate) {
          resolve({ success: true, type: "Local only (firewall may block)" });
        } else {
          resolve({ success: false, type: "Timeout - blocked by firewall" });
        }
      }, 10000);
    });

    pc.close();

    if (result.success) {
      status.textContent = `✅ ${result.type}`;
      status.style.color = "var(--happy)";
    } else {
      status.textContent = `❌ ${result.type}`;
      status.style.color = "var(--angry)";
    }

    return result.success;
  } catch (error) {
    status.textContent = "❌ WebRTC failed: " + error.message;
    status.style.color = "var(--angry)";
    return false;
  }
}

async function runAllTests() {
  const btn = document.getElementById("btn-run-all-tests");
  btn.disabled = true;
  btn.textContent = "Running tests...";

  await testCamera();
  await new Promise((r) => setTimeout(r, 500));
  await testPeerConnection();
  await new Promise((r) => setTimeout(r, 500));
  await testWebRTCConnectivity();

  btn.disabled = false;
  btn.textContent = "Run All Tests";
}

// ============================================
// STARTUP
// ============================================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(init, 100);
  });
} else {
  setTimeout(init, 100);
}
