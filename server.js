const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');
const os = require('os');
const firebaseService = require('./firebaseService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e7 // 10MB
});

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// --- Persistent Database Setup ---
function getDefaultDB() {
  const salt = 'chatters_hub_salt';
  const hash = (pwd) => crypto.pbkdf2Sync(pwd, salt, 1000, 32, 'sha256').toString('hex');
  
  return {
    users: [
      {
        userId: 'alex',
        displayName: 'Alex Rivers',
        passwordHash: hash('alex123'),
        avatar: 'avatar-1',
        bio: 'Coding & chilling 🎧',
        status: 'online',
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        userId: 'maya',
        displayName: 'Maya Chen',
        passwordHash: hash('maya123'),
        avatar: 'avatar-2',
        bio: 'Photography & aesthetic vibes 📸✨',
        status: 'online',
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        userId: 'chatterbot',
        displayName: 'Hub Bot 🤖',
        passwordHash: hash('bot123'),
        avatar: 'avatar-robot',
        bio: 'Welcome to The Chatters Hub! Talk to me anytime.',
        status: 'online',
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ],
    chats: [
      {
        id: 'chat_general',
        type: 'group',
        name: 'The Chatters Lounge 🌟',
        avatar: 'group-lounge',
        createdBy: 'chatterbot',
        members: ['alex', 'maya', 'chatterbot'],
        description: 'Global hangout for all chatters! Say hi!',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'chat_alex_maya',
        type: 'direct',
        members: ['alex', 'maya'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    messages: [
      {
        id: 'msg_welcome_1',
        chatId: 'chat_general',
        senderId: 'chatterbot',
        senderName: 'Hub Bot 🤖',
        senderAvatar: 'avatar-robot',
        type: 'text',
        content: '🎉 Welcome to **The Chatters Hub**! Chat with friends freely using just your unique User ID — no phone number, email, or personal credentials required! 🚀',
        reactions: { '❤️': ['alex', 'maya'], '🔥': ['alex'] },
        status: 'read',
        readBy: ['alex', 'maya'],
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'msg_welcome_2',
        chatId: 'chat_alex_maya',
        senderId: 'maya',
        senderName: 'Maya Chen',
        senderAvatar: 'avatar-2',
        type: 'text',
        content: 'Hey Alex! This app looks super clean like Instagram + WhatsApp combined! 💬✨',
        reactions: { '🔥': ['alex'] },
        status: 'read',
        readBy: ['alex'],
        timestamp: new Date(Date.now() - 1800000).toISOString()
      }
    ],
    stories: [
      {
        id: 'story_maya_1',
        userId: 'maya',
        userDisplayName: 'Maya Chen',
        userAvatar: 'avatar-2',
        type: 'text',
        content: 'Weekend study session underway ☕📖',
        background: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
        reactions: [{ userId: 'alex', emoji: '🔥' }],
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        expiresAt: new Date(Date.now() + 79200000).toISOString()
      },
      {
        id: 'story_alex_1',
        userId: 'alex',
        userDisplayName: 'Alex Rivers',
        userAvatar: 'avatar-1',
        type: 'text',
        content: 'Building The Chatters Hub with no phone numbers needed! 💻🚀',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        reactions: [{ userId: 'maya', emoji: '❤️' }],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: new Date(Date.now() + 82800000).toISOString()
      }
    ]
  };
}

let db = null;
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(data);
    } else {
      db = getDefaultDB();
      saveDB();
    }
  } catch (err) {
    console.error('Error reading db.json, initializing default:', err);
    db = getDefaultDB();
    saveDB();
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}

loadDB();

// Sync database to Firebase Firestore
firebaseService.syncAllToFirebase(db).catch(err => {
  console.warn('[Firebase] Background sync warning:', err.message);
});

// --- Crypto Helpers ---
const SALT = 'the_chatters_hub_secure_salt_2026';
function hashPassword(pwd) {
  return crypto.pbkdf2Sync(pwd, SALT, 1000, 32, 'sha256').toString('hex');
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function cleanUserId(id) {
  if (!id) return '';
  return id.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_.-]/g, '');
}

// --- Multer Storage (Photos & Voice Notes) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.includes('audio') ? '.webm' : '.png');
    const name = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Simple Token-based Auth Middleware
const activeSessions = new Map(); // token -> userId

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized. Please login again.' });
  }
  const userId = activeSessions.get(token);
  const user = db.users.find(u => u.userId === userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  req.user = user;
  next();
}

// --- REST Endpoints ---

