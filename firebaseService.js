/**
 * Firebase Firestore Integration for The Chatters Hub
 * Connected to project: chatters-hub-123a8
 */

const firebaseConfig = {
  apiKey: "AIzaSyCWAL20nVI70bM6vq48AMfG08sLHnTiSRg",
  authDomain: "chatters-hub-123a8.firebaseapp.com",
  projectId: "chatters-hub-123a8",
  storageBucket: "chatters-hub-123a8.firebasestorage.app",
  messagingSenderId: "395518496078",
  appId: "1:395518496078:web:b014dcbcf3a6963190621f",
  measurementId: "G-1VMSHYBHE6"
};

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const KEY_PARAM = `?key=${firebaseConfig.apiKey}`;

// Helper: Convert JS value to Firestore Field Value
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue)
      }
    };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Helper: Convert JS object to Firestore Document fields
function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return { fields };
}

// Helper: Convert Firestore Document back to JS value
function fromFirestoreValue(val) {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const result = {};
    const f = val.mapValue.fields || {};
    for (const [k, v] of Object.entries(f)) {
      result[k] = fromFirestoreValue(v);
    }
    return result;
  }
  return null;
}

function fromFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const result = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    result[k] = fromFirestoreValue(v);
  }
  return result;
}

// Write/Upsert a document in Firestore
async function setDocument(collection, docId, data) {
  try {
    const url = `${BASE_URL}/${collection}/${encodeURIComponent(docId)}${KEY_PARAM}`;
    const body = JSON.stringify(toFirestoreFields(data));
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[Firebase] Save to ${collection}/${docId} warning:`, err);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[Firebase] Network error writing to ${collection}/${docId}:`, err.message);
    return false;
  }
}

// Get all documents in a collection
async function getCollection(collection) {
  try {
    const url = `${BASE_URL}/${collection}${KEY_PARAM}&pageSize=300`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map(fromFirestoreDoc).filter(Boolean);
  } catch (err) {
    console.warn(`[Firebase] Network error fetching ${collection}:`, err.message);
    return [];
  }
}

// Sync entities to Firebase
async function syncUser(user) {
  if (!user || !user.userId) return;
  // Exclude sensitive password hash from public Firebase if desired, or keep synced
  return setDocument('users', user.userId, user);
}

async function syncChat(chat) {
  if (!chat || !chat.id) return;
  return setDocument('chats', chat.id, chat);
}

async function syncMessage(msg) {
  if (!msg || !msg.id) return;
  return setDocument('messages', msg.id, msg);
}

async function syncStory(story) {
  if (!story || !story.id) return;
  return setDocument('stories', story.id, story);
}

// Sync full database to Firebase Firestore
async function syncAllToFirebase(db) {
  console.log('🔥 [Firebase] Starting database sync to Cloud Firestore...');
  let userCount = 0, chatCount = 0, msgCount = 0, storyCount = 0;

  if (db.users && Array.isArray(db.users)) {
    for (const u of db.users) {
      if (await syncUser(u)) userCount++;
    }
  }

  if (db.chats && Array.isArray(db.chats)) {
    for (const c of db.chats) {
      if (await syncChat(c)) chatCount++;
    }
  }

  if (db.messages && Array.isArray(db.messages)) {
    for (const m of db.messages) {
      if (await syncMessage(m)) msgCount++;
    }
  }

  if (db.stories && Array.isArray(db.stories)) {
    for (const s of db.stories) {
      if (await syncStory(s)) storyCount++;
    }
  }

  console.log(`🔥 [Firebase] Synced to Cloud Firestore successfully: ${userCount} users, ${chatCount} chats, ${msgCount} messages, ${storyCount} stories!`);
}

module.exports = {
  firebaseConfig,
  setDocument,
  getCollection,
  syncUser,
  syncChat,
  syncMessage,
  syncStory,
  syncAllToFirebase
};
