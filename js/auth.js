const DEMO_USERS = [
  {
    email: "admin@thrindia.demo",
    password: "Demo@THR2026",
    name: "Priya Sharma",
    role: "Admin",
  },
  {
    email: "agent@thrindia.demo",
    password: "Agent@THR2026",
    name: "Rahul Mehta",
    role: "Travel Agent",
  },
  {
    email: "guest@thrindia.demo",
    password: "Guest@THR2026",
    name: "Ananya Iyer",
    role: "Guest",
  },
];

const SESSION_KEY = "thr-demo-session";

function saveSession(user) {
  const session = {
    email: user.email,
    name: user.name,
    role: user.role,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.replace("index.html");
  }
  return session;
}

function authenticate(email, password) {
  return DEMO_USERS.find(
    (user) =>
      user.email.toLowerCase() === email.trim().toLowerCase() &&
      user.password === password
  );
}
