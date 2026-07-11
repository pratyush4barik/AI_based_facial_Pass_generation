const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", function () {
    const statusText = document.getElementById("statusText");
    const statusDot = document.querySelector(".status-dot");
    const cameraFeed = document.getElementById("cameraFeed");
    const cameraStream = document.getElementById("cameraStream");
    const checkedInTableBody = document.getElementById("checkedInTableBody");
    const printingQueueTableBody = document.getElementById("printingQueueTableBody");
    const durationModal = document.getElementById("durationModal");
    const durationVisitorText = document.getElementById("durationVisitorText");
    const durationHoursInput = document.getElementById("durationHoursInput");
    const confirmDurationBtn = document.getElementById("confirmDurationBtn");
    const cancelDurationBtn = document.getElementById("cancelDurationBtn");

    let pendingVisitor = null;
    let modalOpen = false;
    let lastPromptedVisitorId = null;
    let detecting = false;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function setStatus(message, state) {
        if (statusText) statusText.textContent = message;
        if (!statusDot) return;

        const color = state === "ok" ? "#22c55e" : state === "warn" ? "#f59e0b" : "#ef4444";
        statusDot.style.background = color;
        if (statusText) statusText.style.color = color;
    }

    async function readJsonResponse(response) {
        try {
            return await response.json();
        } catch {
            return {};
        }
    }

    function formatDetectionError(error) {
        const message = String(error?.message || "").trim();
        if (!message || message === "Failed to fetch") return "API OFFLINE";
        if (message.toLowerCase().includes("webcam") || message.toLowerCase().includes("camera")) {
            return message.toUpperCase();
        }
        return `API ERROR: ${message}`;
    }

    function setupCameraPreview() {
        if (!cameraFeed || !cameraStream) return;

        cameraStream.addEventListener("load", function () {
            cameraFeed.classList.add("stream-ready");
        });

        cameraStream.addEventListener("error", function () {
            cameraFeed.classList.remove("stream-ready");
            setStatus("CAMERA FEED OFFLINE", "error");
        });
    }

    function setTableMessage(tableBody, message) {
        if (!tableBody) return;
        tableBody.innerHTML = `
            <tr>
                <td colspan="2" class="table-message">${escapeHtml(message)}</td>
            </tr>
        `;
    }

    function formatTime(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function openDurationModal(visitor) {
        pendingVisitor = visitor;
        modalOpen = true;
        lastPromptedVisitorId = visitor.visitor_id;

        if (durationVisitorText) {
            durationVisitorText.textContent = `${visitor.emp_id} - ${visitor.full_name || "Visitor"}`;
        }

        if (durationHoursInput) {
            durationHoursInput.value = "1";
            setTimeout(() => durationHoursInput.focus(), 50);
        }

        if (durationModal) {
            durationModal.classList.add("show");
            durationModal.setAttribute("aria-hidden", "false");
        }
    }

    function closeDurationModal() {
        pendingVisitor = null;
        modalOpen = false;
        if (durationModal) {
            durationModal.classList.remove("show");
            durationModal.setAttribute("aria-hidden", "true");
        }
    }

    async function detectOnce() {
        if (detecting || modalOpen) return;

        detecting = true;
        try {
            const response = await fetch(`${API_BASE_URL}/model/detect`, {
                method: "POST"
            });

            const result = await readJsonResponse(response);
            if (!response.ok) throw new Error(result.detail || "Detection failed.");

            if (result.status === "matched" && result.visitor) {
                setStatus(`MATCHED ${result.visitor.emp_id}`, "ok");
                if (lastPromptedVisitorId !== result.visitor.visitor_id) {
                    openDurationModal(result.visitor);
                }
                return;
            }

            if (result.status === "spoof") {
                setStatus("SPOOF DETECTED", "error");
                lastPromptedVisitorId = null;
                return;
            }

            if (result.status === "unknown") {
                setStatus("UNKNOWN LIVE FACE", "warn");
                lastPromptedVisitorId = null;
                return;
            }

            setStatus("WAITING FOR FACE", "warn");
            lastPromptedVisitorId = null;
        } catch (error) {
            console.error(error);
            setStatus(formatDetectionError(error), "error");
        } finally {
            detecting = false;
        }
    }

    async function createPassSession() {
        if (!pendingVisitor || !durationHoursInput) return;

        const durationHours = Number(durationHoursInput.value);
        if (!Number.isFinite(durationHours) || durationHours <= 0) {
            durationHoursInput.reportValidity();
            return;
        }

        confirmDurationBtn.disabled = true;
        confirmDurationBtn.textContent = "Saving...";

        try {
            const response = await fetch(`${API_BASE_URL}/model/pass-sessions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    visitor_id: pendingVisitor.visitor_id,
                    duration_hours: durationHours
                })
            });

            const result = await readJsonResponse(response);
            if (!response.ok) throw new Error(result.detail || "Unable to start pass session.");

            closeDurationModal();
            await Promise.all([loadPassSessions(), loadPrintQueue()]);
        } catch (error) {
            console.error(error);
            alert(error.message || "Unable to start pass session.");
        } finally {
            confirmDurationBtn.disabled = false;
            confirmDurationBtn.textContent = "Start Pass";
        }
    }

    async function loadPassSessions() {
        if (!checkedInTableBody) return;

        try {
            const response = await fetch(`${API_BASE_URL}/model/pass-sessions`);
            if (!response.ok) throw new Error("Unable to load active passes.");

            const sessions = await response.json();
            if (!sessions.length) {
                setTableMessage(checkedInTableBody, "No active passed users.");
                return;
            }

            checkedInTableBody.innerHTML = sessions.map((session, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <strong>${escapeHtml(session.emp_id)}</strong>
                        <small class="row-meta">${escapeHtml(session.full_name || "")} until ${escapeHtml(formatTime(session.expires_at))}</small>
                    </td>
                </tr>
            `).join("");
        } catch (error) {
            console.error(error);
            setTableMessage(checkedInTableBody, "Could not load active passes.");
        }
    }

    async function loadPrintQueue() {
        if (!printingQueueTableBody) return;

        try {
            const response = await fetch(`${API_BASE_URL}/model/print-queue`);
            if (!response.ok) throw new Error("Unable to load print queue.");

            const queue = await response.json();
            if (!queue.length) {
                setTableMessage(printingQueueTableBody, "Print queue is empty.");
                return;
            }

            printingQueueTableBody.innerHTML = queue.map((entry, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <strong>${escapeHtml(entry.emp_id)}</strong>
                        <small class="row-meta">${escapeHtml(entry.full_name || "")} printing...</small>
                    </td>
                </tr>
            `).join("");
        } catch (error) {
            console.error(error);
            setTableMessage(printingQueueTableBody, "Could not load print queue.");
        }
    }

    confirmDurationBtn?.addEventListener("click", createPassSession);
    cancelDurationBtn?.addEventListener("click", closeDurationModal);
    durationModal?.addEventListener("click", function (event) {
        if (event.target === durationModal) closeDurationModal();
    });

    setupCameraPreview();
    setStatus("WAITING FOR FACE", "warn");
    loadPassSessions();
    loadPrintQueue();
    setInterval(detectOnce, 2500);
    setInterval(loadPassSessions, 3000);
    setInterval(loadPrintQueue, 1000);
});
