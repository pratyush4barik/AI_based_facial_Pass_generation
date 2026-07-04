const API = "http://127.0.0.1:8000";

const tableBody = document.getElementById("editTableBody");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

// ================================
// Load Visitors
// ================================
async function loadVisitors(search = "") {
    try {
        const response = await fetch(
            `${API}/visitors?search=${encodeURIComponent(search)}`
        );

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const visitors = await response.json();

        tableBody.innerHTML = "";

        // If no records found
        if (visitors.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">
                        No visitors found.
                    </td>
                </tr>
            `;
            return;
        }

        // Populate table
        visitors.forEach(v => {
            const row = `
                <tr>
                    <td>${v.emp_id ?? "-"}</td>
                    <td>${v.full_name ?? "-"}</td>
                    <td>${v.aadhaar_number ?? "-"}</td>
                    <td>${v.edited_by ?? "-"}</td>
                    <td>
                        <button
                            class="btn-edit-pill"
                            onclick="editVisitor(${v.visitor_id})">
                            Edit
                        </button>
                    </td>
                </tr>
            `;

            tableBody.insertAdjacentHTML("beforeend", row);
        });

    } catch (error) {
        console.error("Error loading visitors:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:red;">
                    Failed to load visitors.
                </td>
            </tr>
        `;
    }
}

// ================================
// Edit Visitor
// ================================
function editVisitor(visitorId) {
    window.location.href =
        `../register_page/index.html?visitor_id=${visitorId}`;
}

// ================================
// Search as user types
// ================================
searchInput.addEventListener("input", () => {
    loadVisitors(searchInput.value.trim());
});

// ================================
// Search button
// ================================
searchBtn.addEventListener("click", () => {
    loadVisitors(searchInput.value.trim());
});

// ================================
// Search on Enter
// ================================
searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        loadVisitors(searchInput.value.trim());
    }
});

// ================================
// Load data on page load
// ================================
window.addEventListener("DOMContentLoaded", () => {
    loadVisitors();
});