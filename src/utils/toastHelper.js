import Toastify from "toastify-js";

const ICONS = {
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>'
};

export const createToastHtml = (text, iconName = 'info') => {
  const innerHtml = ICONS[iconName] || ICONS.info;
  const size = 26; // Powiększona ikona

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${iconName}">${innerHtml}</svg>`;

  return `<div style="display: flex; align-items: center; gap: 8px;">
            ${svg}
            <span>${text}</span>
          </div>`;
};

export const showToast = (text, iconName = 'info', options = {}) => {
  Toastify({
    text: createToastHtml(text, iconName),
    escapeMarkup: false,
    duration: 3000,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    ...options
  }).showToast();
};