// 1. Auth: Register (No personal credentials required!)
app.post('/api/register', (req, res) => {
  const rawUserId = req.body.userId;
  const displayName = (req.body.displayName || '').trim();
  const password = req.body.password;
  const avatar = req.body.avatar || 'avatar-1';
  const bio = (req.body.bio || 'Hey! I am using The Chatters Hub 🚀').trim();

  const userId = cleanUserId(rawUserId);

  if (!userId || userId.length < 3) {
    return res.status(400).json({ error: 'User ID must be at least 3 characters (letters, numbers, underscores)' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password/PIN must be at least 4 characters' });
  }
  if (!displayName) {
    return res.status(400).json({ error: 'Please enter a Display Name / Nickname' });
  }

  const existing = db.users.find(u => u.userId === userId);
  if (existing) {
    return res.status(400).json({ error: `User ID "@${userId}" is already taken. Please choose another one!` });
  }

  const newUser = {
    userId,
    displayName,
    passwordHash: hashPassword(password),
    avatar,
    bio,
    status: 'online',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // Automatically add them to the General Hub Lounge!
  const lounge = db.chats.find(c => c.id === 'chat_general');
  if (lounge && !lounge.members.includes(userId)) {
    lounge.members.push(userId);
  }

  saveDB();
  firebaseService.syncUser(newUser);

  const token = crypto.randomBytes(24).toString('hex');
  activeSessions.set(token, userId);

  // Notify lounge
  io.to('chat_general').emit('user-joined-hub', {
    userId,
    displayName,
    avatar
  });

  res.json({
    token,
    user: {
      userId: newUser.userId,
      displayName: newUser.displayName,
      avatar: newUser.avatar,
      bio: newUser.bio,
      status: newUser.status
    }
  });
});

// 2. Auth: Login
app.post('/api/login', (req, res) => {
  const userId = cleanUserId(req.body.userId);
  const password = req.body.password;

  if (!userId || !password) {
    return res.status(400).json({ error: 'Please enter your User ID and password' });
  }

  const user = db.users.find(u => u.userId === userId);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid User ID or Password' });
  }

  user.status = 'online';
  user.lastSeen = new Date().toISOString();
  saveDB();

  const token = crypto.randomBytes(24).toString('hex');
  activeSessions.set(token, userId);

  res.json({
    token,
    user: {
      userId: user.userId,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      status: user.status
    }
  });
});

// 3. Current User
app.get('/api/me', authenticate, (req, res) => {
  res.json({
    userId: req.user.userId,
    displayName: req.user.displayName,
    avatar: req.user.avatar,
    bio: req.user.bio,
    status: req.user.status
  });
});

// 4. Update Profile
app.put('/api/profile', authenticate, (req, res) => {
  const { displayName, avatar, bio } = req.body;
  if (displayName) req.user.displayName = displayName.trim();
  if (avatar) req.user.avatar = avatar;
  if (bio !== undefined) req.user.bio = bio.trim();

  saveDB();
  firebaseService.syncUser(req.user);
  io.emit('user-profile-updated', {
    userId: req.user.userId,
    displayName: req.user.displayName,
    avatar: req.user.avatar,
    bio: req.user.bio
  });

  res.json({ success: true, user: req.user });
});

// 5. Search Users (by User ID or Name)
app.get('/api/users/search', authenticate, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase().replace(/^@/, '');
  if (!q) return res.json({ users: [] });

  const matches = db.users
    .filter(u => u.userId !== req.user.userId && (u.userId.includes(q) || u.displayName.toLowerCase().includes(q)))
    .map(u => ({
      userId: u.userId,
      displayName: u.displayName,
      avatar: u.avatar,
      bio: u.bio,
      status: u.status,
      lastSeen: u.lastSeen
    }));

  res.json({ users: matches });
});

// 6. User Public Profile
app.get('/api/users/:userId', authenticate, (req, res) => {
  const targetId = cleanUserId(req.params.userId);
  const target = db.users.find(u => u.userId === targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  // Get active stories
  const now = new Date();
  const userStories = db.stories.filter(s => s.userId === targetId && new Date(s.expiresAt) > now);

  res.json({
    user: {
      userId: target.userId,
      displayName: target.displayName,
      avatar: target.avatar,
      bio: target.bio,
      status: target.status,
      lastSeen: target.lastSeen,
      createdAt: target.createdAt
    },
    stories: userStories
  });
});

// 7. Get All Chats for Current User
app.get('/api/chats', authenticate, (req, res) => {
  const myChats = db.chats.filter(c => c.members.includes(req.user.userId));

  const enrichedChats = myChats.map(chat => {
    // Get last message
    const msgs = db.messages.filter(m => m.chatId === chat.id);
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

    // Calculate unread count
    const unreadCount = msgs.filter(m => m.senderId !== req.user.userId && (!m.readBy || !m.readBy.includes(req.user.userId))).length;

    if (chat.type === 'direct') {
      const otherId = chat.members.find(m => m !== req.user.userId) || req.user.userId;
      const otherUser = db.users.find(u => u.userId === otherId) || {
        userId: otherId,
        displayName: `@${otherId}`,
        avatar: 'avatar-1',
        status: 'offline'
      };

      return {
        ...chat,
        name: otherUser.displayName,
        otherUserId: otherUser.userId,
        avatar: otherUser.avatar,
        status: otherUser.status,
        lastSeen: otherUser.lastSeen,
        lastMessage: lastMsg,
        unreadCount
      };
    } else {
      // Group chat
      return {
        ...chat,
        lastMessage: lastMsg,
        unreadCount
      };
    }
  });

  // Sort by latest message or updatedAt
  enrichedChats.sort((a, b) => {
    const timeA = a.lastMessage?.timestamp || a.updatedAt || a.createdAt;
    const timeB = b.lastMessage?.timestamp || b.updatedAt || b.createdAt;
    return new Date(timeB) - new Date(timeA);
  });

  res.json({ chats: enrichedChats });
});

// 8. Start / Open Direct Chat by User ID
app.post('/api/chats/direct', authenticate, (req, res) => {
  const targetId = cleanUserId(req.body.targetUserId);
  if (!targetId) return res.status(400).json({ error: 'Target User ID is required' });
  if (targetId === req.user.userId) {
    return res.status(400).json({ error: 'You cannot chat with yourself' });
  }

  const targetUser = db.users.find(u => u.userId === targetId);
  if (!targetUser) {
    return res.status(404).json({ error: `User "@${targetId}" was not found. Please check their User ID!` });
  }

  // Check if direct chat already exists
  let chat = db.chats.find(c => c.type === 'direct' && c.members.includes(req.user.userId) && c.members.includes(targetId));

  if (!chat) {
    chat = {
      id: generateId('chat_dm'),
      type: 'direct',
      members: [req.user.userId, targetId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.chats.push(chat);
    saveDB();
    firebaseService.syncChat(chat);
  }

  res.json({
    chat: {
      ...chat,
      name: targetUser.displayName,
      otherUserId: targetUser.userId,
      avatar: targetUser.avatar,
      status: targetUser.status
    }
  });
});

// 9. Create Group Chat
app.post('/api/chats/group', authenticate, (req, res) => {
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim();
  const avatar = req.body.avatar || 'group-default';
  const rawMemberIds = req.body.members || [];

  if (!name) return res.status(400).json({ error: 'Group name is required' });

  const members = [req.user.userId];
  for (const m of rawMemberIds) {
    const cleanId = cleanUserId(m);
    if (cleanId && !members.includes(cleanId) && db.users.some(u => u.userId === cleanId)) {
      members.push(cleanId);
    }
  }

  const newChat = {
    id: generateId('chat_grp'),
    type: 'group',
    name,
    description,
    avatar,
    createdBy: req.user.userId,
    admins: [req.user.userId],
    members,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.chats.push(newChat);

  // Initial system message
  const sysMsg = {
    id: generateId('msg'),
    chatId: newChat.id,
    senderId: 'system',
    senderName: 'System',
    type: 'system',
    content: `${req.user.displayName} created group "${name}"`,
    timestamp: new Date().toISOString()
  };
  db.messages.push(sysMsg);

  saveDB();
  firebaseService.syncChat(newChat);
  firebaseService.syncMessage(sysMsg);

  // Notify members
  members.forEach(m => {
    io.to(`user:${m}`).emit('new-group-created', newChat);
  });

  res.json({ chat: newChat });
});

// 10. Get Chat Messages
app.get('/api/chats/:chatId/messages', authenticate, (req, res) => {
  const chatId = req.params.chatId;
  const chat = db.chats.find(c => c.id === chatId);
  if (!chat || !chat.members.includes(req.user.userId)) {
    return res.status(403).json({ error: 'Access denied or chat not found' });
  }

  const msgs = db.messages.filter(m => m.chatId === chatId);

  // Mark all unread messages in this chat as read by this user
  let changed = false;
  msgs.forEach(m => {
    if (m.senderId !== req.user.userId) {
      if (!m.readBy) m.readBy = [];
      if (!m.readBy.includes(req.user.userId)) {
        m.readBy.push(req.user.userId);
        m.status = 'read';
        changed = true;
      }
    }
  });

  if (changed) {
    saveDB();
    io.to(chatId).emit('messages-read', {
      chatId,
      readBy: req.user.userId
    });
  }

  res.json({ messages: msgs });
});

// 11. Media Upload (Photos & Voice notes)
app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// 12. Stories: Get active stories (24h)
app.get('/api/stories', authenticate, (req, res) => {
  const now = new Date();
  // Filter stories active in last 24h
  const activeStories = db.stories.filter(s => new Date(s.expiresAt) > now);

  // Group by user
  const userMap = {};
  activeStories.forEach(s => {
    if (!userMap[s.userId]) {
      const u = db.users.find(usr => usr.userId === s.userId);
      userMap[s.userId] = {
        userId: s.userId,
        displayName: u ? u.displayName : s.userDisplayName,
        avatar: u ? u.avatar : s.userAvatar,
        stories: []
      };
    }
    userMap[s.userId].stories.push(s);
  });

  res.json({ storyUsers: Object.values(userMap) });
});

// 13. Stories: Post a story
app.post('/api/stories', authenticate, (req, res) => {
  const { type, content, mediaUrl, background } = req.body;
  if (!content && !mediaUrl) {
    return res.status(400).json({ error: 'Story content or image is required' });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  const newStory = {
    id: generateId('story'),
    userId: req.user.userId,
    userDisplayName: req.user.displayName,
    userAvatar: req.user.avatar,
    type: type || 'text',
    content: content || '',
    mediaUrl: mediaUrl || null,
    background: background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    reactions: [],
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  db.stories.push(newStory);
  saveDB();
  firebaseService.syncStory(newStory);

  io.emit('new-story-posted', newStory);

  res.json({ story: newStory });
});

// 14. Stories: React to a story
app.post('/api/stories/:id/react', authenticate, (req, res) => {
  const storyId = req.params.id;
  const emoji = req.body.emoji || '❤️';
  const story = db.stories.find(s => s.id === storyId);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  if (!story.reactions) story.reactions = [];
  story.reactions.push({
    userId: req.user.userId,
    userName: req.user.displayName,
    emoji,
    timestamp: new Date().toISOString()
  });

  saveDB();
  firebaseService.syncStory(story);

  // Notify story owner
  io.to(`user:${story.userId}`).emit('story-reaction-received', {
    storyId,
    reactorId: req.user.userId,
    reactorName: req.user.displayName,
    emoji
  });

  res.json({ success: true, reactions: story.reactions });
});

// --- Socket.IO Real-time Logic ---
const onlineUsers = new Map(); // socketId -> userId
const userSockets = new Map(); // userId -> Set of socketIds

io.on('connection', (socket) => {
  let currentUser = null;

  socket.on('auth', (token) => {
    if (token && activeSessions.has(token)) {
      const uid = activeSessions.get(token);
      const user = db.users.find(u => u.userId === uid);
      if (user) {
        currentUser = user;
        onlineUsers.set(socket.id, user.userId);

        if (!userSockets.has(user.userId)) {
          userSockets.set(user.userId, new Set());
        }
        userSockets.get(user.userId).add(socket.id);

        socket.join(`user:${user.userId}`);

        user.status = 'online';
        user.lastSeen = new Date().toISOString();
        saveDB();

        // Join all chats user belongs to
        const userChats = db.chats.filter(c => c.members.includes(user.userId));
        userChats.forEach(c => socket.join(c.id));

        io.emit('user-status-changed', {
          userId: user.userId,
          status: 'online',
          lastSeen: user.lastSeen
        });
      }
    }
  });

  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
  });

  // Typing indicator
  socket.on('typing', ({ chatId, isTyping }) => {
    if (!currentUser) return;
    socket.to(chatId).emit('user-typing', {
      chatId,
      userId: currentUser.userId,
      displayName: currentUser.displayName,
      isTyping
    });
  });

  // Sending message
  socket.on('send-message', (data) => {
    if (!currentUser) return;
    const { chatId, content, type, mediaUrl, replyTo } = data;

    const chat = db.chats.find(c => c.id === chatId);
    if (!chat || !chat.members.includes(currentUser.userId)) return;

    const newMsg = {
      id: generateId('msg'),
      chatId,
      senderId: currentUser.userId,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatar,
      type: type || 'text',
      content: content || '',
      mediaUrl: mediaUrl || null,
      replyTo: replyTo || null,
      reactions: {},
      status: 'sent',
      readBy: [currentUser.userId],
      timestamp: new Date().toISOString()
    };

    db.messages.push(newMsg);
    chat.updatedAt = new Date().toISOString();
    saveDB();
    firebaseService.syncMessage(newMsg);
    firebaseService.syncChat(chat);

    // Broadcast to the chat room
    io.to(chatId).emit('new-message', newMsg);

    // Bot Auto-Response in General Lounge or DM
    if (chat.type === 'direct' && chat.members.includes('chatterbot') && currentUser.userId !== 'chatterbot') {
      setTimeout(() => {
        handleBotReply(chatId, currentUser, content);
      }, 1000);
    }
  });

  // Message Reaction (Instagram style)
  socket.on('react-message', ({ messageId, emoji }) => {
    if (!currentUser) return;
    const msg = db.messages.find(m => m.id === messageId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

    const existingIndex = msg.reactions[emoji].indexOf(currentUser.userId);
    if (existingIndex > -1) {
      // Toggle off
      msg.reactions[emoji].splice(existingIndex, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      // Add reaction
      msg.reactions[emoji].push(currentUser.userId);
    }

    saveDB();
    firebaseService.syncMessage(msg);
    io.to(msg.chatId).emit('message-reaction-updated', {
      messageId: msg.id,
      chatId: msg.chatId,
      reactions: msg.reactions
    });
  });

  // Mark message read
  socket.on('mark-read', ({ chatId }) => {
    if (!currentUser) return;
    const msgs = db.messages.filter(m => m.chatId === chatId);
    let updated = false;

    msgs.forEach(m => {
      if (m.senderId !== currentUser.userId) {
        if (!m.readBy) m.readBy = [];
        if (!m.readBy.includes(currentUser.userId)) {
          m.readBy.push(currentUser.userId);
          m.status = 'read';
          updated = true;
        }
      }
    });

    if (updated) {
      saveDB();
      io.to(chatId).emit('messages-read', {
        chatId,
        readBy: currentUser.userId
      });
    }
  });

  socket.on('disconnect', () => {
    if (currentUser) {
      const sockets = userSockets.get(currentUser.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(currentUser.userId);
          const u = db.users.find(usr => usr.userId === currentUser.userId);
          if (u) {
            u.status = 'offline';
            u.lastSeen = new Date().toISOString();
            saveDB();
            io.emit('user-status-changed', {
              userId: currentUser.userId,
              status: 'offline',
              lastSeen: u.lastSeen
            });
          }
        }
      }
      onlineUsers.delete(socket.id);
    }
  });
});

// Helper: Hub Bot automated polite replies
function handleBotReply(chatId, user, userText) {
  const botResponses = [
    `Hey ${user.displayName}! That's awesome. Remember, in The Chatters Hub you can share your User ID (@${user.userId}) with any friend to start chatting instantly without sharing phone numbers! 🚀`,
    `Got it! You can also post 24-hour stories at the top, just like Instagram stories, or send voice notes just like WhatsApp! 🎙️📸`,
    `Awesome message! Try creating a group with your friends by clicking "New Group" and adding their User IDs! 👥✨`,
    `Beep boop! 🤖 I'm here 24/7 if you need to test messages, reactions, or voice notes!`
  ];
  const replyText = botResponses[Math.floor(Math.random() * botResponses.length)];
  const botMsg = {
    id: generateId('msg_bot'),
    chatId,
    senderId: 'chatterbot',
    senderName: 'Hub Bot 🤖',
    senderAvatar: 'avatar-robot',
    type: 'text',
    content: replyText,
    reactions: {},
    status: 'sent',
    readBy: ['chatterbot'],
    timestamp: new Date().toISOString()
  };
  db.messages.push(botMsg);
  saveDB();
  io.to(chatId).emit('new-message', botMsg);
}

// Find local IP address for sharing on Wi-Fi
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`\n======================================================`);
  console.log(`🌟 THE CHATTERS HUB SERVER IS RUNNING! 🌟`);
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`👉 Network: http://${localIp}:${PORT} (Open this on your friends' phones/laptops on same Wi-Fi!)`);
  console.log(`🔒 Privacy: 100% Anonymous with User IDs only! No phone/email needed.`);
  console.log(`======================================================\n`);
});
