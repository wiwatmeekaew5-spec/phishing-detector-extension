chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (
    details.frameId === 0 &&
    details.url.startsWith("http") &&
    !details.url.includes("127.0.0.1") &&
    !details.url.includes("localhost") &&
    !details.url.includes("work-mvnz.onrender.com")
  ) {
    const urlToScan = details.url;
    const tabId = details.tabId;

    // 🟢 เช็กว่า URL นี้ได้รับการยืนยัน "ยินยอมเข้าต่อ" หรือยัง
    chrome.storage.local.get("allowedUrl").then((data) => {
      if (data && data.allowedUrl === urlToScan) {
        chrome.storage.local.remove("allowedUrl");
        return;
      }

      // ส่ง URL ไปตรวจกับ Backend บน Render
      fetch("https://work-mvnz.onrender.com/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToScan })
      })
        .then((response) => {
          if (!response.ok) return null;
          return response.json();
        })
        .then((result) => {
          if (!result) return;

          // ถ้าเสี่ยงสูง ให้บันทึกข้อมูลแล้วเปิดหน้า warning.html
          if (result.prediction === "PHISHING" || result.risk_score >= 50) {
            // ตรวจสอบว่าแท็บยังเปิดอยู่จริงก่อนเปลี่ยนหน้า
            chrome.tabs.get(tabId, (tab) => {
              if (chrome.runtime.lastError || !tab) {
                // หากแท็บถูกปิดไปแล้ว ให้หยุดทำงานทันที ไม่ฟ้อง Error
                return;
              }

              chrome.storage.local
                .set({
                  blockedUrl: urlToScan,
                  scanResult: result
                })
                .then(() => {
                  chrome.tabs.update(tabId, {
                    url: chrome.runtime.getURL("warning.html")
                  }).catch((err) => {
                    console.warn("Could not update tab (tab might be closed):", err);
                  });
                });
            });
          }
        })
        .catch((error) => {
          console.error("Error checking URL:", error);
        });
    });
  }
});