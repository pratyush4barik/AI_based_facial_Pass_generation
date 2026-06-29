if (!localStorage.getItem("username")) {
    localStorage.clear();
    window.location.replace("../login_page/index.html");
}

document.addEventListener("DOMContentLoaded", initRegisterPage);

function initRegisterPage() {
    const body = document.body;
    const app = document.getElementById("appRoot");
    const sidebar = document.querySelector(".sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const profileWidget = document.getElementById("profileWidget");
    const profileToggle = document.getElementById("profileToggle");
    const profileMenu = document.getElementById("profileMenu");
    const profileUsername = document.getElementById("profileUsername");
    const profileName = document.getElementById("profileName");
    const profileLogout = document.getElementById("profileLogout");
    const logoutButton = document.getElementById("logoutButton");
    const form = document.getElementById("visitorForm");
    const toast = document.getElementById("successToast");
    const photoPreview = document.getElementById("photoPreview");
    const takePhotoButton = document.getElementById("takePhotoButton");
    const uploadPhotoButton = document.getElementById("uploadPhotoButton");
    const removePhotoButton = document.getElementById("removePhotoButton");
    const cameraInput = document.getElementById("cameraInput");
    const uploadInput = document.getElementById("uploadInput");
    const resetButton = document.getElementById("resetButton");
    const successModal = document.getElementById("successModal");
    const closeModalButton = document.getElementById("closeModal");
    const okBtn = document.getElementById("okBtn");
    const visitorName = document.getElementById("visitorName");
    const employeeId = document.getElementById("employeeId");
    const address = document.getElementById("address");
    const company = document.getElementById("company");
    const aadhaarNumber = document.getElementById("aadhaarNumber");
    const phoneNumber = document.getElementById("phoneNumber");
    const purpose = document.getElementById("purpose");
    const department = document.getElementById("department");
    const category = document.getElementById("category");
    const verification = document.getElementById("verification");
    const duration = document.getElementById("duration");
    const validityFrom = document.getElementById("validityFrom");
    const validityTo = document.getElementById("validityTo");
    const gender = document.getElementById("gender");
    const nationality = document.getElementById("nationality");
    const fields = {
        visitorName,
        employeeId,
        address,
        company,
        aadhaarNumber,
        phoneNumber,
        purpose,
        department,
        category,
        verification,
        duration,
        validityFrom,
        validityTo,
        gender,
        nationality,
    };

    const requiredFieldList = Object.values(fields).filter(Boolean);
    const placeholderPhoto = photoPreview ? photoPreview.src : "";
    const todayIso = getTodayIso();

    let toastTimer = null;

    setInputDateBounds(validityFrom, validityTo, todayIso);
    syncProfileHeader();

    if (photoPreview && placeholderPhoto) {
        photoPreview.src = placeholderPhoto;
    }

    const menuToggle = ensureMobileMenuToggle(app, sidebar);

    safeAddEventListener(menuToggle, "click", toggleSidebar);
    safeAddEventListener(sidebarOverlay, "click", closeSidebar);
    safeAddEventListener(profileToggle, "click", toggleProfileMenu);
    safeAddEventListener(logoutButton, "click", handleLogout);
    safeAddEventListener(takePhotoButton, "click", () => cameraInput?.click());
    safeAddEventListener(uploadPhotoButton, "click", () => uploadInput?.click());
    safeAddEventListener(removePhotoButton, "click", removePhoto);
    safeAddEventListener(cameraInput, "change", (event) => handlePhotoChange(event));
    safeAddEventListener(uploadInput, "change", (event) => handlePhotoChange(event));
    safeAddEventListener(resetButton, "click", (event) => {
        event.preventDefault();
        resetForm();
    });
    safeAddEventListener(closeModalButton, "click", handleSuccessClose);
    safeAddEventListener(okBtn, "click", handleSuccessClose);
    safeAddEventListener(validityFrom, "change", () => handleValidityChange(validityFrom, validityTo, todayIso));
    safeAddEventListener(validityTo, "change", () => handleValidityChange(validityFrom, validityTo, todayIso));
    safeAddEventListener(document, "click", handleDocumentClick);
    safeAddEventListener(form, "submit", handleFormSubmit);
    safeAddEventListener(phoneNumber, "input", () => clearFieldValidity(phoneNumber));
    safeAddEventListener(aadhaarNumber, "input", () => clearFieldValidity(aadhaarNumber));

    function handleDocumentClick(event) {
        if (profileWidget && !profileWidget.contains(event.target)) {
            closeProfileMenu();
        }

        const clickedMenuToggle = menuToggle ? menuToggle.contains(event.target) : false;

        if (body.classList.contains("sidebar-open") && sidebar && !sidebar.contains(event.target) && !clickedMenuToggle) {
            closeSidebar();
        }
    }

    function handleSuccessClose() {
        hideSuccessModal();
        resetForm();
    }

    function handleLogout(event) {
        event.preventDefault();

        console.log("Logout function called");

        localStorage.clear();

        window.location.replace("../login_page/index.html");
}
    }
    function handlePhotoChange(event) {
        const input = event.target;
        const file = input && input.files ? input.files[0] : null;

        if (!file || !photoPreview) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            photoPreview.src = String(reader.result);
        };
        reader.readAsDataURL(file);
    }

    function removePhoto() {
        if (photoPreview && placeholderPhoto) {
            photoPreview.src = placeholderPhoto;
        }

        if (cameraInput) {
            cameraInput.value = "";
        }

        if (uploadInput) {
            uploadInput.value = "";
        }
    }

    function resetForm() {
        if (!form) {
            return;
        }

        form.reset();
        removePhoto();
        setInputDateBounds(validityFrom, validityTo, todayIso);
        clearValidationState();
        clearToast();
    }

    function handleValidityChange(startInput, endInput, minDate) {
        if (!startInput || !endInput) {
            return;
        }

        endInput.min = startInput.value || minDate;

        if (startInput.value && endInput.value && endInput.value < startInput.value) {
            endInput.setCustomValidity("Validity To must be on or after Validity From.");
        } else {
            endInput.setCustomValidity("");
        }
    }

    function handleFormSubmit(event) {
        event.preventDefault();

        if (!validateForm()) {
            showToast("Please complete the highlighted fields.", "error");
            return;
        }

        submitVisitorForm().catch(() => {
            showToast("Unable to save visitor.", "error");
        });
    }

    async function submitVisitorForm() {
        const visitorData = {
            full_name: visitorName ? visitorName.value.trim() : "",
            emp_id: employeeId ? employeeId.value.trim() : "",
            address: address ? address.value.trim() : "",
            company_firm: company ? company.value.trim() : "",
            aadhaar_number: aadhaarNumber ? aadhaarNumber.value.trim() : "",
            phone: phoneNumber ? phoneNumber.value.trim() : "",
            purpose: purpose ? purpose.value.trim() : "",
            department: department ? department.value.trim() : "",
            category: category ? category.value.trim() : "",
            police_verification_no: verification ? verification.value.trim() : "",
            duration: duration ? duration.value.trim() : "",
            validity_from: validityFrom ? validityFrom.value : "",
            validity_to: validityTo ? validityTo.value : "",
            gender: gender ? gender.value.trim() : "",
            nationality: nationality ? nationality.value.trim() : "",
        };

        const response = await fetch("http://127.0.0.1:8000/visitors", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(visitorData),
        });

        let result = {};
        try {
            result = await response.json();
        } catch {
            result = {};
        }

        if (!response.ok) {
            throw new Error(result.message || "Unable to save visitor.");
        }

        showSuccessModal();
    }

    function validateForm() {
        clearValidationState();

        const validations = [
            { field: visitorName, message: "Visitor name is required." },
            { field: employeeId, message: "Employee ID is required." },
            { field: address, message: "Address is required." },
            { field: company, message: "Company/Firm is required." },
            { field: aadhaarNumber, message: "Aadhaar number must contain exactly 12 digits.", test: (value) => /^\d{12}$/.test(value) },
            { field: phoneNumber, message: "Phone number must contain exactly 10 digits.", test: (value) => /^\d{10}$/.test(value) },
            { field: purpose, message: "Purpose of visit is required." },
            { field: department, message: "Department is required." },
            { field: category, message: "Category is required." },
            { field: verification, message: "Police verification number is required." },
            { field: duration, message: "Duration is required." },
            { field: validityFrom, message: "Validity from date is required." },
            { field: validityTo, message: "Validity to date is required." },
            { field: gender, message: "Gender is required." },
            { field: nationality, message: "Nationality is required." },
        ];

        for (const rule of validations) {
            const field = rule.field;
            if (!field) {
                continue;
            }

            const value = field.value ? field.value.trim() : "";
            const isEmpty = value === "";
            const isValid = rule.test ? rule.test(value) : !isEmpty;

            if (!isValid) {
                field.setCustomValidity(rule.message);
                field.reportValidity();
                field.focus();
                return false;
            }

            field.setCustomValidity("");
        }

        if (validityFrom && validityTo && validityFrom.value && validityTo.value && validityTo.value < validityFrom.value) {
            validityTo.setCustomValidity("Validity To must be on or after Validity From.");
            validityTo.reportValidity();
            validityTo.focus();
            return false;
        }

        return true;
    }

    function showSuccessModal() {
        if (!successModal) {
            showToast("Visitor saved successfully.", "success");
            return;
        }

        successModal.classList.add("show");
        showToast("Visitor saved successfully.", "success");
    }

    function hideSuccessModal() {
        if (!successModal) {
            return;
        }

        successModal.classList.remove("show");
    }

    function toggleSidebar() {
        if (!sidebar) {
            return;
        }

        const isMobile = window.matchMedia("(max-width: 980px)").matches;

        if (isMobile) {
            const isOpen = body.classList.contains("sidebar-open");
            body.classList.toggle("sidebar-open", !isOpen);
            sidebar.classList.toggle("is-open", !isOpen);

            if (sidebarOverlay) {
                sidebarOverlay.hidden = isOpen;
                sidebarOverlay.classList.toggle("is-visible", !isOpen);
            }

            if (menuToggle) {
                menuToggle.setAttribute("aria-expanded", String(!isOpen));
            }
            return;
        }

        body.classList.toggle("sidebar-collapsed");
    }

    function closeSidebar() {
        if (!sidebar) {
            return;
        }

        body.classList.remove("sidebar-open");
        sidebar.classList.remove("is-open");

        if (sidebarOverlay) {
            sidebarOverlay.hidden = true;
            sidebarOverlay.classList.remove("is-visible");
        }

        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", "false");
        }
    }

    function toggleProfileMenu() {
        if (!profileMenu || !profileToggle) {
            return;
        }

        const isOpen = !profileMenu.hidden;
        profileMenu.hidden = isOpen;
        profileToggle.setAttribute("aria-expanded", String(!isOpen));
    }

    function closeProfileMenu() {
        if (!profileMenu || !profileToggle) {
            return;
        }

        profileMenu.hidden = true;
        profileToggle.setAttribute("aria-expanded", "false");
    }

    function clearValidationState() {
        requiredFieldList.forEach((field) => {
            if (field) {
                field.setCustomValidity("");
            }
        });

        if (validityTo) {
            validityTo.setCustomValidity("");
        }
    }

    function clearFieldValidity(field) {
        if (field) {
            field.setCustomValidity("");
        }
    }

    function showToast(message, type = "success") {
        if (!toast) {
            return;
        }

        toast.hidden = false;
        const toastMessage = toast.querySelector("p");
        const toastTitle = toast.querySelector("strong");

        if (toastTitle) {
            toastTitle.textContent = type === "error" ? "Error" : "Success";
        }

        if (toastMessage) {
            toastMessage.textContent = message;
        } else {
            toast.textContent = message;
        }

        toast.className = `toast toast--${type} is-visible`;

        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            if (toast) {
                toast.hidden = true;
                toast.className = "toast";
            }
        }, 2600);
    }

    function clearToast() {
        if (!toast) {
            return;
        }

        window.clearTimeout(toastTimer);
        toast.hidden = true;
        toast.className = "toast";
    }

    function setToday(input) {
        if (!input) {
            return "";
        }

        const isoDate = getTodayIso();
        input.min = isoDate;
        input.value = isoDate;
        return isoDate;
    }

    function setInputDateBounds(startInput, endInput, minDate) {
        if (!startInput || !endInput) {
            return;
        }

        const startIso = setToday(startInput) || minDate;
        endInput.min = startIso;
    }

    function getTodayIso() {
        const today = new Date();
        return new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    }

    function syncProfileHeader() {
        const savedUsername = localStorage.getItem("username") || "abc@gmail.com";
        const savedName = localStorage.getItem("name") || "ABC Name";

        if (profileUsername) {
            profileUsername.textContent = savedUsername;
        }

        if (profileName) {
            profileName.textContent = savedName;
        }
    }

    function safeAddEventListener(element, eventName, handler) {
        if (element && typeof element.addEventListener === "function") {
            element.addEventListener(eventName, handler);
        }
    }

    function ensureMobileMenuToggle(root, sidebarElement) {
        const existingToggle = document.getElementById("sidebarToggle");
        if (existingToggle) {
            return existingToggle;
        }

        if (!root || !sidebarElement) {
            return null;
        }

        const topbarLeft = document.querySelector(".topbar__left");
        if (!topbarLeft) {
            return null;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.id = "sidebarToggle";
        button.className = "menu-toggle";
        button.setAttribute("aria-label", "Toggle sidebar");
        button.setAttribute("aria-expanded", "false");
        button.innerHTML = "<span></span><span></span><span></span>";

        topbarLeft.prepend(button);
        return button;
    }