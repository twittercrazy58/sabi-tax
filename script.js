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
  {
    label: "POS Operators",
    text: "POS transaction / Agent cashout",
    desc: "If you be agent, make customers use this so NRS sabi say the money no be your profit, na cash you dey swap.",
  },
  {
    label: "Sales / Trade",
    text: "Payment for [Item Name]",
    desc: "Be specific! E.g., 'Payment for 2 cartons of Indomie'. This clears your business records and stops double tax.",
  },
];

const LIMIT = 3;
const WINDOW_MS = 10 * 60 * 1000;

function updateQuotaUI() {
  const now = Date.now();
  let usage = JSON.parse(localStorage.getItem("sabitax_usage") || "[]");

  // 1. Clean up old timestamps first
  usage = usage.filter((timestamp) => now - timestamp < WINDOW_MS);

  // Save the cleaned list back to keep storage healthy
  localStorage.setItem("sabitax_usage", JSON.stringify(usage));

  const remaining = Math.max(0, LIMIT - usage.length);
  const percentage = (remaining / LIMIT) * 100;

  // 2. Update the UI Elements

  document.getElementById("quota-count").innerText = `${remaining}/${LIMIT}`;

  // Update Bar
  const fill = document.getElementById("quota-fill");
  fill.style.width = `${percentage}%`;

  // Update Colors based on remaining tries
  fill.classList.remove("quota-low", "quota-empty");
  if (remaining === 1) fill.classList.add("quota-low");
  if (remaining === 0) fill.classList.add("quota-empty");

  return { allowed: remaining > 0, usage, remaining };
}
// Initialize on page load
window.onload = updateQuotaUI;

async function processNarration() {
  const input = document.getElementById("narrationInput").value;
  const resultBox = document.getElementById("narrationResult");
  const checkBtn = document.getElementById("checkBtn");
  const text = resultBox.querySelector(".feedback-text");
  const standardElement = document.getElementById("standardNarration");

  if (input.length < 5) return;

  // 1. Check quota using the UI function's return value
  const quota = updateQuotaUI();

  if (!quota.allowed) {
    const oldestRequest = quota.usage[0];
    const waitTime = Math.ceil(
      (WINDOW_MS - (Date.now() - oldestRequest)) / 60000
    );

    text.innerHTML = `<b>Oga, slow down!</b> You don check 3 times already. Abeg wait <b>${waitTime} minutes</b>.`;
    resultBox.className = "narration-feedback status-warning";
    return;
  }

  // UI Loading State
  checkBtn.disabled = true;
  checkBtn.innerText = "Checking...";
  text.innerText = "SabiAI is looking into 2026 Tax Rules...";

  try {
    // We call our OWN Vercel API, not Google directly
    const response = await fetch("/api/check-narration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ narration: input }),
    });

    if (!response.ok) {
      // If the server returns 400, 500, etc., we throw an error
      // to skip the quota-saving logic below.
      throw new Error(`Server Error: ${response.status}`);
    }

    const data = await response.json();
    const fullResponse = data.text;

    const updatedUsage = [...quota.usage, Date.now()];
    localStorage.setItem("sabitax_usage", JSON.stringify(updatedUsage));
    updateQuotaUI();

    // Split for the Suggestion Card
    const parts = fullResponse.split("SUGGESTION:");
    const advicePart = parts[0].trim();
    const suggestionPart = parts[1]
      ? parts[1].trim()
      : "Payment - Jan 2026 - TIN:12345";

    // Update UI elements
    text.innerHTML = advicePart;
    if (standardElement) standardElement.innerText = suggestionPart;

    // Color feedback
    resultBox.className = fullResponse.includes("SAFE")
      ? "narration-feedback status-safe"
      : "narration-feedback status-warning";
  } catch (error) {
    console.log(error);
    text.innerText = "Connection issue. Try again later!";
  } finally {
    checkBtn.disabled = false;
    checkBtn.innerText = "Check Risk";
  }
}

// Copy Function
function copySuggestion() {
  const text = document.getElementById("standardNarration").innerText;
  navigator.clipboard.writeText(text);

  const toast = document.getElementById("toast");
  toast.style.display = "block";
  setTimeout(() => (toast.style.display = "none"), 1500);
}

window.processNarration = processNarration;
window.copySuggestion = copySuggestion;

