const API_BASE_URL = "http://localhost:8000";
const ROW_LIMIT = 3000;

document.addEventListener("DOMContentLoaded", function () {
    const printSearchInput = document.getElementById("printSearchInput");
    const filterDropdown = document.getElementById("filterDropdown");
    const printTableBody = document.getElementById("printTableBody");
    const passPreview = document.getElementById("passPreview");
    const badgeName = document.getElementById("badgeName");
    const badgeAppNo = document.getElementById("badgeAppNo");
    const badgeRole = document.getElementById("badgeRole");
    const badgeDate = document.getElementById("badgeDate");
    const badgePhoto = document.getElementById("badgePhoto");
    const confirmPrintBtn = document.getElementById("confirmPrintBtn");

    if (!printSearchInput || !printTableBody || !passPreview) {
        return;
    }

    let visitorsController = null;
    let activeVisitorId = null;
    let searchTimer = null;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function setMessage(message) {
        printTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="table-message">${escapeHtml(message)}</td>
            </tr>
        `;
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatValidity(visitor) {
        const from = formatDate(visitor.validity_from);
        const to = formatDate(visitor.validity_to);

        if (from === "-" && to === "-") return "-";
        if (from === "-") return to;
        if (to === "-") return from;
        return `${from} to ${to}`;
    }

    function renderPhoto(visitor) {
        if (!badgePhoto) return;

        if (visitor.photo_path) {
            badgePhoto.innerHTML = `
                <img
                    class="badge-photo-img"
                    src="${API_BASE_URL}/${escapeHtml(visitor.photo_path)}"
                    alt="${escapeHtml(visitor.full_name || "Visitor")} photo"
                >
            `;
            return;
        }

        badgePhoto.innerHTML = `
            <i class="fa-solid fa-user"></i>
            <span>Photo</span>
        `;
    }

    function resetPrintButton() {
        if (!confirmPrintBtn) return;

        confirmPrintBtn.innerHTML = '<i class="fa-solid fa-print"></i> Confirm & Print';
        confirmPrintBtn.style.background = "";
        confirmPrintBtn.style.boxShadow = "";
        confirmPrintBtn.disabled = false;
    }

    function renderVisitors(visitors) {
        visitors = applyDateFilter(visitors);

        if (!visitors.length) {
            setMessage("No visitors found");
            passPreview.hidden = true;
            activeVisitorId = null;
            return;
        }

        printTableBody.innerHTML = visitors.map(function (visitor, index) {
            return `
                <tr class="print-row row-enter" data-visitor-id="${escapeHtml(visitor.visitor_id)}" style="animation-delay: ${Math.min(index, 20) * 22}ms">
                    <td>${escapeHtml(visitor.emp_id || "-")}</td>
                    <td>${escapeHtml(visitor.full_name || "-")}</td>
                    <td>${escapeHtml(visitor.aadhaar_number || "-")}</td>
                    <td>
                        <button class="btn-print-row" type="button" data-visitor-id="${escapeHtml(visitor.visitor_id)}">
                            <i class="fa-solid fa-print"></i> Print
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function applyDateFilter(visitors) {
        if (!filterDropdown || filterDropdown.value === "all") {
            return visitors;
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

        return visitors.filter(function (visitor) {
            const createdAt = new Date(visitor.created_at);
            if (Number.isNaN(createdAt.getTime())) return false;

            if (filterDropdown.value === "today") {
                return createdAt >= startOfToday;
            }

            if (filterDropdown.value === "week") {
                return createdAt >= startOfWeek;
            }

            return true;
        });
    }

    async function loadVisitors() {
        const params = new URLSearchParams({
            search: printSearchInput.value.trim(),
            limit: String(ROW_LIMIT)
        });

        if (visitorsController) visitorsController.abort();
        visitorsController = new AbortController();

        setMessage("Loading visitors...");

        try {
            const response = await fetch(`${API_BASE_URL}/visitors?${params.toString()}`, {
                signal: visitorsController.signal
            });

            if (!response.ok) throw new Error("Unable to load visitors");

            renderVisitors(await response.json());
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error(error);
            setMessage("Could not load visitors. Check that the backend is running.");
        }
    }

    async function showPassPreview(button) {
        const visitorId = button.dataset.visitorId;
        if (!visitorId) return;

        if (activeVisitorId === visitorId && !passPreview.hidden) {
            passPreview.hidden = true;
            button.classList.remove("active-print");
            activeVisitorId = null;
            return;
        }

        document.querySelectorAll(".btn-print-row").forEach(function (printButton) {
            printButton.classList.remove("active-print");
        });

        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading';

        try {
            const response = await fetch(`${API_BASE_URL}/visitors/${encodeURIComponent(visitorId)}`);
            if (!response.ok) throw new Error("Unable to load visitor");

            const visitor = await response.json();

            if (badgeName) badgeName.textContent = visitor.full_name || "-";
            if (badgeAppNo) badgeAppNo.textContent = visitor.emp_id || "-";
            if (badgeRole) badgeRole.textContent = visitor.category || visitor.purpose || "Visitor";
            if (badgeDate) badgeDate.textContent = formatValidity(visitor);
            renderPhoto(visitor);
            resetPrintButton();

            passPreview.hidden = false;
            button.classList.add("active-print");
            activeVisitorId = visitorId;

            setTimeout(function () {
                passPreview.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 50);
        } catch (error) {
            console.error(error);
            alert("Could not load this visitor pass. Please try again.");
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fa-solid fa-print"></i> Print';
        }
    }

    printSearchInput.addEventListener("input", function () {
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(loadVisitors, 250);
    });

    printSearchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            window.clearTimeout(searchTimer);
            loadVisitors();
        }
    });

    if (filterDropdown) {
        filterDropdown.addEventListener("change", loadVisitors);
    }

    printTableBody.addEventListener("click", function (event) {
        const printButton = event.target.closest(".btn-print-row");
        if (printButton) showPassPreview(printButton);
    });

    if (confirmPrintBtn) {
        confirmPrintBtn.addEventListener("click", function () {
            window.print();

            confirmPrintBtn.innerHTML = '<i class="fa-solid fa-check"></i> Sent to Printer';
            confirmPrintBtn.style.background = "#28a745";
            confirmPrintBtn.style.boxShadow = "0 8px 22px rgba(40, 167, 69, 0.2)";
            confirmPrintBtn.disabled = true;

            setTimeout(resetPrintButton, 2000);
        });
    }

    loadVisitors();
});
