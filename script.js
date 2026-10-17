
const shortenForm = document.getElementById("shorten-form");
const longUrlInput = document.getElementById("long-url");
const shortUrlResult = document.getElementById("short-url-result");
const shortUrlInput = document.getElementById("short-url");
const copyButton = document.getElementById("copy-button");
const shortenButton = document.getElementById("shorten-button");
const shortenStatus = document.getElementById("shorten-status");
const qrFromShortButton = document.getElementById("qr-from-short");

const qrForm = document.getElementById("qr-form");
const qrUrlInput = document.getElementById("qr-url");
const qrResult = document.getElementById("qr-result");
const qrImage = document.getElementById("qr-image");
const downloadQrButton = document.getElementById("download-qr");
const generateQrButton = document.getElementById("generate-qr-button");
const qrStatus = document.getElementById("qr-status");

function setFeedback(element, message, state = "") {
    element.textContent = message;
    element.className = state ? `feedback ${state}` : "feedback";
}

shortenForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const url = longUrlInput.value.trim();
    shortUrlResult.hidden = true;
    setFeedback(shortenStatus, "Creating your short link…");
    shortenButton.disabled = true;
    shortenButton.querySelector("span").textContent = "Creating link…";

    try {
        const response = await fetch("/api/shorten", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok) {
            setFeedback(shortenStatus, data.error || "Unable to shorten this URL.", "error");
            return;
        }

        shortUrlInput.value = data.short_url;
        shortUrlResult.hidden = false;
        setFeedback(shortenStatus, "Your short link is ready.", "success");
    } catch {
        setFeedback(shortenStatus, "Could not connect to the server. Try again when it is available.", "error");
    } finally {
        shortenButton.disabled = false;
        shortenButton.querySelector("span").textContent = "Create short link";
    }
});

copyButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(shortUrlInput.value);
        copyButton.textContent = "Copied";
        setFeedback(shortenStatus, "Short link copied to clipboard.", "success");

        setTimeout(() => {
            copyButton.textContent = "Copy";
        }, 1500);
    } catch {
        shortUrlInput.focus();
        shortUrlInput.select();
        setFeedback(shortenStatus, "Copy was blocked. The link is selected so you can copy it manually.", "error");
    }
});

qrForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const url = qrUrlInput.value.trim();

    if (!/^https?:\/\/\S+$/i.test(url)) {
        setFeedback(qrStatus, "Enter a web address starting with http:// or https://.", "error");
        return;
    }

    setFeedback(qrStatus, "Generating your QR code…");
    qrResult.hidden = false;
    downloadQrButton.disabled = true;
    generateQrButton.disabled = true;
    generateQrButton.querySelector("span").textContent = "Generating…";
    qrImage.src = "/qr-code?url=" + encodeURIComponent(url);
});

qrImage.addEventListener("load", () => {
    downloadQrButton.disabled = false;
    generateQrButton.disabled = false;
    generateQrButton.querySelector("span").textContent = "Generate QR code";
    setFeedback(qrStatus, "Your QR code is ready to download.", "success");
});

qrImage.addEventListener("error", () => {
    qrResult.hidden = true;
    downloadQrButton.disabled = true;
    generateQrButton.disabled = false;
    generateQrButton.querySelector("span").textContent = "Generate QR code";
    setFeedback(qrStatus, "Could not generate the QR code. Check the address and try again.", "error");
});

qrFromShortButton.addEventListener("click", () => {
    qrUrlInput.value = shortUrlInput.value;
    qrForm.requestSubmit();
    qrUrlInput.scrollIntoView({ behavior: "smooth", block: "center" });
});

downloadQrButton.addEventListener("click", async () => {
    try {
        const response = await fetch(qrImage.src);

        if (!response.ok) {
            throw new Error("QR download failed");
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download = "smarturl-qr.png";
        link.click();

        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        setFeedback(qrStatus, "QR code downloaded.", "success");
    } catch {
        setFeedback(qrStatus, "Unable to download the QR code. Please try again.", "error");
    }
});