// --- TAX LOGIC ---
function calculateTax() {
  const incomeInput =
    parseFloat(document.getElementById("salaryInput").value) || 0;
  const rentInput = parseFloat(document.getElementById("rentInput").value) || 0;
  const isAnnual = document.getElementById("incomeTypeToggle").checked;

  let annualIncome = isAnnual ? incomeInput : incomeInput * 12;
  let annualRent = isAnnual ? rentInput : rentInput * 12;

  if (annualIncome <= 800000) {
    updateUI(0, annualIncome, "Exempt", isAnnual);
    return;
  }

  let rentRelief = Math.min(annualRent * 0.2, 500000);
  let taxableIncome = annualIncome - 800000 - rentRelief;
  if (taxableIncome < 0) taxableIncome = 0;

  let annualTax = taxableIncome * 0.1; // Simple 2026 Base Rate
  updateUI(annualTax, annualIncome, "Taxable", isAnnual);
}

function updateUI(totalAnnualTax, totalAnnualIncome, status, isAnnual) {
  const taxToDisplay = isAnnual ? totalAnnualTax : totalAnnualTax / 12;
  const netToDisplay = isAnnual
    ? totalAnnualIncome - totalAnnualTax
    : (totalAnnualIncome - totalAnnualTax) / 12;

  document.getElementById(
    "monthlyTax"
  ).innerText = `₦${taxToDisplay.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
  document.getElementById("netPay").innerText = `₦${netToDisplay.toLocaleString(
    undefined,
    { maximumFractionDigits: 0 }
  )}`;

  const statusBadge = document.getElementById("taxStatus");
  statusBadge.innerText = status;
  statusBadge.className =
    "badge " + (status === "Exempt" ? "exempt" : "taxable");

  document.getElementById("complianceNotice").style.display =
    totalAnnualIncome > 5000000 ? "block" : "none";
}

// --- BANK FEE LOGIC ---
function calculateBankFees() {
  const amount =
    parseFloat(document.getElementById("withdrawalInput").value) || 0;
  const isBusiness = document.getElementById("accountTypeToggle").checked;
  const limit = isBusiness ? 5000000 : 500000;
  const feeRate = isBusiness ? 0.05 : 0.03;

  let penalty = amount > limit ? (amount - limit) * feeRate : 0;
  const el = document.getElementById("penaltyFee");
  el.innerText = `₦${penalty.toLocaleString()}`;
  el.style.color = penalty > 0 ? "#e63946" : "var(--green-main)";
}

// --- INITIALIZATION & GLOBAL MAPPING ---
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
  console.log("SabiTax Engine: Initialized 2026 Settings.");
}

window.processNarration = processNarration;

window.checkNarration =
  typeof checkNarration !== "undefined" ? checkNarration : () => {};
window.calculateTax = calculateTax;
window.calculateBankFees = calculateBankFees;
window.toggleIncomeType = () => {
  const isAnnual = document.getElementById("incomeTypeToggle").checked;
  document.getElementById("salaryLabel").innerText = isAnnual
    ? "Annual Salary (₦)"
    : "Monthly Salary (₦)";
  document.getElementById("rentLabel").innerText = isAnnual
    ? "Annual Rent (₦)"
    : "Monthly Rent (₦)";
  document.getElementById("resultTaxLabel").innerText = isAnnual
    ? "Annual Tax:"
    : "Monthly Tax:";
  document.getElementById("resultNetLabel").innerText = isAnnual
    ? "Annual Net Pay:"
    : "Monthly Net Pay:";
  calculateTax();
};
window.handleCopy = (text) => {
  if (localStorage.getItem("taxWarningSeen")) performCopy(text);
  else {
    document.getElementById("warningModal").style.display = "block";
    window.pendingCopy = text;
  }
};
window.closeModal = () => {
  document.getElementById("warningModal").style.display = "none";
  localStorage.setItem("taxWarningSeen", "true");
  if (window.pendingCopy) {
    performCopy(window.pendingCopy);
    window.pendingCopy = null;
  }
};
window.performCopy = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById("toast");
    toast.style.display = "block";
    setTimeout(() => (toast.style.display = "none"), 1500);
  });
};
window.showPage = (pageId) => {
  document.getElementById("homePage").style.display =
    pageId === "home" ? "block" : "none";
  document.getElementById("aboutPage").style.display =
    pageId === "about" ? "block" : "none";
  window.scrollTo(0, 0);
};
window.openKunuModal = () =>
  (document.getElementById("kunuModal").style.display = "block");
window.closeKunu = () =>
  (document.getElementById("kunuModal").style.display = "none");
window.shareToWhatsapp = () => {
  const msg = `Check out SabiTax 2026! It helps you calculate new tax and bank fees: ${window.location.href}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
};

// Start
init();
