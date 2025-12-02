# EmotionLens Arena - Multiplayer Emotion Battle 🎮

A real-time multiplayer game where players compete to match emotions! Uses face-api.js for emotion detection and PeerJS for peer-to-peer connections.

## ✨ Features

- **Real-time Face Tracking** - Smooth 68-point facial landmark detection
- **Emotion Recognition** - Detects 5 emotions: Happy, Sad, Angry, Surprised, Neutral
- **Multiplayer Mode** - Play against friends with peer-to-peer connections
- **Solo Practice** - Play against an AI bot to practice
- **Modern HUD** - Futuristic cyberpunk-inspired interface
- **No Server Required** - Uses PeerJS cloud for signaling, then direct P2P

## 🎯 How to Play

1. **Create or Join a Room**

   - **Solo Practice**: Play against an AI bot
   - **Create Room**: Get a 6-character room code to share
   - **Join Room**: Enter a friend's room code

2. **Match the Emotion**

   - A random emotion appears (e.g., 😊 HAPPY)
   - Make that facial expression!
   - First player to reach 80% wins the round

3. **Win the Game**
   - First to 5 points wins!

## 🚀 Quick Start

### Option 1: Using Python (Recommended)

```bash
cd Web-application-camera
python3 -m http.server 8000
```

Open: **http://localhost:8000**

### Option 2: Using Node.js

```bash
npm install -g http-server
cd Web-application-camera
http-server -p 8000
```

Open: **http://localhost:8000**

### Option 3: VS Code Live Server

1. Install "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

## 🎮 Multiplayer Setup

### To Play with a Friend:

1. **Player 1 (Host)**:

   - Click "Create Room"
   - Share the 6-character room code with your friend

2. **Player 2 (Guest)**:

   - Click "Join Room"
   - Enter the room code
   - Click "Connect"

3. **Game starts automatically** when both players are connected!

### Network Requirements:

- Both players need internet access
- Works across different networks (uses WebRTC)
- No port forwarding needed

## 📋 System Requirements

- Modern web browser (Chrome, Firefox, Edge, Safari)
- Webcam
- Internet connection

## 🎯 Detected Emotions

| Emotion   | Emoji | Tips                            |
| --------- | ----- | ------------------------------- |
| Happy     | 😊    | Smile wide, show teeth          |
| Sad       | 😢    | Frown, downturn mouth corners   |
| Angry     | 😠    | Furrow brows, tense face        |
| Surprised | 😲    | Raise eyebrows, open mouth wide |
| Neutral   | 😐    | Relax face completely           |

## 🛠 Technology Stack

- **Face Detection**: [face-api.js](https://github.com/justadudewhohacks/face-api.js)
- **Multiplayer**: [PeerJS](https://peerjs.com/) (WebRTC)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript
- **Fonts**: Orbitron & Rajdhani

## 📁 Project Structure

```
Web-application-camera/
├── index.html      # Game UI structure
├── styles.css      # Cyberpunk-style CSS
├── app.js          # Game logic & multiplayer
└── README.md       # This file
```

## ⚡ Performance Tips

1. **Good lighting** dramatically improves detection
2. **Face the camera directly** for best results
3. **Stay still** briefly when making expressions
4. **Close background apps** if experiencing lag

## 🔒 Privacy

- **100% Client-Side** - All face processing happens locally
- **P2P Connection** - Game data goes directly between players
- **No Recording** - Nothing is saved or uploaded

## 🐛 Troubleshooting

### Can't connect to opponent?

- Both players need the same room code
- Make sure both are using HTTPS or localhost
- Try refreshing and creating a new room

### Face not detected?

- Improve lighting conditions
- Face the camera directly
- Move closer to the camera

### Connection drops?

- Check internet stability
- Try creating a new room

## 📝 Game Settings

| Setting          | Value      |
| ---------------- | ---------- |
| Win Threshold    | 99%        |
| Round Time Limit | 15 seconds |
| Points to Win    | 5          |
| Detection Speed  | 80ms       |

## 🎨 UI Features

- Animated countdown before rounds
- Real-time progress rings
- Winner badges and celebrations
- Toast notifications
- Responsive design for all screens

---

**Have fun battling emotions! 🎭**
