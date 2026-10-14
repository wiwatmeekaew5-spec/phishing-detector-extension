const API_BASE_URL = "https://work-mvnz.onrender.com";

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // กรองเฉพาะการเปิดหน้าต่างหลัก และไม่ตรวจสอบเว็บระบบ/เซิร์ฟเวอร์ตัวเอง
  if (
    details.frameId === 0 &&
    details.url.startsWith("http") &&
    !details.url.includes("127.0.0.1") &&
    !details.url.includes("localhost") &&
    !details.url.includes("work-mvnz.onrender.com")
  ) {
    const urlToScan = details.url;
    const tabId = details.tabId;

    try {
      // 1. ตรวจสอบว่าผู้ใช้เคยกดยืนยัน Bypass เพื่อเข้าเว็บนี้ไว้แล้วหรือไม่
      const storageData = await chrome.storage.local.get("allowedUrl");
      if (storageData && storageData.allowedUrl === urlToScan) {
        await chrome.storage.local.remove("allowedUrl");
        return;
      }

      // 2. ส่ง URL ไปตรวจกับ Hybrid AI Engine
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToScan })
      });

      if (!response.ok) return;
      const result = await response.json();

      // 3. เงื่อนไขการสกัดกั้น (Hard Block): ตัดสินเมื่อเป็น PHISHING หรือคะแนนความเสี่ยง >= 60
      if (result.prediction === "PHISHING" || Number(result.risk_score) >= 60) {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError || !tab) return;

          // บันทึกข้อมูลและเปลี่ยนเส้นทางไปยังหน้าเตือน warning.html
          chrome.storage.local.set({
            blockedUrl: urlToScan,
            scanResult: result
          }).then(() => {
            chrome.tabs.update(tabId, {
              url: chrome.runtime.getURL("warning.html")
            }).catch((err) => {
              console.warn("Could not redirect tab:", err);
            });
          });
        });
      }
    } catch (error) {
      console.error("URL Security Check Error:", error);
    }
  }
});