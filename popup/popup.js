const checkbox = document.querySelector('input.enable');
const radios = [...document.querySelectorAll('input[name="redirect"]').values()];
console.log(radios);

chrome.storage.local.get(['enabled', 'redirect'], ({ enabled, redirect }) => {
  checkbox.checked = enabled;
  const currentRadio = radios.find(x => x.getAttribute("value") === redirect) || radios[0];
  currentRadio.checked = true;
});

checkbox.addEventListener("input", () => {
  chrome.storage.local.set({ enabled: checkbox.checked });
});

radios.forEach(radio => {
  radio.addEventListener("input", () => {
    chrome.storage.local.set({ redirect: radio.getAttribute("value") });
  });
});
