function showLogin() {
  document.getElementById("login-view").classList.remove("hidden");
  document.getElementById("login-view").hidden = false;
  document.getElementById("dashboard-view").classList.add("hidden");
  document.getElementById("dashboard-view").hidden = true;
  document.body.className = "";
}

function showDashboard(session) {
  document.getElementById("login-view").classList.add("hidden");
  document.getElementById("login-view").hidden = true;
  document.getElementById("dashboard-view").classList.remove("hidden");
  document.getElementById("dashboard-view").hidden = false;
  document.body.className = "app-shell";

  document.getElementById("welcome").textContent = session.name;
  document.getElementById("role").textContent = session.role;
  document.getElementById("headline").textContent = `Welcome, ${session.name}`;
  const copy = {
    Admin: "You have full demo access to packages, agents, and reports.",
    "Travel Agent": "You can browse B2B rates and sample itineraries.",
    Guest: "You can view published holiday packages.",
  };
  document.getElementById("summary").textContent =
    copy[session.role] || "You are signed in to the THR demo portal.";
}

function restoreSession() {
  const session = getSession();
  if (session) {
    showDashboard(session);
  } else {
    showLogin();
  }
}

document.getElementById("login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const user = authenticate(email, password);
  const errorEl = document.getElementById("login-error");

  if (!user) {
    errorEl.textContent = "Invalid demo credentials. Use an account from the list.";
    return;
  }

  errorEl.textContent = "";
  showDashboard(saveSession(user));
});

document.querySelectorAll(".use-account").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("email").value = button.dataset.email;
    document.getElementById("password").value = button.dataset.password;
    document.getElementById("login-error").textContent = "";
    document.getElementById("email").focus();
  });
});

document.getElementById("logout").addEventListener("click", () => {
  clearSession();
  document.getElementById("login-form").reset();
  document.getElementById("login-error").textContent = "";
  showLogin();
});

restoreSession();
