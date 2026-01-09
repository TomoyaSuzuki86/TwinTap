import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  limit,
  query,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const FAMILY_CODE_LENGTH = 6;
const JOIN_TOKEN_LENGTH = 32;

function randomChars(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function randomToken(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function getUserFamilyId(db, uid) {
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) {
    return null;
  }
  return userSnap.data().familyId || null;
}

export async function createFamily(db, uid) {
  const now = Date.now();
  const familyCode = randomChars(FAMILY_CODE_LENGTH);
  const joinToken = randomToken(JOIN_TOKEN_LENGTH);
  const familyDoc = await addDoc(collection(db, "families"), {
    createdAt: now,
    updatedAt: now,
    familyCode,
    joinToken,
    babyNames: { left: "いのちゃん", right: "ふーちゃん" },
  });

  await setDoc(doc(db, "families", familyDoc.id, "members", uid), {
    joinedAt: now,
    role: "member",
    joinToken,
  });

  await setDoc(doc(db, "users", uid), { familyId: familyDoc.id });

  return { familyId: familyDoc.id, familyCode, joinToken };
}

export async function joinFamily(db, uid, familyId, token) {
  const now = Date.now();
  await setDoc(doc(db, "families", familyId, "members", uid), {
    joinedAt: now,
    role: "member",
    joinToken: token,
  });
  await setDoc(doc(db, "users", uid), { familyId });
  const snap = await getDoc(doc(db, "families", familyId));
  if (!snap.exists()) {
    throw new Error("family-not-found");
  }
  return snap.data();
}

export async function clearUserFamily(db, uid) {
  await setDoc(doc(db, "users", uid), { familyId: null });
}

export async function updateBabyNames(db, familyId, names) {
  await updateDoc(doc(db, "families", familyId), {
    babyNames: names,
    updatedAt: Date.now(),
  });
}

export async function addEvent(db, familyId, baby, uid) {
  await addDoc(collection(db, "families", familyId, "events"), {
    ts: Date.now(),
    baby,
    createdBy: uid,
  });
}

export async function addSession(db, familyId, session, uid) {
  await addDoc(collection(db, "families", familyId, "sessions"), {
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationSec: session.durationSec,
    targetCount: session.targetCount,
    baby: session.baby,
    createdBy: uid,
  });
}

export function subscribeFamily(db, familyId, onUpdate) {
  return onSnapshot(doc(db, "families", familyId), (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data());
    }
  });
}

export function subscribeSessions(db, familyId, onUpdate) {
  const sessionQuery = query(
    collection(db, "families", familyId, "sessions"),
    orderBy("endedAt", "desc"),
    limit(60)
  );
  return onSnapshot(sessionQuery, (snap) => {
    const sessions = [];
    snap.forEach((docSnap) => {
      sessions.push({ id: docSnap.id, ...docSnap.data() });
    });
    onUpdate(sessions);
  });
}

