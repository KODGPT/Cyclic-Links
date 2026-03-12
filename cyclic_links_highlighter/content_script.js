(function(){
  const HIGHLIGHT_CLASS = 'cyclic-links-highlight';
  let isEnabled = false;
  let observer;

  // Универсальная безопасная отправка сообщений (ни одна ошибка не вылезет)
  function safeSendMessage(msg) {
    try {
      chrome.runtime.sendMessage(msg);
    } catch (e) {
      // полностью игнорируем все ошибки соединения
    }
  }

  function injectStyles(){
    if (document.getElementById('cyclic-links-styles')) return;
    const style = document.createElement('style');
    style.id = 'cyclic-links-styles';
    style.textContent = `
.${HIGHLIGHT_CLASS} {
  position: relative;
  box-shadow: 0 0 0 3px rgba(255,50,50,1), 0 0 10px rgba(255,50,50,0.06);
  border-radius: 4px;
  animation: cyclic-pulse 1.6s infinite ease-in-out;
  transition: box-shadow 0.2s, transform 0.12s;
  z-index: 2147483647;
}
@keyframes cyclic-pulse {
  0% { box-shadow: 0 0 0 0 rgba(255,50,50,1); transform: scale(1.25); }
  50% { box-shadow: 0 0 18px 18px rgba(255,50,50,0.06); transform: scale(1); }
  100% { box-shadow: 0 0 0 0 rgba(255,50,50,0.12); transform: scale(1); }
}
.${HIGHLIGHT_CLASS}::after {
  content: '🔥';
  font-size: 14px;
  position: relative;
  right: -12px;
  top: -12px;
  background: rgba(253, 1, 107, 1);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  color: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
}`;
    document.head.appendChild(style);
  }

  function normalizeUrl(url){
    try {
      const u = new URL(url, location.href);
      const pathname = u.pathname.replace(/\/$/, '');
      return `${u.protocol}//${u.hostname}${u.port ? ':'+u.port:''}${pathname}${u.search}${u.hash}`;
    } catch(e){ 
      return url; 
    }
  }

  function isCyclicLink(a){
    if (!a || !a.href) return false;

    try {
      const href = a.getAttribute('href');
      if (!href || href.trim() === '') return false;

      if (
        href === '#' ||
        a.href.startsWith('#') ||
        a.hasAttribute('data-fancybox') ||
        a.classList.contains('bvi-open')
      ) return false;

      const u = new URL(a.href, location.href);
      if (u.hash && u.href.split('#')[0] === location.href.split('#')[0]) return false;

      return normalizeUrl(a.href) === normalizeUrl(location.href);
    } catch {
      return false;
    }
  }

  function highlightAll(){
    if (!isEnabled) return 0;
    injectStyles();

    document.querySelectorAll('.'+HIGHLIGHT_CLASS)
      .forEach(el => el.classList.remove(HIGHLIGHT_CLASS));

    const anchors = [...document.querySelectorAll('a[href], area[href]')];
    const cyclic = anchors.filter(isCyclicLink);

    cyclic.forEach(a => a.classList.add(HIGHLIGHT_CLASS));

    safeSendMessage({type:'CYCLIC_COUNT', count: cyclic.length});
    return cyclic.length;
  }

  function cleanup(){
    if (observer) observer.disconnect();

    document.querySelectorAll('.'+HIGHLIGHT_CLASS)
      .forEach(el => el.classList.remove(HIGHLIGHT_CLASS));

    const style = document.getElementById('cyclic-links-styles');
    if (style) style.remove();
  }

  observer = new MutationObserver(() => {
    if (isEnabled) highlightAll();
  });

  function watchHistory(){
    const _push = history.pushState;
    const _replace = history.replaceState;

    history.pushState = function(){
      const r = _push.apply(this, arguments);
      window.dispatchEvent(new Event('cyclic-href-change'));
      return r;
    };

    history.replaceState = function(){
      const r = _replace.apply(this, arguments);
      window.dispatchEvent(new Event('cyclic-href-change'));
      return r;
    };

    window.addEventListener('popstate', () =>
      window.dispatchEvent(new Event('cyclic-href-change'))
    );

    window.addEventListener('cyclic-href-change', () =>
      setTimeout(() => { if (isEnabled) highlightAll(); }, 50)
    );
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === 'RUN_HIGHLIGHT') {
      sendResponse({count: isEnabled ? highlightAll() : 0});
    }
    // возвращаем true только если нужен асинхронный ответ (не нужен)
  });

  chrome.storage.local.get({enabled: false}, p => {
    isEnabled = !!p.enabled;
    if (isEnabled && document.readyState !== 'loading') init();
  });

  chrome.storage.onChanged.addListener(changes => {
    if ('enabled' in changes) {
      isEnabled = !!changes.enabled.newValue;
      if (isEnabled) {
        if (document.readyState !== 'loading') init();
      } else {
        cleanup();
      }
    }
  });

  function init(){
    if (!isEnabled) return;
    injectStyles();
    highlightAll();
    observer.observe(document.documentElement, {childList: true, subtree: true});
    watchHistory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isEnabled) init();
    });
  } else if (isEnabled) {
    init();
  }
})();