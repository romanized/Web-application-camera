/**
 * EmotionLens Arena - Multiplayer Emotion Battle
 * Real-time face detection and emotion recognition game using face-api.js + PeerJS
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    // Model paths
    MODEL_URL: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/',
    
    // Detection settings
    detectionInterval: 80,
    smoothingFactor: 0.35,
    minConfidence: 0.5,
    
    // Game settings
    targetPercent: 99,           // Emotion percentage needed to win
    roundTimeLimit: 15,          // Seconds per round
    roundsToWin: 5,              // First to X points wins
    roundDelay: 3000,            // Delay between rounds (ms)
    
    // Emotions config
    emotions: {
        happy: { name: 'Happy', emoji: '😊', color: '#00ff88' },
        sad: { name: 'Sad', emoji: '😢', color: '#4a9eff' },
        angry: { name: 'Angry', emoji: '😠', color: '#ff4757' },
        surprised: { name: 'Surprised', emoji: '😲', color: '#ffa502' },
        neutral: { name: 'Neutral', emoji: '😐', color: '#747d8c' }
        // Removed fearful and disgusted as they're harder to reliably detect
    }
};

// ============================================
// GAME STATE
// ============================================
const state = {
    // App state
    isModelLoaded: false,
    isVideoPlaying: false,
    isDetecting: false,
    
    // Game mode
    gameMode: null, // 'solo', 'host', 'join'
    isHost: false,
    
    // Player info
    playerName: 'Player',
    opponentName: 'Opponent',
    
    // Connection
    peer: null,
    connection: null,
    peerId: null,
    
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
    isRoundActive: false
};

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {};

function initElements() {
    // Loading screen
    elements.loadingScreen = document.getElementById('loading-screen');
    elements.loaderStatus = document.getElementById('loader-status');
    elements.loaderProgressBar = document.getElementById('loader-progress-bar');
    
    // Lobby screen
    elements.lobbyScreen = document.getElementById('lobby-screen');
    elements.modeSelection = document.getElementById('mode-selection');
    elements.btnSoloMode = document.getElementById('btn-solo-mode');
    elements.btnCreateRoom = document.getElementById('btn-create-room');
    elements.btnJoinRoom = document.getElementById('btn-join-room');
    
    // Create room panel
    elements.createPanel = document.getElementById('create-panel');
    elements.roomCodeValue = document.getElementById('room-code-value');
    elements.btnCopyCode = document.getElementById('btn-copy-code');
    elements.createStatus = document.getElementById('create-status');
    elements.btnCancelCreate = document.getElementById('btn-cancel-create');
    
    // Join room panel
    elements.joinPanel = document.getElementById('join-panel');
    elements.joinCodeInput = document.getElementById('join-code-input');
    elements.joinStatus = document.getElementById('join-status');
    elements.btnCancelJoin = document.getElementById('btn-cancel-join');
    elements.btnConnect = document.getElementById('btn-connect');
    
    // Player name
    elements.playerName = document.getElementById('player-name');
    
    // Game screen
    elements.gameScreen = document.getElementById('game-screen');
    elements.video = document.getElementById('video');
    elements.canvas = document.getElementById('overlay-canvas');
    
    // Scoreboard
    elements.scoreLeft = document.getElementById('score-left');
    elements.scoreRight = document.getElementById('score-right');
    elements.scoreNameLeft = document.getElementById('score-name-left');
    elements.scoreNameRight = document.getElementById('score-name-right');
    elements.roundValue = document.getElementById('round-value');
    elements.btnLeave = document.getElementById('btn-leave');
    
    // Challenge
    elements.challengeEmoji = document.getElementById('challenge-emoji');
    elements.challengeName = document.getElementById('challenge-name');
    elements.targetPercent = document.getElementById('target-percent');
    elements.timerProgress = document.getElementById('timer-progress');
    elements.timerValue = document.getElementById('timer-value');
    
    // Players
    elements.playerLeftName = document.getElementById('player-left-name');
    elements.playerRightName = document.getElementById('player-right-name');
    elements.playerLeftStatus = document.getElementById('player-left-status');
    elements.playerRightStatus = document.getElementById('player-right-status');
    
    // Progress rings
    elements.ringLeft = document.getElementById('ring-left');
    elements.ringRight = document.getElementById('ring-right');
    elements.ringValueLeft = document.getElementById('ring-value-left');
    elements.ringValueRight = document.getElementById('ring-value-right');
    elements.progressRingLeft = document.getElementById('progress-ring-left');
    elements.progressRingRight = document.getElementById('progress-ring-right');
    
    // Emotion bars
    elements.emotionBarLeft = document.getElementById('emotion-bar-left');
    elements.emotionBarRight = document.getElementById('emotion-bar-right');
    elements.emotionValueLeft = document.getElementById('emotion-value-left');
    elements.emotionValueRight = document.getElementById('emotion-value-right');
    
    // Winner badges
    elements.winnerBadgeLeft = document.getElementById('winner-badge-left');
    elements.winnerBadgeRight = document.getElementById('winner-badge-right');
    
    // Opponent display
    elements.opponentEmoji = document.getElementById('opponent-emoji');
    elements.opponentEmotion = document.getElementById('opponent-emotion');
    
    // Overlays
    elements.roundResult = document.getElementById('round-result');
    elements.resultEmoji = document.getElementById('result-emoji');
    elements.resultText = document.getElementById('result-text');
    elements.resultSubtext = document.getElementById('result-subtext');
    
    elements.gameOver = document.getElementById('game-over');
    elements.gameOverTrophy = document.getElementById('game-over-trophy');
    elements.gameOverTitle = document.getElementById('game-over-title');
    elements.finalScoreLeft = document.getElementById('final-score-left');
    elements.finalScoreRight = document.getElementById('final-score-right');
    elements.gameOverMessage = document.getElementById('game-over-message');
    elements.btnPlayAgain = document.getElementById('btn-play-again');
    elements.btnBackLobby = document.getElementById('btn-back-lobby');
    
    elements.countdownOverlay = document.getElementById('countdown-overlay');
    elements.countdownNumber = document.getElementById('countdown-number');
    
    elements.toastContainer = document.getElementById('toast-container');
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    console.log('🎮 Initializing EmotionLens Arena...');
    
    initElements();
    
    // Initialize emotion smoothing
    Object.keys(CONFIG.emotions).forEach(emotion => {
        state.smoothedEmotions[emotion] = 0;
    });
    
    // Set default player name
    const savedName = localStorage.getItem('emotionlens_name');
    if (savedName) {
        elements.playerName.value = savedName;
        state.playerName = savedName;
    } else {
        state.playerName = 'Player ' + Math.floor(Math.random() * 1000);
        elements.playerName.value = state.playerName;
    }
    
    try {
        // Load AI models
        await loadModels();
        
        // Setup event listeners
        setupEventListeners();
        
        // Show lobby
        showLobby();
        
        console.log('✅ EmotionLens Arena ready!');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError(error.message);
    }
}

// ============================================
// MODEL LOADING
// ============================================
async function loadModels() {
    updateLoadingStatus('Loading face detection model...', 10);
    await faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL);
    
    updateLoadingStatus('Loading facial landmarks model...', 40);
    await faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL);
    
    updateLoadingStatus('Loading expression recognition model...', 70);
    await faceapi.nets.faceExpressionNet.loadFromUri(CONFIG.MODEL_URL);
    
    updateLoadingStatus('Models loaded!', 100);
    state.isModelLoaded = true;
    
    await new Promise(resolve => setTimeout(resolve, 500));
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
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
        },
        audio: false
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
        if (error.name === 'NotAllowedError') {
            throw new Error('Camera access denied. Please allow camera access.');
        }
        throw error;
    }
}

function stopCamera() {
    const stream = elements.video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
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
        
        console.log('🔄 Creating room with code:', roomCode);
        
        // Destroy existing peer if any
        if (state.peer) {
            state.peer.destroy();
            state.peer = null;
        }
        
        state.peer = new Peer(roomCode, {
            debug: 2,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            }
        });
        
        state.peer.on('open', (id) => {
            console.log('📡 Room created with ID:', id);
            state.peerId = id;
            resolve(id);
        });
        
        state.peer.on('connection', (conn) => {
            console.log('🤝 Incoming connection from:', conn.peer);
            handleConnection(conn);
        });
        
        state.peer.on('disconnected', () => {
            console.log('Peer disconnected, attempting reconnect...');
            if (state.peer && !state.peer.destroyed) {
                state.peer.reconnect();
            }
        });
        
        state.peer.on('error', (err) => {
            console.error('Peer error:', err);
            if (err.type === 'unavailable-id') {
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
        console.log('🔄 Creating peer for joining...');
        console.log('🎯 Target room:', targetId);
        
        // Destroy existing peer if any
        if (state.peer) {
            state.peer.destroy();
            state.peer = null;
        }
        
        state.peer = new Peer({
            debug: 2,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });
        
        state.peer.on('open', (myId) => {
            console.log('📡 My peer ID:', myId);
            console.log('📡 Attempting connection to:', targetId);
            
            const conn = state.peer.connect(targetId, {
                reliable: true,
                serialization: 'json'
            });
            
            // Set up data handler immediately
            conn.on('data', (data) => {
                console.log('📨 Received data:', data.type);
                handleMessage(data);
            });
            
            conn.on('open', () => {
                console.log('✅ Joiner: Connection opened!');
                if (!isResolved) {
                    isResolved = true;
                    state.connection = conn;
                    
                    // Send player info immediately
                    console.log('📤 Sending player info...');
                    conn.send({
                        type: 'player_info',
                        name: state.playerName
                    });
                    
                    resolve(conn);
                }
            });
            
            conn.on('close', () => {
                console.log('❌ Connection closed');
                handleDisconnect();
            });
            
            conn.on('error', (err) => {
                console.error('Connection error:', err);
                if (!isResolved) {
                    isResolved = true;
                    reject(err);
                }
            });
        });
        
        state.peer.on('error', (err) => {
            console.error('Peer error:', err.type, err);
            if (!isResolved) {
                isResolved = true;
                if (err.type === 'peer-unavailable') {
                    reject(new Error('Room not found. Check the code.'));
                } else if (err.type === 'network') {
                    reject(new Error('Network error. Check your connection.'));
                } else if (err.type === 'server-error') {
                    reject(new Error('Server error. Try again.'));
                } else {
                    reject(new Error(err.message || 'Connection failed.'));
                }
            }
        });
        
        state.peer.on('disconnected', () => {
            console.log('Peer disconnected from server...');
        });
        
        // Timeout
        setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                console.log('⏰ Connection timeout after 20 seconds');
                reject(new Error('Connection timeout. Room may not exist or host left.'));
            }
        }, 20000);
    });
}

function handleConnection(conn) {
    console.log('🔗 handleConnection called, connection open:', conn.open);
    state.connection = conn;
    
    // Function to run when connection is ready
    const onConnectionReady = () => {
        console.log('✅ Connection established and ready!');
        
        // Send player info
        sendMessage({
            type: 'player_info',
            name: state.playerName
        });
        
        if (state.isHost) {
            elements.createStatus.textContent = 'Opponent connected!';
            elements.createStatus.classList.add('success');
            showToast('Opponent connected!', 'success');
            
            // Transition to game screen and start game
            setTimeout(() => {
                showGameScreen();  // Host also needs to go to game screen!
                startGame();
            }, 1000);
        }
    };
    
    // Check if connection is already open
    if (conn.open) {
        onConnectionReady();
    } else {
        conn.on('open', onConnectionReady);
    }
    
    conn.on('data', (data) => {
        console.log('📨 Received data:', data.type);
        handleMessage(data);
    });
    
    conn.on('close', () => {
        console.log('❌ Connection closed');
        handleDisconnect();
    });
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        showToast('Connection error', 'error');
    });
}

function sendMessage(data) {
    if (state.connection && state.connection.open) {
        state.connection.send(data);
    }
}

function handleMessage(data) {
    switch (data.type) {
        case 'player_info':
            state.opponentName = data.name;
            elements.playerRightName.textContent = data.name;
            elements.scoreNameRight.textContent = data.name;
            break;
            
        case 'game_start':
            if (!state.isHost) {
                console.log('📥 Received game_start from host');
                state.isGameActive = true;
                state.currentRound = data.round;
                state.currentEmotion = data.emotion;
                state.myScore = data.scores.joiner;
                state.opponentScore = data.scores.host;
                updateScores();
                
                // Show countdown then start round (same as host)
                showCountdown(() => {
                    startRound();
                });
            }
            break;
            
        case 'emotion_update':
            updateOpponentEmotion(data.emotion, data.value);
            break;
            
        case 'round_win':
            handleRoundWin(data.winner, data.scores);
            break;
            
        case 'next_round':
            if (!state.isHost) {
                console.log('📥 Received next_round from host');
                state.currentRound = data.round;
                state.currentEmotion = data.emotion;
                startRound();  // No countdown between rounds, just start
            }
            break;
            
        case 'game_over':
            showGameOver(data.winner, data.scores);
            break;
            
        case 'play_again':
            if (!state.isHost) {
                resetGame();
                startGame();
            }
            break;
            
        case 'leave':
            handleDisconnect();
            break;
    }
}

function handleDisconnect() {
    showToast('Opponent disconnected', 'error');
    
    if (state.isGameActive) {
        stopGame();
        showGameOver('disconnect');
    } else {
        backToLobby();
    }
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ============================================
// SCREENS
// ============================================
function showLobby() {
    elements.loadingScreen.classList.add('hidden');
    elements.lobbyScreen.classList.remove('hidden');
    elements.gameScreen.classList.add('hidden');
    
    // Reset panels
    elements.modeSelection.classList.remove('hidden');
    elements.createPanel.classList.add('hidden');
    elements.joinPanel.classList.add('hidden');
}

function showError(message) {
    elements.loaderStatus.textContent = message;
    elements.loaderStatus.style.color = '#ff4757';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// GAME FLOW
// ============================================
async function startSoloMode() {
    state.gameMode = 'solo';
    state.isHost = true;
    state.opponentName = 'AI Bot';
    
    try {
        await startCamera();
        showGameScreen();
        startGame();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function createRoom() {
    state.gameMode = 'host';
    state.isHost = true;
    
    elements.modeSelection.classList.add('hidden');
    elements.createPanel.classList.remove('hidden');
    elements.createStatus.textContent = 'Creating room...';
    elements.createStatus.classList.remove('success', 'error');
    
    try {
        const roomCode = await initPeer();
        elements.roomCodeValue.textContent = roomCode;
        elements.createStatus.textContent = 'Waiting for opponent to join...';
        
        // Start camera while waiting
        await startCamera();
    } catch (error) {
        elements.createStatus.textContent = 'Failed to create room';
        elements.createStatus.classList.add('error');
        showToast('Failed to create room', 'error');
    }
}

async function joinRoom() {
    elements.modeSelection.classList.add('hidden');
    elements.joinPanel.classList.remove('hidden');
    elements.joinCodeInput.value = '';
    elements.joinStatus.textContent = '';
    elements.joinCodeInput.focus();
}

async function connectToRoom() {
    const code = elements.joinCodeInput.value.toUpperCase().trim();
    
    if (code.length !== 6) {
        elements.joinStatus.textContent = 'Please enter a 6-character code';
        elements.joinStatus.classList.add('error');
        return;
    }
    
    state.gameMode = 'join';
    state.isHost = false;
    elements.joinStatus.textContent = 'Starting camera...';
    elements.joinStatus.classList.remove('error', 'success');
    elements.btnConnect.disabled = true;
    
    try {
        await startCamera();
        
        elements.joinStatus.textContent = 'Connecting to room ' + code + '...';
        
        await connectToPeer(code);
        
        elements.joinStatus.textContent = 'Connected! Starting game...';
        elements.joinStatus.classList.add('success');
        
        // Wait for host to start game
        setTimeout(() => {
            showGameScreen();
        }, 500);
    } catch (error) {
        console.error('Join error:', error);
        elements.joinStatus.textContent = error.message || 'Failed to connect. Check the code.';
        elements.joinStatus.classList.add('error');
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
    elements.lobbyScreen.classList.add('hidden');
    elements.gameScreen.classList.remove('hidden');
    
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
            type: 'game_start',
            round: state.currentRound,
            emotion: state.currentEmotion,
            scores: { host: state.myScore, joiner: state.opponentScore }
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
    elements.countdownOverlay.classList.remove('hidden');
    let count = 3;
    
    elements.countdownNumber.textContent = count;
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            elements.countdownNumber.textContent = count;
            elements.countdownNumber.style.animation = 'none';
            elements.countdownNumber.offsetHeight;
            elements.countdownNumber.style.animation = 'countdownPop 1s ease-in-out';
        } else {
            clearInterval(interval);
            elements.countdownOverlay.classList.add('hidden');
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
    updateProgress('left', 0);
    updateProgress('right', 0);
    elements.progressRingLeft.classList.add('active');
    elements.progressRingRight.classList.add('active');
    elements.winnerBadgeLeft.classList.add('hidden');
    elements.winnerBadgeRight.classList.add('hidden');
    
    // Update player status
    elements.playerLeftStatus.textContent = 'PLAYING';
    elements.playerLeftStatus.className = 'player-status playing';
    elements.playerRightStatus.textContent = 'PLAYING';
    elements.playerRightStatus.className = 'player-status playing';
    
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
        elements.timerProgress.classList.add('warning');
    } else {
        elements.timerProgress.classList.remove('warning');
    }
}

function updateProgress(side, value) {
    const percent = Math.round(value * 100);
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percent / 100) * circumference;
    
    if (side === 'left') {
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
    
    if (value >= CONFIG.targetPercent / 100) {
        state.roundWinner = isMe ? 'me' : 'opponent';
        endRound();
    }
}

function endRound() {
    state.isRoundActive = false;
    clearInterval(state.roundTimer);
    
    // Update scores
    if (state.roundWinner === 'me') {
        state.myScore++;
        elements.winnerBadgeLeft.classList.remove('hidden');
    } else if (state.roundWinner === 'opponent') {
        state.opponentScore++;
        elements.winnerBadgeRight.classList.remove('hidden');
    }
    
    updateScores();
    
    // Notify opponent if multiplayer and host
    if (state.isHost && state.connection) {
        sendMessage({
            type: 'round_win',
            winner: state.roundWinner === 'me' ? 'host' : 'joiner',
            scores: { host: state.myScore, joiner: state.opponentScore }
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
        state.roundWinner = 'me';
        state.myScore++;
        elements.winnerBadgeLeft.classList.remove('hidden');
    } else if (state.opponentEmotionValue > state.myEmotionValue) {
        state.roundWinner = 'opponent';
        state.opponentScore++;
        elements.winnerBadgeRight.classList.remove('hidden');
    } else {
        state.roundWinner = 'draw';
    }
    
    updateScores();
    
    if (state.isHost && state.connection) {
        sendMessage({
            type: 'round_win',
            winner: state.roundWinner === 'me' ? 'host' : (state.roundWinner === 'opponent' ? 'joiner' : 'draw'),
            scores: { host: state.myScore, joiner: state.opponentScore }
        });
    }
    
    showRoundResult();
}

function handleRoundWin(winner, scores) {
    if (!state.isHost) {
        state.myScore = scores.joiner;
        state.opponentScore = scores.host;
        
        if (winner === 'joiner') {
            state.roundWinner = 'me';
            elements.winnerBadgeLeft.classList.remove('hidden');
        } else if (winner === 'host') {
            state.roundWinner = 'opponent';
            elements.winnerBadgeRight.classList.remove('hidden');
        } else {
            state.roundWinner = 'draw';
        }
        
        state.isRoundActive = false;
        clearInterval(state.roundTimer);
        updateScores();
        showRoundResult();
    }
}

function showRoundResult() {
    elements.roundResult.classList.remove('hidden');
    
    if (state.roundWinner === 'me') {
        elements.resultEmoji.textContent = '🎉';
        elements.resultText.textContent = 'You Win!';
        elements.resultText.className = 'result-text win';
    } else if (state.roundWinner === 'opponent') {
        elements.resultEmoji.textContent = '😔';
        elements.resultText.textContent = 'Opponent Wins';
        elements.resultText.className = 'result-text lose';
    } else {
        elements.resultEmoji.textContent = '🤝';
        elements.resultText.textContent = 'Draw!';
        elements.resultText.className = 'result-text draw';
    }
    
    // Check for game over
    if (state.myScore >= CONFIG.roundsToWin || state.opponentScore >= CONFIG.roundsToWin) {
        elements.resultSubtext.textContent = 'Game Over!';
        setTimeout(() => {
            elements.roundResult.classList.add('hidden');
            const winner = state.myScore >= CONFIG.roundsToWin ? 'me' : 'opponent';
            
            if (state.isHost && state.connection) {
                sendMessage({
                    type: 'game_over',
                    winner: winner === 'me' ? 'host' : 'joiner',
                    scores: { host: state.myScore, joiner: state.opponentScore }
                });
            }
            
            showGameOver(winner);
        }, 2000);
    } else {
        elements.resultSubtext.textContent = 'Next round starting...';
        setTimeout(() => {
            elements.roundResult.classList.add('hidden');
            nextRound();
        }, CONFIG.roundDelay);
    }
}

function nextRound() {
    state.currentRound++;
    
    if (state.isHost) {
        pickNewEmotion();
        
        if (state.connection) {
            sendMessage({
                type: 'next_round',
                round: state.currentRound,
                emotion: state.currentEmotion
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
    elements.progressRingLeft.classList.remove('active');
    elements.progressRingRight.classList.remove('active');
    
    elements.gameOver.classList.remove('hidden');
    elements.finalScoreLeft.textContent = state.myScore;
    elements.finalScoreRight.textContent = state.opponentScore;
    
    if (winner === 'disconnect') {
        elements.gameOverTrophy.textContent = '😔';
        elements.gameOverTitle.textContent = 'DISCONNECTED';
        elements.gameOverTitle.className = 'game-over-title defeat';
        elements.gameOverMessage.textContent = 'Your opponent left the game';
        elements.btnPlayAgain.classList.add('hidden');
    } else if (winner === 'me') {
        elements.gameOverTrophy.textContent = '🏆';
        elements.gameOverTitle.textContent = 'VICTORY!';
        elements.gameOverTitle.className = 'game-over-title victory';
        elements.gameOverMessage.textContent = 'Congratulations! You are the emotion master!';
        elements.btnPlayAgain.classList.remove('hidden');
    } else {
        elements.gameOverTrophy.textContent = '😢';
        elements.gameOverTitle.textContent = 'DEFEAT';
        elements.gameOverTitle.className = 'game-over-title defeat';
        elements.gameOverMessage.textContent = 'Better luck next time!';
        elements.btnPlayAgain.classList.remove('hidden');
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
    
    elements.gameOver.classList.add('hidden');
    elements.roundResult.classList.add('hidden');
    
    updateScores();
}

function playAgain() {
    resetGame();
    
    if (state.isHost && state.connection) {
        sendMessage({ type: 'play_again' });
    }
    
    startGame();
}

function backToLobby() {
    stopGame();
    stopCamera();
    
    if (state.connection) {
        sendMessage({ type: 'leave' });
        state.connection.close();
        state.connection = null;
    }
    
    if (state.peer) {
        state.peer.destroy();
        state.peer = null;
    }
    
    state.gameMode = null;
    state.isHost = false;
    elements.gameOver.classList.add('hidden');
    
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
                .detectAllFaces(elements.video, new faceapi.TinyFaceDetectorOptions({
                    inputSize: 320,
                    scoreThreshold: CONFIG.minConfidence
                }))
                .withFaceLandmarks()
                .withFaceExpressions();
            
            processDetections(detections);
            
        } catch (error) {
            console.error('Detection error:', error);
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
    const ctx = elements.canvas.getContext('2d');
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
            state.smoothedEmotions[state.currentEmotion] * (1 - CONFIG.smoothingFactor) + 
            emotionValue * CONFIG.smoothingFactor;
        
        state.myEmotionValue = state.smoothedEmotions[state.currentEmotion];
        
        // Update my progress
        updateProgress('left', state.myEmotionValue);
        
        // Send to opponent
        if (state.connection) {
            sendMessage({
                type: 'emotion_update',
                emotion: state.currentEmotion,
                value: state.myEmotionValue
            });
        }
        
        // Check win condition
        if (state.isRoundActive) {
            checkWinCondition(state.myEmotionValue, true);
        }
        
        // Solo mode: simulate opponent
        if (state.gameMode === 'solo' && state.isRoundActive) {
            simulateOpponent();
        }
    }
}

function updateOpponentEmotion(emotion, value) {
    state.opponentEmotionValue = value;
    updateProgress('right', value);
    
    // Update opponent display
    const emotionConfig = CONFIG.emotions[emotion];
    if (emotionConfig) {
        elements.opponentEmoji.textContent = emotionConfig.emoji;
        elements.opponentEmotion.textContent = `${Math.round(value * 100)}%`;
    }
    
    // Check win condition
    if (state.isRoundActive && !state.isHost) {
        checkWinCondition(value, false);
    }
}

function simulateOpponent() {
    // Simple AI: gradually approach target with some randomness
    const targetSpeed = 0.005 + Math.random() * 0.01;
    const noise = (Math.random() - 0.5) * 0.02;
    
    state.opponentEmotionValue = Math.max(0, Math.min(1, 
        state.opponentEmotionValue + targetSpeed + noise
    ));
    
    updateProgress('right', state.opponentEmotionValue);
    
    const emotionConfig = CONFIG.emotions[state.currentEmotion];
    elements.opponentEmoji.textContent = emotionConfig?.emoji || '😐';
    elements.opponentEmotion.textContent = `${Math.round(state.opponentEmotionValue * 100)}%`;
    
    checkWinCondition(state.opponentEmotionValue, false);
}

function drawFaceOverlay(ctx, detection) {
    const box = detection.detection.box;
    const emotionColor = CONFIG.emotions[state.currentEmotion]?.color || '#00f0ff';
    
    // Draw detection box
    ctx.strokeStyle = emotionColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    
    const radius = 12;
    ctx.beginPath();
    ctx.moveTo(box.x + radius, box.y);
    ctx.lineTo(box.x + box.width - radius, box.y);
    ctx.quadraticCurveTo(box.x + box.width, box.y, box.x + box.width, box.y + radius);
    ctx.lineTo(box.x + box.width, box.y + box.height - radius);
    ctx.quadraticCurveTo(box.x + box.width, box.y + box.height, box.x + box.width - radius, box.y + box.height);
    ctx.lineTo(box.x + radius, box.y + box.height);
    ctx.quadraticCurveTo(box.x, box.y + box.height, box.x, box.y + box.height - radius);
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
    elements.playerName.addEventListener('change', () => {
        state.playerName = elements.playerName.value || 'Player';
        localStorage.setItem('emotionlens_name', state.playerName);
    });
    
    // Mode selection
    elements.btnSoloMode.addEventListener('click', startSoloMode);
    elements.btnCreateRoom.addEventListener('click', createRoom);
    elements.btnJoinRoom.addEventListener('click', joinRoom);
    
    // Create room
    elements.btnCopyCode.addEventListener('click', () => {
        navigator.clipboard.writeText(elements.roomCodeValue.textContent);
        showToast('Room code copied!', 'success');
    });
    elements.btnCancelCreate.addEventListener('click', () => {
        if (state.peer) {
            state.peer.destroy();
            state.peer = null;
        }
        stopCamera();
        elements.createPanel.classList.add('hidden');
        elements.modeSelection.classList.remove('hidden');
    });
    
    // Join room
    elements.joinCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
    elements.joinCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            connectToRoom();
        }
    });
    elements.btnConnect.addEventListener('click', connectToRoom);
    elements.btnCancelJoin.addEventListener('click', () => {
        elements.joinPanel.classList.add('hidden');
        elements.modeSelection.classList.remove('hidden');
    });
    
    // Game controls
    elements.btnLeave.addEventListener('click', backToLobby);
    elements.btnPlayAgain.addEventListener('click', playAgain);
    elements.btnBackLobby.addEventListener('click', backToLobby);
    
    // Window resize
    window.addEventListener('resize', () => {
        if (state.isVideoPlaying) {
            resizeCanvas();
        }
    });
}

// ============================================
// STARTUP
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(init, 100);
    });
} else {
    setTimeout(init, 100);
}
