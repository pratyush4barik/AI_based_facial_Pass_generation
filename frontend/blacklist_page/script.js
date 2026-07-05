const API_BASE_URL = "http://localhost:8000";
const ROW_LIMIT = 3000;

const REASONS = [
    "1 - Unauthorized entry attempt",
    "2 - Fake documentation submitted",
    "3 - Misconduct on premises",
    "4 - Violation of security protocols",
    "5 - Banned by management directive",
    "6 - Repeated policy violations"
];

document.addEventListener("DOMContentLoaded", function () {
    const topSearchInput = document.getElementById("topSearchInput");
    const topSearchBtn = document.getElementById("topSearchBtn");
    const topTableBody = document.getElementById("topTableBody");
    const bottomSearchInput = document.getElementById("bottomSearchInput");
    const bottomSearchBtn = document.getElementById("bottomSearchBtn");
    const bottomTableBody = document.getElementById("bottomTableBody");

    if (!topSearchInput || !topSearchBtn || !topTableBody || !bottomSearchInput || !bottomSearchBtn || !bottomTableBody) {
        return;
    }

    let visitorController = null;
    let blacklistController = null;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function setMessage(tableBody, message, colspan) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="table-message">${escapeHtml(message)}</td>
            </tr>
        `;
    }

    function getReasonText(reasonCode) {
        const code = String(reasonCode || "1");
        return REASONS.find(function (reason) {
            return reason.startsWith(`${code} -`);
        }) || code;
    }

    function getBlacklistedBy() {
        return Number(localStorage.getItem("admin_id") || localStorage.getItem("officer_id")) || null;
    }

    function getPhotoMarkup(visitor) {
        if (!visitor.photo_path) {
            return `
                <div class="image-placeholder" aria-label="Visitor photo">
                    <i class="fa-solid fa-image"></i>
                    <span>No Image</span>
                </div>
            `;
        }

        return `
            <div
                class="image-placeholder"
                aria-label="Visitor photo"
                data-photo-path="${escapeHtml(visitor.photo_path)}"
                data-photo-alt="${escapeHtml(visitor.full_name || "Visitor")} photo"
            >
                <i class="fa-solid fa-image"></i>
                <span>Photo</span>
            </div>
        `;
    }

    function renderVisitors(visitors) {
        if (!visitors.length) {
            setMessage(topTableBody, "No visitors found", 4);
            return;
        }

        topTableBody.innerHTML = visitors.map(function (visitor, index) {
            const rowId = `visitor_${visitor.visitor_id}`;
            const reasons = REASONS.map(function (reason) {
                return `<li>${escapeHtml(reason)}</li>`;
            }).join("");

            return `
                <tr class="bl-data-row row-enter" data-row-id="${escapeHtml(rowId)}" style="animation-delay: ${Math.min(index, 20) * 22}ms">
                    <td>${escapeHtml(visitor.emp_id || "-")}</td>
                    <td>${escapeHtml(visitor.full_name || "-")}</td>
                    <td>${escapeHtml(visitor.aadhaar_number || "-")}</td>
                    <td>
                        <button class="btn-pill btn-proceed" type="button" data-target="expandPane_${escapeHtml(rowId)}">Proceed</button>
                    </td>
                </tr>
                <tr class="expand-row" id="expandPane_${escapeHtml(rowId)}" hidden>
                    <td colspan="4">
                        <div class="expand-pane">
                            <div class="expand-left">
                                <h4 class="expand-label">Reason :-</h4>
                                <ul class="reason-list">${reasons}</ul>
                                <button class="btn-blacklist-action" type="button" data-emp-id="${escapeHtml(visitor.emp_id)}">
                                    <i class="fa-solid fa-ban"></i> Blacklist
                                </button>
                            </div>
                            <div class="expand-right">
                                ${getPhotoMarkup(visitor)}
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function renderBlacklist(entries) {
        if (!entries.length) {
            setMessage(bottomTableBody, "No blacklisted users found", 5);
            return;
        }

        bottomTableBody.innerHTML = entries.map(function (entry, index) {
            return `
                <tr class="row-enter" data-blacklist-id="${escapeHtml(entry.blacklist_id)}" style="animation-delay: ${Math.min(index, 20) * 22}ms">
                    <td>${escapeHtml(entry.emp_id || "-")}</td>
                    <td>${escapeHtml(entry.full_name || "-")}</td>
                    <td>${escapeHtml(entry.blacklisted_by || "-")}</td>
                    <td>${escapeHtml(entry.remarks || getReasonText(entry.reason_code))}</td>
                    <td>
                        <button class="btn-pill btn-remove" type="button" data-blacklist-id="${escapeHtml(entry.blacklist_id)}">Remove</button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function showLazyPhoto(targetRow) {
        const lazyPhoto = targetRow.querySelector("[data-photo-path]");
        if (!lazyPhoto) return;

        const img = document.createElement("img");
        img.className = "visitor-photo";
        img.src = `${API_BASE_URL}/${lazyPhoto.dataset.photoPath}`;
        img.alt = lazyPhoto.dataset.photoAlt || "Visitor photo";
        lazyPhoto.replaceWith(img);
    }

    function toggleExpand(btn) {
        const targetId = btn.getAttribute("data-target");
        const targetRow = document.getElementById(targetId);
        if (!targetRow) return;

        document.querySelectorAll("#topTableBody .expand-row").forEach(function (row) {
            if (row.id !== targetId) row.hidden = true;
        });

        document.querySelectorAll("#topTableBody .btn-proceed").forEach(function (button) {
            if (button !== btn) {
                button.textContent = "Proceed";
                button.classList.remove("btn-proceed--active");
            }
        });

        targetRow.hidden = !targetRow.hidden;
        btn.textContent = targetRow.hidden ? "Proceed" : "Close";
        btn.classList.toggle("btn-proceed--active", !targetRow.hidden);

        if (!targetRow.hidden) showLazyPhoto(targetRow);
    }

    async function loadVisitors() {
        const params = new URLSearchParams({
            search: topSearchInput.value.trim(),
            limit: String(ROW_LIMIT)
        });

        if (visitorController) visitorController.abort();
        visitorController = new AbortController();

        setMessage(topTableBody, "Loading visitors...", 4);

        try {
            const response = await fetch(`${API_BASE_URL}/visitors?${params.toString()}`, {
                signal: visitorController.signal
            });

            if (!response.ok) throw new Error("Unable to load visitors");

            renderVisitors(await response.json());
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error(error);
            setMessage(topTableBody, "Could not load visitors. Check that the backend is running.", 4);
        }
    }

    async function loadBlacklist() {
        const params = new URLSearchParams({
            search: bottomSearchInput.value.trim(),
            limit: String(ROW_LIMIT)
        });

        if (blacklistController) blacklistController.abort();
        blacklistController = new AbortController();

        setMessage(bottomTableBody, "Loading blacklisted users...", 5);

        try {
            const response = await fetch(`${API_BASE_URL}/blacklist?${params.toString()}`, {
                signal: blacklistController.signal
            });

            if (!response.ok) throw new Error("Unable to load blacklist");

            renderBlacklist(await response.json());
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error(error);
            setMessage(bottomTableBody, "Could not load blacklisted users. Check that the backend is running.", 5);
        }
    }

    async function addToBlacklist(button) {
        const empId = button.dataset.empId;
        if (!empId) return;

        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving';

        try {
            const response = await fetch(`${API_BASE_URL}/blacklist`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    emp_id: empId,
                    reason_code: "1",
                    remarks: getReasonText("1"),
                    blacklisted_by: getBlacklistedBy()
                })
            });

            if (!response.ok) throw new Error("Unable to blacklist visitor");

            button.innerHTML = '<i class="fa-solid fa-check"></i> Blacklisted';
            button.style.background = "#28a745";
            button.style.boxShadow = "0 6px 16px rgba(40, 167, 69, 0.2)";

            await Promise.all([loadVisitors(), loadBlacklist()]);
        } catch (error) {
            console.error(error);
            button.disabled = false;
            button.innerHTML = '<i class="fa-solid fa-ban"></i> Blacklist';
            alert("Could not blacklist this visitor. Please try again.");
        }
    }

    async function removeFromBlacklist(button) {
        const blacklistId = button.dataset.blacklistId;
        if (!blacklistId) return;

        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Removing';

        try {
            const response = await fetch(`${API_BASE_URL}/blacklist/${encodeURIComponent(blacklistId)}`, {
                method: "DELETE"
            });

            if (!response.ok) throw new Error("Unable to remove blacklist entry");

            await Promise.all([loadVisitors(), loadBlacklist()]);
        } catch (error) {
            console.error(error);
            button.disabled = false;
            button.innerHTML = "Remove";
            alert("Could not remove this blacklist entry. Please try again.");
        }
    }

    topSearchBtn.addEventListener("click", loadVisitors);
    topSearchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") loadVisitors();
    });

    bottomSearchBtn.addEventListener("click", loadBlacklist);
    bottomSearchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") loadBlacklist();
    });

    topTableBody.addEventListener("click", function (event) {
        const proceedButton = event.target.closest(".btn-proceed");
        if (proceedButton) {
            toggleExpand(proceedButton);
            return;
        }

        const blacklistButton = event.target.closest(".btn-blacklist-action");
        if (blacklistButton) addToBlacklist(blacklistButton);
    });

    bottomTableBody.addEventListener("click", function (event) {
        const removeButton = event.target.closest(".btn-remove");
        if (removeButton) removeFromBlacklist(removeButton);
    });

    loadVisitors();
    loadBlacklist();
});
