/*!
 * Ítala — widget embutível (ITS Brasil)
 * Uso: <script src="https://ia.itsbrasil.net/itala-widget.js" defer></script>
 * Opcional: data-api="https://ia.itsbrasil.net" para apontar a API.
 */
(function () {
  "use strict";
  var script = document.currentScript;
  var API = (script && script.getAttribute("data-api")) ||
    (script && script.src ? new URL(script.src).origin : "") || "";
  var ENDPOINT = API.replace(/\/$/, "") + "/api/agent";
  var BRAND = "#16a34a";

  if (window.__italaWidgetLoaded) return;
  window.__italaWidgetLoaded = true;

  var history = [];

  var css =
    ".mrn-btn{position:fixed;right:20px;bottom:20px;width:58px;height:58px;border-radius:50%;background:" + BRAND + ";color:#fff;border:0;box-shadow:0 6px 24px rgba(0,0,0,.25);cursor:pointer;z-index:2147483000;display:flex;align-items:center;justify-content:center}" +
    ".mrn-panel{position:fixed;right:20px;bottom:88px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.28);z-index:2147483000;display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
    ".mrn-open .mrn-panel{display:flex}" +
    ".mrn-head{background:" + BRAND + ";color:#fff;padding:12px 14px;font-weight:700;display:flex;justify-content:space-between;align-items:center}" +
    ".mrn-head small{display:block;font-weight:400;opacity:.85;font-size:.72rem}" +
    ".mrn-x{background:transparent;border:0;color:#fff;font-size:20px;cursor:pointer;line-height:1}" +
    ".mrn-msgs{flex:1;overflow-y:auto;padding:12px;background:#f7f7f8;display:flex;flex-direction:column;gap:8px}" +
    ".mrn-m{max-width:85%;padding:8px 11px;border-radius:12px;font-size:.9rem;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}" +
    ".mrn-u{align-self:flex-end;background:" + BRAND + ";color:#fff;border-bottom-right-radius:3px}" +
    ".mrn-a{align-self:flex-start;background:#fff;color:#111;border:1px solid #e5e5e5;border-bottom-left-radius:3px}" +
    ".mrn-foot{display:flex;gap:6px;padding:10px;border-top:1px solid #eee;background:#fff}" +
    ".mrn-foot input{flex:1;border:1px solid #ddd;border-radius:10px;padding:9px 11px;font-size:.9rem;outline:none}" +
    ".mrn-send{background:" + BRAND + ";color:#fff;border:0;border-radius:10px;padding:0 14px;cursor:pointer;font-weight:700}" +
    ".mrn-send:disabled{opacity:.5;cursor:default}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.innerHTML =
    '<button class="mrn-btn" aria-label="Falar com a Ítala">' +
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.4 8.4 0 01-8.5 8.5 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0112 3.5h.5a8.5 8.5 0 018 8z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg></button>' +
    '<div class="mrn-panel" role="dialog" aria-label="Ítala">' +
    '<div class="mrn-head"><div>Ítala<small>ITS Brasil</small></div><button class="mrn-x" aria-label="Fechar">×</button></div>' +
    '<div class="mrn-msgs"></div>' +
    '<form class="mrn-foot"><input type="text" placeholder="Digite sua mensagem..." autocomplete="off"/><button class="mrn-send" type="submit">›</button></form>' +
    "</div>";
  document.body.appendChild(root);

  var btn = root.querySelector(".mrn-btn");
  var panel = root.querySelector(".mrn-panel");
  var msgs = root.querySelector(".mrn-msgs");
  var form = root.querySelector(".mrn-foot");
  var input = form.querySelector("input");
  var sendBtn = form.querySelector(".mrn-send");

  function add(role, text) {
    var el = document.createElement("div");
    el.className = "mrn-m " + (role === "user" ? "mrn-u" : "mrn-a");
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  var greeted = false;
  btn.addEventListener("click", function () {
    root.classList.toggle("mrn-open");
    if (root.classList.contains("mrn-open")) {
      if (!greeted) { greeted = true; add("assistant", "Olá! Sou a Ítala, assistente da ITS Brasil. Como posso ajudar?"); }
      input.focus();
    }
  });
  root.querySelector(".mrn-x").addEventListener("click", function () { root.classList.remove("mrn-open"); });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendBtn.disabled = true;
    add("user", text);
    history.push({ role: "user", content: text });
    var out = add("assistant", "");
    out.textContent = "…";
    try {
      var res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      });
      if (!res.ok || !res.body) { out.textContent = "Desculpe, tive um problema. Tente novamente."; sendBtn.disabled = false; return; }
      var reader = res.body.getReader();
      var dec = new TextDecoder();
      var acc = "";
      out.textContent = "";
      while (true) {
        var r = await reader.read();
        if (r.done) break;
        acc += dec.decode(r.value, { stream: true });
        out.textContent = acc;
        msgs.scrollTop = msgs.scrollHeight;
      }
      history.push({ role: "assistant", content: acc });
    } catch (err) {
      out.textContent = "Erro de conexão. Tente novamente.";
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  });
})();
