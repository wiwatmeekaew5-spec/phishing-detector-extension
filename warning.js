const API_BASE_URL = "https://work-mvnz.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. ดึงข้อมูลจาก Chrome Local Storage
    const data = await chrome.storage.local.get(["blockedUrl", "scanResult"]);
    const targetUrl = data.blockedUrl;
    const result = data.scanResult;

    // 2. แสดง URL ที่ถูกตรวจจับ
    const targetUrlElem = document.getElementById("targetUrl");
    if (targetUrlElem) {
        targetUrlElem.innerText = targetUrl || "Unknown URL";
    }

    // 3. แสดงตัวเลข Risk Score & Confidence Level
    if (result) {
        const riskVal = document.getElementById("riskVal");
        const confVal = document.getElementById("confVal");

        if (riskVal) riskVal.innerText = `${result.risk_score || 0}/100`;
        if (confVal) confVal.innerText = `${result.confidence || 0}%`;

        // 4. แสดงรายการเหตุผลสำคัญ (Explainability)
        const reasonTextElem = document.getElementById("reasonText");
        if (reasonTextElem) {
            let reasonsArr = [];
            if (Array.isArray(result.reasons)) {
                reasonsArr = result.reasons;
            } else if (Array.isArray(result.reason)) {
                reasonsArr = result.reason;
            } else if (result.reasons || result.reason) {
                reasonsArr = [result.reasons || result.reason];
            }

            if (reasonsArr.length > 0) {
                reasonTextElem.innerHTML = "<b>คุณลักษณะความเสี่ยงที่ตรวจพบ:</b><br>• " + reasonsArr.join("<br>• ");
            } else {
                reasonTextElem.innerHTML = "<b>คุณลักษณะความเสี่ยง:</b> โครงสร้างลิงก์ตรงกับพฤติกรรมของ Phishing URL";
            }
        }
    }

    // กรณีคลิก "กลับสู่หน้าปลอดภัย"
    const btnCancel = document.getElementById("btnCancel");
    if (btnCancel) {
        btnCancel.addEventListener("click", () => {
            window.location.href = "https://www.google.com";
        });
    }

    // กรณีคลิก "ยอมรับความเสี่ยงและเข้าต่อ" (Bypass)
    const btnProceed = document.getElementById("btnProceed");
    if (btnProceed) {
        btnProceed.addEventListener("click", async () => {
            btnProceed.disabled = true;
            btnProceed.innerText = "กำลังประมวลผล...";

            try {
                // ส่งฟีดแบ็กไปบันทึกสถานะลง scan_logs (สอดคล้องกับค่า user_action: BYPASS_WARNING)
                await fetch(`${API_BASE_URL}/feedback`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: targetUrl,
                        user_feedback: "BYPASS_WARNING"
                    })
                });
            } catch (err) {
                console.error("Feedback dispatch error:", err);
            }

            // บันทึก URL ที่ได้รับการอนุญาตชั่วคราวเพื่อไม่ให้ background.js สกัดกั้นซ้ำ
            await chrome.storage.local.set({ allowedUrl: targetUrl });

            // ดำเนินการเข้าสู่เว็บไซต์ปลายทาง
            window.location.href = targetUrl;
        });
    }
});