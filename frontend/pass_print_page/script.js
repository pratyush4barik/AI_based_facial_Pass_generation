// ============================================================
// Print Page — Pass Preview Toggle & Badge Population Logic
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

    const passPreview = document.getElementById("passPreview");
    const badgeName = document.getElementById("badgeName");
    const badgeAppNo = document.getElementById("badgeAppNo");
    const badgeRole = document.getElementById("badgeRole");
    const badgeDate = document.getElementById("badgeDate");
    const barcodeText = document.getElementById("barcodeText");
    const confirmPrintBtn = document.getElementById("confirmPrintBtn");

    // All "Print" buttons in the table rows
    const printRowBtns = document.querySelectorAll(".btn-print-row");
    let activeBtn = null;

    printRowBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            const name = btn.getAttribute("data-name") || "—";
            const app = btn.getAttribute("data-app") || "—";
            const role = btn.getAttribute("data-role") || "—";

            // If clicking the same button again, toggle off
            if (activeBtn === btn && passPreview && !passPreview.hidden) {
                passPreview.hidden = true;
                btn.classList.remove("active-print");
                activeBtn = null;
                return;
            }

            // Deactivate previous button
            if (activeBtn) {
                activeBtn.classList.remove("active-print");
            }

            // Populate the badge
            if (badgeName) badgeName.textContent = name;
            if (badgeAppNo) badgeAppNo.textContent = app;
            if (badgeRole) badgeRole.textContent = role;
            if (badgeDate) {
                const today = new Date();
                badgeDate.textContent = today.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                });
            }
            if (barcodeText) barcodeText.textContent = app;

            // Show the preview
            if (passPreview) {
                passPreview.hidden = false;

                // Smooth scroll to preview
                setTimeout(function () {
                    passPreview.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }, 50);
            }

            btn.classList.add("active-print");
            activeBtn = btn;
        });
    });

    // Confirm & Print button
    if (confirmPrintBtn) {
        confirmPrintBtn.addEventListener("click", function () {
            // Placeholder — in production this would trigger window.print() or a backend call
            const appNo = badgeAppNo ? badgeAppNo.textContent : "";
            console.log("Confirm & Print triggered for: " + appNo);

            confirmPrintBtn.innerHTML = '<i class="fa-solid fa-check"></i> Sent to Printer';
            confirmPrintBtn.style.background = "#28a745";
            confirmPrintBtn.style.boxShadow = "0 8px 22px rgba(40, 167, 69, 0.2)";
            confirmPrintBtn.disabled = true;

            setTimeout(function () {
                confirmPrintBtn.innerHTML = '<i class="fa-solid fa-print"></i> Confirm & Print';
                confirmPrintBtn.style.background = "";
                confirmPrintBtn.style.boxShadow = "";
                confirmPrintBtn.disabled = false;
            }, 2000);
        });
    }
});
