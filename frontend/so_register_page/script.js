console.log("Script loaded");
const API = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", function () {

    const registerForm = document.getElementById("registerForm");
    console.log(registerForm);


    const nameInput = document.getElementById("name");
    const usernameInput = document.getElementById("username");
    const adminKeyInput = document.getElementById("adminKey");

    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    const togglePasswordBtn = document.getElementById("togglePasswordBtn");
    const toggleConfirmPasswordBtn = document.getElementById("toggleConfirmPasswordBtn");

    // ----------------------------
    // Password Visibility
    // ----------------------------

    function toggleVisibility(inputField, iconElement) {

        if (inputField.type === "password") {

            inputField.type = "text";

            iconElement.classList.remove("fa-eye");

            iconElement.classList.add("fa-eye-slash");

        }
        else {

            inputField.type = "password";

            iconElement.classList.remove("fa-eye-slash");

            iconElement.classList.add("fa-eye");

        }

    }

    togglePasswordBtn.addEventListener("click", function () {

        toggleVisibility(passwordInput, togglePasswordBtn);

    });

    toggleConfirmPasswordBtn.addEventListener("click", function () {

        toggleVisibility(confirmPasswordInput, toggleConfirmPasswordBtn);

    });

    // ----------------------------
    // Password Validation
    // ----------------------------

    function validatePasswords() {

        const password = passwordInput.value.trim();

        const confirm = confirmPasswordInput.value.trim();

        if (
            password.length >= 8 &&
            password === confirm
        ) {

            passwordInput.classList.add("input-valid");

            confirmPasswordInput.classList.add("input-valid");

            return true;

        }

        passwordInput.classList.remove("input-valid");

        confirmPasswordInput.classList.remove("input-valid");

        return false;

    }

    passwordInput.addEventListener("input", validatePasswords);

    confirmPasswordInput.addEventListener("input", validatePasswords);

    // ----------------------------
    // Register
    // ----------------------------

    registerForm.addEventListener("submit", async function (e) {

        e.preventDefault();
        console.log("submitted")
        if (!validatePasswords()) {

            alert("Passwords do not match or are less than 8 characters.");

            return;

        }

        const data = {

            name: nameInput.value.trim(),

            username: usernameInput.value.trim(),

            password: passwordInput.value,

            admin_keys: adminKeyInput.value.trim()

        };

        try {

            const response = await fetch(API + "/security-officer/register", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(data)

            });

            const result = await response.json();

            if (result.success) {

                alert(result.message);

                registerForm.reset();

                passwordInput.classList.remove("input-valid");
                confirmPasswordInput.classList.remove("input-valid");

            }
            else {

                alert(result.message);

            }

        }
        catch (error) {

            console.error(error);

            alert("Unable to connect to server.");

        }

    });

});