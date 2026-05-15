let port;
let writer;
let reader;

document.addEventListener("DOMContentLoaded", () => {
    const btnConnect = document.getElementById("btnConnect");
    const statusBT = document.getElementById("statusBT");
    const consoleEl = document.getElementById("serialConsole");
    const btnAuto = document.getElementById("btnAuto");
    const btnManual = document.getElementById("btnManual");
    const btnP1 = document.getElementById("btnP1");
    const btnP2 = document.getElementById("btnP2");

    // --- FUNCȚIA DE CITIRE DATE ---
    async function readLoop() {
        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
        reader = textDecoder.readable.getReader();

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                    // Afișăm în consola din pagină
                    consoleEl.innerHTML += value.replace(/\n/g, '<br>');
                    // Scroll automat jos
                    consoleEl.scrollTop = consoleEl.scrollHeight;
                }
            }
        } catch (error) {
            console.error("Eroare la citire:", error);
        } finally {
            reader.releaseLock();
        }
    }

    // --- CONECTARE / DECONECTARE ---
    btnConnect.addEventListener("click", async () => {
        if (port) {
            try {
                if (reader) await reader.cancel();
                if (writer) {
                    await writer.close();
                    writer = null;
                }
                await port.close();
                port = null;
                updateUI(false);
                consoleEl.innerHTML += "<br>[!] Deconectat de la stație.<br>";
            } catch (e) { console.error(e); port = null; updateUI(false); }
            return;
        }

        try {
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });

            const textEncoder = new TextEncoderStream();
            const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
            writer = textEncoder.writable.getWriter();

            updateUI(true);
            consoleEl.innerHTML = "> Conectat! Se primesc date...<br>";
            
            readLoop(); // Pornim ascultarea datelor

        } catch (error) {
            console.error(error);
            alert("Eroare la deschiderea portului!");
        }
    });

    // --- TRIMITE COMANDA ---
    async function sendCommand(char) {
        if (writer) {
            await writer.write(char);
            consoleEl.innerHTML += `<span style="color: #3b82f6;">> Trimis comandă: ${char}</span><br>`;
            consoleEl.scrollTop = consoleEl.scrollHeight;
        } else {
            alert("Conectați Bluetooth-ul mai întâi!");
        }
    }

    function updateUI(connected) {
        if (connected) {
            statusBT.innerHTML = '<i class="fa-solid fa-link"></i> CONECTAT';
            statusBT.style.color = "#4ade80";
            btnConnect.innerText = "DECONECTEAZĂ";
        } else {
            statusBT.innerHTML = '<i class="fa-solid fa-link-slash"></i> DECONECTAT';
            statusBT.style.color = "#f97316";
            btnConnect.innerText = "CONECTEAZĂ";
        }
    }

    // Logica butoanelor Manual/Auto
    btnAuto.addEventListener("click", () => { toggleUI(false); sendCommand('A'); });
    btnManual.addEventListener("click", () => { toggleUI(true); sendCommand('M'); });
    btnP1.addEventListener("click", () => { if(!btnP1.classList.contains('disabled')) sendCommand('1'); });
    btnP2.addEventListener("click", () => { if(!btnP2.classList.contains('disabled')) sendCommand('2'); });

    function toggleUI(isManual) {
        if(isManual) {
            btnManual.classList.add('active'); btnAuto.classList.remove('active');
            btnP1.classList.remove('disabled'); btnP2.classList.remove('disabled');
            document.getElementById("controlTitle").innerText = "CONTROL MANUAL (ACTIV)";
        } else {
            btnAuto.classList.add('active'); btnManual.classList.remove('active');
            btnP1.classList.add('disabled'); btnP2.classList.add('disabled');
            document.getElementById("controlTitle").innerText = "CONTROL MANUAL (DEZACTIVAT)";
        }
    }
});