// popup.js — полностью безопасная версия (даже если элементов нет в DOM)
function $(s) { return document.querySelector(s); }

document.addEventListener('DOMContentLoaded', () => {
  const enabledEl = $('#enabled');
  const countEl = $('#count');        // может быть null — ок
  const rescanBtn = $('#rescan');     // может быть null — ок

  // === Включение/выключение ===
  if (enabledEl) {
    chrome.storage.local.get({enabled: false}, p => {
      enabledEl.checked = !!p.enabled;
    });

    enabledEl.addEventListener('change', () => {
      try {
        chrome.runtime.sendMessage({type: 'TOGGLE_ENABLED', enabled: enabledEl.checked});
      } catch {}
    });
  }

  // === Кнопка «Пересканировать» (если есть) ===
  if (rescanBtn) {
    rescanBtn.addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({type: 'REQUEST_RESCAN'});
      } catch {}
    });
  }

  // === Обновление счётчика при открытии попапа (только если элемент существует) ===
  if (countEl) {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      if (!tabs || !tabs[0]) {
        countEl.textContent = '—';
        return;
      }

      const tab = tabs[0];

      // Защищённая отправка — никаких ошибок никогда
      try {
        chrome.tabs.sendMessage(tab.id, {type: 'RUN_HIGHLIGHT'}, resp => {
          // Если ответ пришёл — ок, если нет — тоже ок
          if (chrome.runtime.lastError) {
            countEl.textContent = '—';
          } else {
            countEl.textContent = (resp && typeof resp.count === 'number') ? resp.count : '—';
          }
        });
      } catch (e) {
        countEl.textContent = '—';
      }
    });
  }
});