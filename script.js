// 1. Narration Data
const narrations = [
  {
    label: "Family & Black Tax",
    text: "Gift / Family support",
    desc: "Money wey family send for feeding, school fees, or 'black tax'. Government no dey tax gift for Nigeria.",
  },
  {
    label: "Money Return",
    text: "Refund / Reimbursement",
    desc: "When friend pay you back money wey you borrow am or money for food. No be profit be this, so no tax.",
  },
  {
    label: "Self-Transfer",
    text: "Personal transfer / savings",
    desc: "If you move your own money from your GTB to your Kuda or OPay. No be new income, na your money still be that.",
  },
  {
    label: "Loan (Borrowed)",
    text: "Loan received",
    desc: "Money wey you borrow from person and you go pay back. Since na debt, government no fit tax am as income.",
  },
  {
    label: "Business Seed",
    text: "Capital contribution",
    desc: "When you carry your own personal savings start business or put money inside your shop account.",
  },
];

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const currentTheme = localStorage.getItem("theme") || "light";

// Apply saved theme on load
if (currentTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
  themeIcon.innerText = "☀️";
}

themeToggle.addEventListener("click", () => {
  let theme = document.documentElement.getAttribute("data-theme");
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
    themeIcon.innerText = "🌙";
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    themeIcon.innerText = "☀️";
  }
});
// --- 2. INITIALIZATION: Build the Narration Cards ---
function init() {
  const list = document.getElementById("narrationList");
  if (!list) return;

  narrations.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
            <div style="flex: 1; padding-right: 10px;">
                <div style="font-size:0.75rem; color:var(--green); font-weight:bold">${item.label.toUpperCase()}</div>
                <div style="font-size:1.05rem; font-weight:bold; margin: 4px 0;">"${
                  item.text
                }"</div>
                <div style="font-size:0.8rem; color:#666; line-height:1.4">${
                  item.desc
                }</div>
            </div>
            <button class="copy-btn" onclick="handleCopy('${
              item.text
            }')">Copy</button>
        `;
    list.appendChild(div);
  });
}

// --- 3. COPY LOGIC: Show Warning Once Per Device ---
function handleCopy(text) {
  const hasSeenWarning = localStorage.getItem("taxWarningSeen");

  if (hasSeenWarning) {
    // Already warned before; copy immediately
    performCopy(text);
  } else {
    // First time on this device; show the legal warning
    document.getElementById("warningModal").style.display = "block";
    window.pendingCopy = text;
  }
}

function closeModal() {
  document.getElementById("warningModal").style.display = "none";

  // Remember this device has seen the warning
  localStorage.setItem("taxWarningSeen", "true");

  if (window.pendingCopy) {
    performCopy(window.pendingCopy);
    window.pendingCopy = null;
  }
}

function performCopy(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast();
    })
    .catch((err) => {
      console.error("Could not copy text: ", err);
    });
}

function showToast() {
  const toast = document.getElementById("toast");
  if (toast) {
    toast.style.display = "block";
    setTimeout(() => (toast.style.display = "none"), 1500);
  }
}

// --- 4. CALCULATOR LOGIC: 2026 Progressive Bands ---
function calculateTax() {
  const monthlyGross =
    parseFloat(document.getElementById("monthlySalary").value) || 0;
  const monthlyRent =
    parseFloat(document.getElementById("monthlyRent").value) || 0;

  // Deductions: 8% Pension and 20% Rent (Capped at 500k/yr)
  const pension = monthlyGross * 0.08;
  const rentRelief = Math.min(monthlyRent, monthlyGross * 0.2, 41666);

  const taxableMonthly = Math.max(0, monthlyGross - pension - rentRelief);
  const taxableAnnual = taxableMonthly * 12;

  let annualTax = 0;
  let remaining = taxableAnnual;

  // Apply 2026 Bands (0% for first 800k, then 15%, 18%, 21%, 23%, 25%)
  if (remaining > 800000) {
    remaining -= 800000;

    const bands = [
      { limit: 2200000, rate: 0.15 },
      { limit: 9000000, rate: 0.18 },
      { limit: 13000000, rate: 0.21 },
      { limit: 25000000, rate: 0.23 },
      { limit: Infinity, rate: 0.25 },
    ];

    for (let band of bands) {
      if (remaining <= 0) break;
      let chunk = Math.min(remaining, band.limit);
      annualTax += chunk * band.rate;
      remaining -= chunk;
    }
  }

  const monthlyTax = annualTax / 12;
  updateUI(
    monthlyTax,
    monthlyGross,
    taxableAnnual <= 800000 ? "Exempt" : "Taxable"
  );
}

function updateUI(tax, gross, status) {
  document.getElementById("monthlyTax").innerText = `₦${tax.toLocaleString(
    undefined,
    { minimumFractionDigits: 2 }
  )}`;
  document.getElementById("netPay").innerText = `₦${(
    gross - tax
  ).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const statusEl = document.getElementById("taxStatus");
  statusEl.innerText = status;
  statusEl.className = status === "Exempt" ? "badge exempt" : "badge taxable";

  const notice = document.getElementById("complianceNotice");
  if (notice) notice.style.display = status === "Taxable" ? "block" : "none";
}

function openKunuModal() {
  document.getElementById("kunuModal").style.display = "block";
}
function closeKunu() {
  document.getElementById("kunuModal").style.display = "none";
}

function copyKunu() {
  const text = "Acc: 8037166842 (Moniepoint). Narration: Gift / Family support";
  performCopy(text);
  closeKunu();
}

function shareToWhatsapp() {
  const siteUrl = window.location.href; // This gets your current site link
  const message = `Check out this TaxSabi 2026 tool! It helps you calculate your new tax and gives you the right narrations to use for bank transfers so you no go pay tax for money wey no be profit. Check am here: ${siteUrl}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}

function showPage(pageId) {
  if (pageId === "home") {
    document.getElementById("homePage").style.display = "block";
    document.getElementById("aboutPage").style.display = "none";
    window.scrollTo(0, 0);
  } else if (pageId === "about") {
    document.getElementById("homePage").style.display = "none";
    document.getElementById("aboutPage").style.display = "block";
    window.scrollTo(0, 0);
  }
}

// Start everything
window.onload = init;
