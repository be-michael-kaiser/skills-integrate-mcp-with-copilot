document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginButton = document.getElementById("login-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModal = document.getElementById("close-login-modal");
  const profilePanel = document.getElementById("profile-panel");
  const profileName = document.getElementById("profile-name");
  const profileEmail = document.getElementById("profile-email");
  const authStatus = document.getElementById("auth-status");
  const logoutButton = document.getElementById("logout-button");

  const state = {
    token: localStorage.getItem("mergington_token"),
    user: JSON.parse(localStorage.getItem("mergington_user") || "null"),
  };

  function setMessage(text, kind = "info") {
    messageDiv.textContent = text;
    messageDiv.className = kind;
    messageDiv.classList.remove("hidden");

    window.clearTimeout(setMessage.timeoutId);
    setMessage.timeoutId = window.setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function authHeaders() {
    return state.token
      ? { Authorization: `Bearer ${state.token}` }
      : {};
  }

  function updateAuthUI() {
    const isLoggedIn = Boolean(state.user && state.token);

    loginButton.classList.toggle("hidden", isLoggedIn);
    profilePanel.classList.toggle("hidden", !isLoggedIn);

    if (isLoggedIn) {
      profileName.textContent = state.user.full_name || state.user.username;
      profileEmail.textContent = state.user.email || "Teacher account";
      authStatus.textContent = `Signed in as ${state.user.full_name || state.user.username}. You can manage registrations.`;
      authStatus.classList.add("success");
      authStatus.classList.remove("error");
    } else {
      authStatus.textContent = "Teacher login required to manage registrations.";
      authStatus.classList.remove("success");
      authStatus.classList.add("error");
    }
  }

  function toggleLoginModal(show) {
    loginModal.classList.toggle("hidden", !show);
    loginModal.setAttribute("aria-hidden", String(!show));
    if (show) {
      document.getElementById("username").focus();
    }
  }

  async function fetchActivities() {
    try {
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      const response = await fetch("/activities");
      const activities = await response.json();
      activitiesList.innerHTML = "";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${state.token ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.token) {
      setMessage("Please log in as a teacher before managing registrations.", "error");
      toggleLoginModal(true);
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginButton.addEventListener("click", () => toggleLoginModal(true));
  closeLoginModal.addEventListener("click", () => toggleLoginModal(false));
  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      toggleLoginModal(false);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const username = formData.get("username").toString().trim();
    const password = formData.get("password").toString();

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.detail || "Login failed.", "error");
        return;
      }

      state.token = result.token;
      state.user = result.user;
      localStorage.setItem("mergington_token", result.token);
      localStorage.setItem("mergington_user", JSON.stringify(result.user));
      toggleLoginModal(false);
      loginForm.reset();
      updateAuthUI();
      fetchActivities();
      setMessage(`Welcome, ${result.user.full_name || result.user.username}!`, "success");
    } catch (error) {
      setMessage("Unable to log in right now.", "error");
      console.error("Login error:", error);
    }
  });

  logoutButton.addEventListener("click", () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem("mergington_token");
    localStorage.removeItem("mergington_user");
    updateAuthUI();
    fetchActivities();
    setMessage("You have been logged out.", "info");
  });

  updateAuthUI();
  fetchActivities();
});
