let port, writer, reader;

document.addEventListener("DOMContentLoaded", () => {
    const btnConnect = document.getElementById("btnConnect");
    const statusBT = document.getElementById("statusBT");
    const consoleEl = document.getElementById("serialConsole");

    // === CONECTARE ===
    btnConnect.addEventListener("click", async () => {
        if (port) {
            location.reload(); 
            return;
        }

        try {
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            
            const encoder = new TextEncoderStream();
            encoder.readable.pipeTo(port.writable);
            writer = encoder.writable.getWriter();

            statusBT.innerHTML = '<i class="fa-solid fa-link"></i> CONECTAT';
            statusBT.classList.add("online");
            btnConnect.innerText = "DECONECTEAZĂ";
            consoleEl.innerHTML = '<i class="fa-solid fa-terminal"></i> Așteptare date de la Arduino...';
            
            readLoop();
        } catch (error) {
            console.error(error);
            alert("Nu s-a putut conecta. Asigură-te că Serial Monitor din Arduino IDE este închis!");
        }
    });

    // === CITIRE DATE ===
    async function readLoop() {
        const decoder = new TextDecoderStream();
        port.readable.pipeTo(decoder.writable);
        reader = decoder.readable.getReader();
        let buffer = "";

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                    buffer += value;
                    if (buffer.includes('\n')) {
                        consoleEl.innerHTML = `<i class="fa-solid fa-terminal"></i> Date primite: ${buffer.trim()}`;
                        parseData(buffer);
                        buffer = ""; 
                    }
                }
            }
        } catch (e) {
            consoleEl.innerHTML = '<i class="fa-solid fa-link-slash"></i> Conexiune pierdută.';
        }
    }

    // === LOGICĂ ICONIȚE DINAMICE ===
    function updateIcon(id, value, type) {
        const icon = document.getElementById(id);
        if (!icon) return;
        let val = parseFloat(value);
        icon.className = "fa-solid icon-large"; 

        if (type === 'baterie') {
            if (val >= 80) icon.classList.add("fa-battery-full", "text-green");
            else if (val >= 60) icon.classList.add("fa-battery-three-quarters", "text-green");
            else if (val >= 40) icon.classList.add("fa-battery-half", "text-orange");
            else if (val >= 20) icon.classList.add("fa-battery-quarter", "text-orange");
            else icon.classList.add("fa-battery-empty", "text-red");
        } 
        else if (type === 'lumina') {
            if (val >= 70) icon.classList.add("fa-sun", "text-orange");
            else if (val >= 30) icon.classList.add("fa-cloud-sun", "text-gray");
            else icon.classList.add("fa-moon", "text-gray");
        }
        else if (type === 'apa') {
            if (id === 'iconFantana') icon.classList.add("fa-bore-hole");
            if (id === 'iconBazin') icon.classList.add("fa-glass-water");
            
            if (val >= 60) icon.classList.add("text-blue");
            else if (val >= 25) icon.classList.add("text-orange");
            else icon.classList.add("text-red");
        }
        else if (type === 'sol') {
            if (val >= 60) icon.classList.add("fa-seedling", "text-green");
            else if (val >= 30) icon.classList.add("fa-leaf", "text-orange");
            else icon.classList.add("fa-plant-wilt", "text-red");
        }
    }

    // === EXTRAGERE VALORI ===
    function parseData(rawString) {
        const sensors = {
            'L': 'valLumina', 'V': 'valVPanou', 'B': 'valBaterie', 
            'F': 'valFantana', 'Z': 'valBazin', 'S': 'valSol', 
            'T': 'valTemp', 'H': 'valUmid'
        };

        Object.keys(sensors).forEach(key => {
            const regex = new RegExp(`${key}(\\d+(\\.\\d+)?)`);
            const match = rawString.match(regex);
            
            if (match) {
                let val = match[1];
                let element = document.getElementById(sensors[key]);
                if (element) {
                    element.innerText = (key === 'V' || key === 'T') ? val : val + "%";
                }
                
                if (key === 'B') updateIcon("iconBaterie", val, 'baterie');
                if (key === 'L') updateIcon("iconLumina", val, 'lumina');
                if (key === 'F') updateIcon("iconFantana", val, 'apa');
                if (key === 'Z') updateIcon("iconBazin", val, 'apa');
                if (key === 'S') updateIcon("iconSol", val, 'sol');
            }
        });
    }

    // === COMENZI SPRE ARDUINO ===
    async function sendCommand(char) {
        if (writer) await writer.write(char);
    }

    const btnAuto = document.getElementById("btnAuto");
    const btnManual = document.getElementById("btnManual");
    const btnP1 = document.getElementById("btnP1");
    const btnP2 = document.getElementById("btnP2");
    const controlTitle = document.getElementById("controlTitle");

    function setMode(isManual) {
        if (isManual) {
            btnManual.classList.add("active");
            btnAuto.classList.remove("active");
            btnP1.classList.remove("disabled");
            btnP2.classList.remove("disabled");
            controlTitle.innerText = "CONTROL MANUAL (ACTIV)";
            controlTitle.style.color = "#f97316";
        } else {
            btnAuto.classList.add("active");
            btnManual.classList.remove("active");
            btnP1.classList.add("disabled");
            btnP2.classList.add("disabled");
            controlTitle.innerText = "CONTROL MANUAL (DEZACTIVAT)";
            controlTitle.style.color = "#9ca3af";
            
            btnP1.classList.remove("active-pump"); document.getElementById("statP1").innerText = "STARE: OPRIT";
            btnP2.classList.remove("active-pump"); document.getElementById("statP2").innerText = "STARE: OPRIT";
        }
    }

    btnAuto.addEventListener("click", () => { setMode(false); sendCommand('A'); });
    btnManual.addEventListener("click", () => { setMode(true); sendCommand('M'); });

    function setupPump(btnEl, statusElId, cmdOn, cmdOff) {
        btnEl.addEventListener("click", () => {
            if (btnEl.classList.contains("disabled")) return;
            const isTurningOn = !btnEl.classList.contains("active-pump");
            
            if (isTurningOn) {
                btnEl.classList.add("active-pump");
                document.getElementById(statusElId).innerText = "STARE: PORNIT";
                document.getElementById(statusElId).style.color = "#4ade80";
                sendCommand(cmdOn);
            } else {
                btnEl.classList.remove("active-pump");
                document.getElementById(statusElId).innerText = "STARE: OPRIT";
                document.getElementById(statusElId).style.color = "#f97316";
                sendCommand(cmdOff);
            }
        });
    }

    setupPump(btnP1, "statP1", '1', '0'); 
    setupPump(btnP2, "statP2", '2', '3'); 
});