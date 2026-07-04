

const API = "http://127.0.0.1:8000";

const generateBtn = document.getElementById("generateBtn");
const timerEl = document.getElementById("timer");
const historyTable = document.getElementById("historyTable");
const copyBtn = document.getElementById("copyBtn");

let currentKey = "";
let expiryTime = null;

function displayKey(key){
    console.log("Displaye called")

    currentKey = key;

    const chars = key.replace("-", "").split("");

    console.log(chars);


    for(let i=1;i<=10;i++){

        const box = document.getElementById(`keyChar${i}`);
        console.log(box);


        if(box){

            box.textContent = chars[i-1] || "—";
            box.classList.add("filled");

        }

    }

}

function clearKeyDisplay(){
    console.trace("Clear key called")

    currentKey = "";

    for(let i=1;i<=10;i++){

        const box = document.getElementById(`keyChar${i}`);

        if(box){

            box.textContent = "—";
            box.classList.remove("filled");

        }

    }

}

let timerInterval = null;

function startTimer(){

    clearInterval(timerInterval);

    timerInterval = setInterval(()=>{
        console.log("Expiry:", expiryTime);
        const now = new Date();
        console.log("Now:", new Date());

        const remaining = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);
        console.log("Remaining:", remaining);

        if(remaining <= 0){

            clearInterval(timerInterval);

            timerEl.textContent = "00:00";

            generateBtn.disabled = false;

            clearKeyDisplay();

            return;
        }

        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;

        timerEl.textContent =
            `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;

    },1000);

}


generateBtn.addEventListener("click", async function (e) {

    e.preventDefault();

    try {

        const response = await fetch(API + "/admin-key/generate", {
            method: "POST"
        });

        const data = await response.json();

        if (data.key) {

            displayKey(data.key);

            expiryTime = new Date(data.expires_at);

            startTimer();

            loadHistory();

        }

        if (!data.success) {
        
        }

    } catch (err) {

        console.error(err);

        alert("Unable to generate key.");

    }

});

async function loadHistory(){

    try{

        const response=await fetch(API+"/admin-key/history");

        const rows=await response.json();

        historyTable.innerHTML="";

        rows.forEach((row,index)=>{

            historyTable.innerHTML+=`

            <tr>

                <td>${index+1}</td>

                <td>${row.admin_key}</td>

                <td>${row.used_by ?? "-"}</td>

                <td>

                    <span class="status ${row.status.toLowerCase()}">

                        ${row.status}

                    </span>

                </td>

            </tr>

            `;

        });

    }
    catch(err){

        console.log(err);

    }

}
async function loadCurrentKey() {

    try {

        const response = await fetch(API + "/admin-key/current");

        const data = await response.json();

        if (!data.success || !data.key) {

            clearKeyDisplay();

            timerEl.textContent = "00:00";

            generateBtn.disabled = false;

            return;
        }

        displayKey(data.key);

        expiryTime = new Date(data.expires_at);

        generateBtn.disabled = true;

        startTimer();

    } catch (err) {

        console.error(err);

    }

}

copyBtn.addEventListener("click",()=>{

    if(!currentKey) return;

    navigator.clipboard.writeText(currentKey);

    copyBtn.innerHTML='<i class="fa-solid fa-check"></i>';

    setTimeout(()=>{

        copyBtn.innerHTML='<i class="fa-solid fa-copy"></i>';

    },1000);

});

// setInterval(()=>{

//     loadCurrentKey();

//     loadHistory();

// },5000);

window.addEventListener("DOMContentLoaded",()=>{

    loadCurrentKey();

    loadHistory();

});
