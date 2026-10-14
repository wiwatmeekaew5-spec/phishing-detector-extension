document.addEventListener("DOMContentLoaded", async () => {
    // ดึงข้อมูลเว็บที่โดนบล็อกมาจาก Chrome Storage
    const data = await chrome.storage.local.get(["blockedUrl", "scanResult"]);
    const targetUrl = data.blockedUrl;
    const result = data.scanResult;

    // แสดง URL บนหน้าเว็บ
    if (document.getElementById("targetUrl")) {
        document.getElementById("targetUrl").innerText = targetUrl || "Unknown URL";
    }

    // แสดง เหตุผลการเตือนบนหน้าเว็บ
    if (document.getElementById("reasonText") && result) {
        let reasons = "ตรวจพบรูปแบบความเสี่ยง";
        if (Array.isArray(result.reason)) {
            reasons = result.reason.join("<br>• ");
        } else if (Array.isArray(result.reasons)) {
            reasons = result.reasons.join("<br>• ");
        } else if (result.reason) {
            reasons = result.reason;
        }
        document.getElementById("reasonText").innerHTML = "<b>เหตุผลที่บล็อก:</b><br>• " + reasons;
    }

    // กรณีผู้ใช้กดปุ่ม "กลับสู่หน้าปลอดภัย"
    const btnCancel = document.getElementById("btnCancel");
    if (btnCancel) {
        btnCancel.addEventListener("click", () => {
            window.location.href = "https://www.google.com";
        });
    }

    // กรณีผู้ใช้กดปุ่ม "ยืนยันว่าจะเข้าต่อ"
    const btnProceed = document.getElementById("btnProceed");
    if (btnProceed) {
        btnProceed.addEventListener("click", async () => {
            try {
                // บันทึกสถานะฟีดแบ็กส่งไปที่ Backend บน Render
                await fetch("https://work-mvnz.onrender.com/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: targetUrl,
                        user_feedback: "PROCEEDED_BY_USER"
                    })
                });
            } catch (e) {
                console.error("Feedback error:", e);
            }

            // 🟢 บันทึกจำไว้ว่าผู้ใช้ยอมรับเข้าเว็บนี้แล้ว เพื่อไม่ให้ background.js ดักบล็อกซ้ำ
            await chrome.storage.local.set({ allowedUrl: targetUrl });

            // สั่งเปลี่ยนหน้าไปยังเว็บเป้าหมายเดิม
            window.location.href = targetUrl;
        });
    }
});