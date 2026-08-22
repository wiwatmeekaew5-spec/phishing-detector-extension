chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (
    details.frameId === 0 &&
    details.url.startsWith("http") &&
    !details.url.includes("127.0.0.1") &&
    !details.url.includes("localhost") &&
    !details.url.includes("work-mvnz.onrender.com")
  ) {
    const urlToScan = details.url;

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

          // ถ้าเสี่ยงสูง ให้บันทึกข้อมูลแล้วเปิดหน้า warning.html ทันที
          if (result.prediction === "PHISHING" || result.risk_score >= 50) {
            chrome.storage.local
              .set({
                blockedUrl: urlToScan,
                scanResult: result
              })
              .then(() => {
                chrome.tabs.update(details.tabId, {
                  url: chrome.runtime.getURL("warning.html")
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