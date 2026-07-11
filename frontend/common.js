(function () {
    const pageLinks = {
        Register: "../register_page/index.html",
        Edit: "../edit_page/index.html",
        Model: "../model_page/index.html",
        "Pass Print": "../print_page/index.html",
        "Admin Codes": "../admin_codes_page/index.html",
        Blacklist: "../blacklist_page/index.html",
    };

    function isLoginPage() {
        return window.location.pathname.replace(/\\/g, "/").includes("/login_page/");
    }

    function logout(event) {
        if (event) event.preventDefault();
        localStorage.clear();
        window.location.replace("../login_page/index.html");
    }

    function syncProfile() {
        const username = localStorage.getItem("username") || "Not signed in";
        const name = localStorage.getItem("name") || "Visitor Portal";
        const usernameEl = document.getElementById("profileUsername");
        const nameEl = document.getElementById("profileName");

        if (usernameEl) usernameEl.textContent = username;
        if (nameEl) nameEl.textContent = name;
    }

    function wireProfileMenu() {
        const profileWidget = document.getElementById("profileWidget");
        const profileToggle = document.getElementById("profileToggle");
        const profileMenu = document.getElementById("profileMenu");

        if (!profileToggle || !profileMenu) return;

        profileToggle.addEventListener("click", function (event) {
            event.stopPropagation();
            const isOpen = !profileMenu.hidden;
            profileMenu.hidden = isOpen;
            profileToggle.setAttribute("aria-expanded", String(!isOpen));
        });

        document.addEventListener("click", function (event) {
            if (profileWidget && profileWidget.contains(event.target)) return;
            profileMenu.hidden = true;
            profileToggle.setAttribute("aria-expanded", "false");
        });
    }

    function wireLogout() {
        document.getElementById("logoutButton")?.addEventListener("click", logout);
        document.getElementById("profileLogout")?.addEventListener("click", logout);
    }

    function wireNavigation() {
        document.querySelectorAll(".sidebar .menu-item").forEach(function (link) {
            const label = link.textContent.trim().replace(/\s+/g, " ");
            const target = pageLinks[label];
            if (target) {
                link.href = target;
            }
        });
    }

    function wireMobileSidebar() {
        const body = document.body;
        const sidebar = document.querySelector(".sidebar");
        const overlay = document.getElementById("sidebarOverlay");
        const topbarLeft = document.querySelector(".topbar__left");

        if (!sidebar || !topbarLeft || document.getElementById("sidebarToggle")) return;

        const button = document.createElement("button");
        button.type = "button";
        button.id = "sidebarToggle";
        button.className = "menu-toggle";
        button.setAttribute("aria-label", "Toggle sidebar");
        button.setAttribute("aria-expanded", "false");
        button.innerHTML = "<span></span><span></span><span></span>";
        topbarLeft.prepend(button);

        function closeSidebar() {
            body.classList.remove("sidebar-open");
            sidebar.classList.remove("is-open");
            if (overlay) {
                overlay.hidden = true;
                overlay.classList.remove("is-visible");
            }
            button.setAttribute("aria-expanded", "false");
        }

        button.addEventListener("click", function () {
            const isMobile = window.matchMedia("(max-width: 980px)").matches;
            if (!isMobile) {
                body.classList.toggle("sidebar-collapsed");
                return;
            }

            const isOpen = body.classList.contains("sidebar-open");
            body.classList.toggle("sidebar-open", !isOpen);
            sidebar.classList.toggle("is-open", !isOpen);
            if (overlay) {
                overlay.hidden = isOpen;
                overlay.classList.toggle("is-visible", !isOpen);
            }
            button.setAttribute("aria-expanded", String(!isOpen));
        });

        overlay?.addEventListener("click", closeSidebar);
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (!isLoginPage() && !localStorage.getItem("username")) {
            localStorage.clear();
            window.location.replace("../login_page/index.html");
            return;
        }

        syncProfile();
        wireNavigation();
        wireLogout();
        wireProfileMenu();
        wireMobileSidebar();
    });
})();
