/* ============================================================
   闲云阁 · 服务器状态页脚本
   数据源：api.mcsrvstat.us（主）/ api.mcstatus.io（备）
   每 60 秒自动刷新一次
   ============================================================ */

(function () {
  "use strict";

  var SERVER = "nyj.cc.cd";
  var REFRESH_SECONDS = 60;

  var $ = function (id) { return document.getElementById(id); };
  var elOnline = $("stOnline");       // 在线状态
  var elDot = $("dotStatus");         // 状态圆点
  var elRun = $("stRun");             // 运行状态
  var elPlayers = $("playersVal");    // 在线玩家人数
  var elPlayersMax = $("playersMax");
  var elLatency = $("latencyVal");    // 平均延迟
  var elUpdated = $("updatedTime");   // 刷新时间
  var elNext = $("nextIn");           // 距下次刷新
  var elVer = $("verText");           // 版本
  var elMotd = $("motdText");         // MOTD
  var refreshBtn = document.getElementById("refreshBtn");

  if (!elOnline) return; // 不在状态页则不执行

  var latencies = [];   // 最近若干次请求往返延迟，用于求平均
  var secondsLeft = REFRESH_SECONDS;
  var busy = false;

  /* ---------- 数据获取 ---------- */
  async function fetchPrimary() {
    var t0 = performance.now();
    var res = await fetch("https://api.mcsrvstat.us/3/" + SERVER + "?t=" + Date.now());
    var rtt = Math.round(performance.now() - t0);
    if (!res.ok) throw new Error("primary " + res.status);
    var j = await res.json();
    return {
      online: !!j.online,
      rtt: rtt,
      players: j.players || null,
      version: j.version || "",
      motd: (j.motd && Array.isArray(j.motd.clean)) ? j.motd.clean.join(" ") : ""
    };
  }

  async function fetchFallback() {
    var t0 = performance.now();
    var res = await fetch("https://api.mcstatus.io/v2/status/java/" + SERVER + "?t=" + Date.now());
    var rtt = Math.round(performance.now() - t0);
    if (!res.ok) throw new Error("fallback " + res.status);
    var j = await res.json();
    return {
      online: !!j.online,
      rtt: rtt,
      players: j.players || null,
      version: (j.version && j.version.name_clean) ? j.version.name_clean : "",
      motd: (j.motd && typeof j.motd.clean === "string") ? j.motd.clean : ""
    };
  }

  /* ---------- 渲染 ---------- */
  function render(d) {
    // 平均延迟（取最近 5 次接口往返均值）
    latencies.push(d.rtt);
    if (latencies.length > 5) latencies.shift();
    var avg = latencies.reduce(function (a, b) { return a + b; }, 0) / latencies.length;
    elLatency.textContent = Math.round(avg) + " ms";

    elDot.classList.toggle("on", d.online);
    elDot.classList.toggle("off", !d.online);
    elOnline.textContent = d.online ? "在线" : "离线";
    elOnline.classList.toggle("on", d.online);
    elOnline.classList.toggle("off", !d.online);

    elRun.textContent = d.online ? "正常运行" : "已停止运行";
    elRun.classList.toggle("on", d.online);
    elRun.classList.toggle("off", !d.online);

    if (d.online && d.players) {
      elPlayers.textContent = String(d.players.online ?? "--");
      elPlayersMax.textContent = d.players.max != null ? "/ " + d.players.max : "";
    } else {
      elPlayers.textContent = "--";
      elPlayersMax.textContent = "";
    }

    elVer.textContent = d.version || "未知版本";
    elMotd.textContent = d.motd || "—";

    elUpdated.textContent = "最近更新：" +
      new Date().toLocaleTimeString("zh-CN", { hour12: false });
  }

  function renderError() {
    elDot.classList.remove("on");
    elDot.classList.add("off");
    elOnline.textContent = "检测失败";
    elOnline.classList.remove("on");
    elOnline.classList.add("off");
    elRun.textContent = "无法连接状态源";
    elRun.classList.remove("on");
    elRun.classList.add("off");
    elPlayers.textContent = "--";
    elPlayersMax.textContent = "";
    showToast("服务器状态获取失败，稍后自动重试");
  }

  /* ---------- 刷新循环 ---------- */
  async function refresh() {
    if (busy) return;
    busy = true;
    var icon = refreshBtn ? refreshBtn.querySelector("svg") : null;
    if (icon) icon.classList.add("spin");

    try {
      var data;
      try {
        data = await fetchPrimary();
      } catch (e1) {
        data = await fetchFallback(); // 主源失败时走备用源
      }
      render(data);
    } catch (e2) {
      renderError();
    } finally {
      if (icon) icon.classList.remove("spin");
      busy = false;
      secondsLeft = REFRESH_SECONDS;
    }
  }

  if (refreshBtn) refreshBtn.addEventListener("click", refresh);

  setInterval(function () {
    secondsLeft--;
    elNext.textContent = "下次刷新：" + Math.max(secondsLeft, 0) + " 秒后";
    if (secondsLeft <= 0 && !busy) refresh();
  }, 1000);

  elNext.textContent = "下次刷新：" + REFRESH_SECONDS + " 秒后";
  refresh();
})();
