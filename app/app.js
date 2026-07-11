const views = [...document.querySelectorAll(".app-view")];
const navButtons = [...document.querySelectorAll("[data-nav]")];
const bottomButtons = [...document.querySelectorAll(".bottom-nav button")];
const addSheet = document.querySelector("#add-sheet");

const details = {
  figma: {
    stage: "Interviewing",
    title: "Figma",
    role: "Product Designer",
    action: "Prepare portfolio story before Jul 16, 2:00 PM."
  },
  ramp: {
    stage: "Applied",
    title: "Ramp",
    role: "Design Systems",
    action: "Send recruiter follow-up and attach Resume v4."
  },
  linear: {
    stage: "Referral",
    title: "Linear",
    role: "Staff Designer",
    action: "Ping Aisha for referral context and hiring team notes."
  },
  airbnb: {
    stage: "Offer",
    title: "Airbnb",
    role: "Design Lead",
    action: "Compare offer against current role and prepare negotiation notes."
  }
};

function showView(name) {
  views.forEach((view) => {
    view.classList.toggle("active", view.id === `view-${name}`);
  });

  bottomButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === name);
  });

  document.querySelector(".phone-shell").scrollTo({ top: 0, behavior: "smooth" });
}

function openDetail(key) {
  const detail = details[key] || details.figma;
  document.querySelector("#detail-stage").textContent = detail.stage;
  document.querySelector("#detail-title").textContent = detail.title;
  document.querySelector("#detail-role").textContent = detail.role;
  document.querySelector("#detail-action").textContent = detail.action;
  showView("detail");
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.nav));
});

document.querySelectorAll("[data-detail]").forEach((button) => {
  button.addEventListener("click", () => openDetail(button.dataset.detail));
});

document.querySelectorAll("[data-open-add]").forEach((button) => {
  button.addEventListener("click", () => {
    if (typeof addSheet.showModal === "function") {
      addSheet.showModal();
    }
  });
});

document.querySelectorAll(".stage-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".stage-tabs button").forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");

    const stage = button.dataset.stage;
    document.querySelectorAll("[data-stage-card]").forEach((card) => {
      card.hidden = stage !== "all" && card.dataset.stageCard !== stage;
    });
  });
});
