async function login() {

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });

    const data = await response.json();

    if (data.success) {
        localStorage.setItem("username", data.username);
        localStorage.setItem("name", data.name);
        localStorage.setItem("role", data.role);

        if (data.admin_id) {
            localStorage.setItem("admin_id", data.admin_id);
            localStorage.removeItem("officer_id");
        }

        if (data.officer_id) {
            localStorage.setItem("officer_id", data.officer_id);
            localStorage.removeItem("admin_id");
        }

        window.location.href = "../register_page/index.html";
    } else {
        alert(data.message);
    }
}
