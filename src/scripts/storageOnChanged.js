chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes.enabled) return;
  const { newValue } = changes.enabled;
  console.log(newValue);
  chrome.browserAction.setBadgeText({ text: newValue ? "ON" : "OFF" });
});
