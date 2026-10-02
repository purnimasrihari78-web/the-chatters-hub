# 💬 The Chatters Hub

> **Private, Instant Social Chatting with Friends**  
> *Combines the best features of WhatsApp & Instagram — with 100% privacy!*

---

## 🌟 Why The Chatters Hub?

Most chatting apps require your personal details like your mobile phone number, email address, or real identity. **The Chatters Hub is built differently:**

- 🛡️ **Zero Personal Credentials**: No phone number, no email address, no real names required.
- 🆔 **Unique User ID**: Pick your own handle (e.g., `@cool_coder`, `@alex101`) and a password/PIN.
- 🔗 **Easy Friend Connection**: Just share your User ID or copy your invite badge to chat immediately.

---

## 🚀 Key Features (WhatsApp + Instagram Combined)

### 📸 Instagram-Inspired Features
1. **Hub Stories (24-Hour Disappearing Status)**:
   - Share gradient text thoughts or upload photos.
   - Interactive viewer with auto-progress bar (5s per story), tap to skip forward/back.
   - Send emoji reactions (❤️, 🔥, 😂, 👏, 😮) or reply directly into DMs!
2. **Message Reactions**:
   - Double-tap any message or hover over it to react with emojis (❤️, 😂, 🔥, 👍).
   - Live reaction counts on message bubbles.
3. **Instagram-Style Profile Cards**:
   - Tap any friend to view their profile, avatar, bio, and 1-click Direct Message.

### 💬 WhatsApp-Inspired Features
1. **Direct (1-on-1) & Group Chats**:
   - Chat privately or create custom groups (e.g., *Study Squad*, *Gaming Lounge*).
2. **🎙️ Voice Notes**:
   - Record in-browser microphone voice clips with live recording timer.
   - Interactive audio player with waveform visuals and play/pause controls.
3. **📷 Photos & Attachments**:
   - Share images and screenshots directly in the chat with preview.
4. **💬 Message Quotes & Replies**:
   - Swipe or click reply on any message to quote it in your response.
5. **🟢 Real-Time Presence & Read Receipts**:
   - Online / Offline live indicators.
   - Real-time "Typing..." notifications.
   - Single tick (sent) and double blue ticks (read).
6. **🤖 Hub Bot**:
   - Built-in friendly AI bot assistant available 24/7 to test chats and features.

---

## 💻 How to Run

### Option 1: 1-Click Launcher (Windows)
Double-click [`start-chatters-hub.bat`](file:///C:/Users/THINKPAD/.gemini/antigravity/scratch/the-chatters-hub/start-chatters-hub.bat).

### Option 2: Command Line
```powershell
cd C:\Users\THINKPAD\.gemini\antigravity\scratch\the-chatters-hub
$env:Path = "C:\Users\THINKPAD\nodejs;$env:Path"
node server.js
```

---

## 📱 How to Chat With Friends

1. **On your computer**: Open your browser at [http://localhost:3000](http://localhost:3000).
2. **On your friends' phones / laptops (Same Wi-Fi or Hotspot)**:
   - Connect your friend's phone to the same Wi-Fi or laptop hotspot.
   - Open browser on their phone and go to:
     `http://10.200.89.78:3000` (or the IP printed in your terminal).
   - They create their User ID in 5 seconds and you can start chatting right away!
3. **Across the Internet (Worldwide)**:
   - You can share your local port using a free tunnel like [ngrok](https://ngrok.com) (`ngrok http 3000`), or deploy the repository to free platforms like [Render.com](https://render.com) or [Railway.app](https://railway.app).

---

## 📁 Project Structure

```
the-chatters-hub/
├── start-chatters-hub.bat      # 1-click Windows startup script
├── server.js                   # Node.js + Express + Socket.IO server
├── package.json                # Dependencies configuration
├── public/                     # Frontend client assets
│   ├── index.html              # Main single-page web app
│   ├── css/
│   │   └── style.css           # WhatsApp + Instagram dark/light theme
│   ├── js/
│   │   └── app.js              # Real-time WebSockets, Voice Notes & Stories
│   └── uploads/                # Shared photos and voice recordings
└── data/
    └── db.json                 # Persistent database for users, chats & stories
```
