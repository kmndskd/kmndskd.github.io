(function () {
  "use strict";

  // ===== DOM要素 =====
  const $ = function (id) { return document.getElementById(id); };
  const totalAmountEl       = $("totalAmount");
  const includeTaxEl        = $("includeTax");
  const includeServiceEl    = $("includeService");
  const adjustedTotalEl     = $("adjustedTotal");
  const equalPeopleEl       = $("equalPeople");
  const roundingModeEl      = $("roundingMode");
  const ratioMembersEl      = $("ratioMembers");
  const itemMembersEl       = $("itemMembers");
  const sharedCostEl        = $("sharedCost");
  const calcBtn             = $("calcBtn");
  const resultSection       = $("resultSection");
  const resultContent       = $("resultContent");
  const resultSummary       = $("resultSummary");
  const copyBtn             = $("copyBtn");
  const resetBtn            = $("resetBtn");
  const historyList         = $("historyList");
  const clearHistoryBtn     = $("clearHistory");
  const toastEl             = $("toast");

  let currentMode = "equal";
  let ratioMemberCount = 0;
  let itemMemberCount = 0;

  // ===== ユーティリティ =====
  function formatYen(n) {
    return "¥" + Math.round(n).toLocaleString("ja-JP");
  }

  function sanitizeText(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  function getAdjustedTotal() {
    var base = parseFloat(totalAmountEl.value) || 0;
    if (includeTaxEl.checked) base *= 1.10;
    if (includeServiceEl.checked) base *= 1.10;
    return Math.round(base);
  }

  function updateAdjustedDisplay() {
    var base = parseFloat(totalAmountEl.value) || 0;
    var adjusted = getAdjustedTotal();
    if (base > 0 && adjusted !== base) {
      adjustedTotalEl.textContent = "税・サービス料込み: " + formatYen(adjusted);
    } else {
      adjustedTotalEl.textContent = "";
    }
  }

  function applyRounding(amount, mode) {
    switch (mode) {
      case "ceil100":  return Math.ceil(amount / 100) * 100;
      case "ceil10":   return Math.ceil(amount / 10) * 10;
      case "floor100": return Math.floor(amount / 100) * 100;
      case "floor10":  return Math.floor(amount / 10) * 10;
      case "round100": return Math.round(amount / 100) * 100;
      case "round10":  return Math.round(amount / 10) * 10;
      default:         return Math.round(amount);
    }
  }

  // ===== モード切替 =====
  document.querySelectorAll(".mode-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".mode-tab").forEach(function (t) { t.classList.remove("active"); });
      document.querySelectorAll(".mode-content").forEach(function (c) { c.classList.remove("active"); });
      tab.classList.add("active");
      currentMode = tab.getAttribute("data-mode");
      document.getElementById("mode-" + currentMode).classList.add("active");
    });
  });

  // ===== ステッパー =====
  document.querySelectorAll(".stepper-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = document.getElementById(btn.getAttribute("data-target"));
      var val = parseInt(target.value) || 1;
      if (btn.getAttribute("data-action") === "inc") {
        target.value = Math.min(val + 1, 100);
      } else {
        target.value = Math.max(val - 1, 1);
      }
    });
  });

  // ===== 合計金額/税のリアルタイム更新 =====
  totalAmountEl.addEventListener("input", updateAdjustedDisplay);
  includeTaxEl.addEventListener("change", updateAdjustedDisplay);
  includeServiceEl.addEventListener("change", updateAdjustedDisplay);

  // ===== 傾斜配分メンバー =====
  function createRatioMember(name, ratio, count) {
    ratioMemberCount++;
    var id = ratioMemberCount;
    var div = document.createElement("div");
    div.className = "ratio-member";
    div.setAttribute("data-id", id);
    div.innerHTML =
      '<button class="btn-remove" data-remove-ratio="' + id + '">×</button>' +
      '<div class="member-row">' +
        '<input type="text" placeholder="名前" value="' + sanitizeText(name || "") + '" class="ratio-name">' +
        '<span class="ratio-label">比率</span>' +
        '<input type="number" value="' + (ratio || 1) + '" min="0.1" step="0.1" class="ratio-value" inputmode="decimal">' +
        '<span class="ratio-label">×</span>' +
        '<input type="number" value="' + (count || 1) + '" min="1" class="ratio-count" inputmode="numeric">' +
        '<span class="ratio-label">人</span>' +
      '</div>';
    ratioMembersEl.appendChild(div);
    div.querySelector(".btn-remove").addEventListener("click", function () {
      div.remove();
    });
  }

  // 初期2グループ
  createRatioMember("グループA", 1.5, 2);
  createRatioMember("グループB", 1, 3);

  $("addRatioMember").addEventListener("click", function () {
    createRatioMember("", 1, 1);
  });

  // プリセット
  document.querySelectorAll(".btn-preset").forEach(function (btn) {
    btn.addEventListener("click", function () {
      ratioMembersEl.innerHTML = "";
      ratioMemberCount = 0;
      var preset = btn.getAttribute("data-preset");
      if (preset === "boss") {
        createRatioMember("上司・部長", 2, 1);
        createRatioMember("先輩", 1.5, 2);
        createRatioMember("若手", 1, 3);
      } else if (preset === "senior") {
        createRatioMember("先輩", 1.5, 2);
        createRatioMember("後輩", 1, 3);
      } else if (preset === "organizer") {
        createRatioMember("幹事", 0.5, 1);
        createRatioMember("その他", 1, 4);
      }
    });
  });

  // ===== 個別入力メンバー =====
  function createItemMember(name) {
    itemMemberCount++;
    var id = itemMemberCount;
    var div = document.createElement("div");
    div.className = "item-member";
    div.setAttribute("data-id", id);
    div.innerHTML =
      '<button class="btn-remove" data-remove-item="' + id + '">×</button>' +
      '<div class="member-row">' +
        '<input type="text" placeholder="名前" value="' + sanitizeText(name || "") + '" class="item-name">' +
      '</div>' +
      '<div class="item-entries" data-entries="' + id + '">' +
        '<div class="item-entry">' +
          '<input type="text" placeholder="品名" class="entry-name">' +
          '<input type="number" placeholder="金額" class="entry-amount" inputmode="numeric">' +
          '<button class="btn-remove-item">×</button>' +
        '</div>' +
      '</div>' +
      '<button class="btn-add-item" data-add-entry="' + id + '">＋ 品目追加</button>';
    itemMembersEl.appendChild(div);

    div.querySelector(".btn-remove").addEventListener("click", function () {
      div.remove();
    });
    div.querySelector(".btn-add-item").addEventListener("click", function () {
      addItemEntry(div.querySelector('.item-entries'));
    });
    div.querySelector(".btn-remove-item").addEventListener("click", function (e) {
      removeItemEntry(e);
    });
  }

  function addItemEntry(container) {
    var entry = document.createElement("div");
    entry.className = "item-entry";
    entry.innerHTML =
      '<input type="text" placeholder="品名" class="entry-name">' +
      '<input type="number" placeholder="金額" class="entry-amount" inputmode="numeric">' +
      '<button class="btn-remove-item">×</button>';
    container.appendChild(entry);
    entry.querySelector(".btn-remove-item").addEventListener("click", function (e) {
      removeItemEntry(e);
    });
  }

  function removeItemEntry(e) {
    var entry = e.target.closest(".item-entry");
    var container = entry.parentElement;
    if (container.querySelectorAll(".item-entry").length > 1) {
      entry.remove();
    }
  }

  // 初期2人
  createItemMember("Aさん");
  createItemMember("Bさん");

  $("addItemMember").addEventListener("click", function () {
    createItemMember("");
  });

  // ===== 計算 =====
  calcBtn.addEventListener("click", function () {
    var total = getAdjustedTotal();
    if (total <= 0) {
      showToast("合計金額を入力してください");
      return;
    }

    var result;
    if (currentMode === "equal") {
      result = calcEqual(total);
    } else if (currentMode === "ratio") {
      result = calcRatio(total);
    } else {
      result = calcItem(total);
    }

    if (result) {
      displayResult(result);
      saveHistory(result);
    }
  });

  // ----- 均等割り -----
  function calcEqual(total) {
    var people = parseInt(equalPeopleEl.value) || 1;
    var mode = roundingModeEl.value;
    var perPerson = total / people;
    var rounded = applyRounding(perPerson, mode);
    var diff = rounded * people - total;

    var rows = [];
    for (var i = 0; i < people; i++) {
      rows.push({ name: "メンバー " + (i + 1), amount: rounded });
    }

    return {
      mode: "均等割り",
      total: total,
      people: people,
      rows: rows,
      perPerson: rounded,
      diff: diff,
      summary: people + "人で均等割り → 1人あたり " + formatYen(rounded) +
        (diff !== 0 ? " （差額: " + (diff > 0 ? "+" : "") + formatYen(diff) + "）" : "")
    };
  }

  // ----- 傾斜配分 -----
  function calcRatio(total) {
    var members = ratioMembersEl.querySelectorAll(".ratio-member");
    if (members.length === 0) {
      showToast("メンバーを追加してください");
      return null;
    }

    var groups = [];
    var totalWeight = 0;
    members.forEach(function (m) {
      var name = m.querySelector(".ratio-name").value || "名無し";
      var ratio = parseFloat(m.querySelector(".ratio-value").value) || 1;
      var count = parseInt(m.querySelector(".ratio-count").value) || 1;
      totalWeight += ratio * count;
      groups.push({ name: name, ratio: ratio, count: count });
    });

    if (totalWeight === 0) {
      showToast("比率を正しく入力してください");
      return null;
    }

    var mode = roundingModeEl.value;
    var unitShare = total / totalWeight;
    var rows = [];
    var calcTotal = 0;
    var totalPeople = 0;

    groups.forEach(function (g) {
      var perPerson = applyRounding(unitShare * g.ratio, mode);
      for (var i = 0; i < g.count; i++) {
        rows.push({ name: g.name + (g.count > 1 ? " (" + (i + 1) + ")" : ""), amount: perPerson });
        calcTotal += perPerson;
        totalPeople++;
      }
    });

    var diff = calcTotal - total;

    return {
      mode: "傾斜配分",
      total: total,
      people: totalPeople,
      rows: rows,
      diff: diff,
      summary: totalPeople + "人で傾斜配分" +
        (diff !== 0 ? " （差額: " + (diff > 0 ? "+" : "") + formatYen(diff) + "）" : "")
    };
  }

  // ----- 個別入力 -----
  function calcItem(total) {
    var members = itemMembersEl.querySelectorAll(".item-member");
    if (members.length === 0) {
      showToast("メンバーを追加してください");
      return null;
    }

    var shared = parseFloat(sharedCostEl.value) || 0;
    var memberData = [];
    var personalTotal = 0;

    members.forEach(function (m) {
      var name = m.querySelector(".item-name").value || "名無し";
      var entries = m.querySelectorAll(".item-entry");
      var sum = 0;
      entries.forEach(function (e) {
        sum += parseFloat(e.querySelector(".entry-amount").value) || 0;
      });
      personalTotal += sum;
      memberData.push({ name: name, personal: sum });
    });

    var sharedPerPerson = shared / memberData.length;
    var rows = [];
    var calcTotal = 0;

    memberData.forEach(function (d) {
      var amount = Math.round(d.personal + sharedPerPerson);
      rows.push({ name: d.name, amount: amount });
      calcTotal += amount;
    });

    // 入力金額との比較情報
    var inputTotal = personalTotal + shared;
    var note = "個別合計: " + formatYen(personalTotal) + " + 共通費用: " + formatYen(shared) + " = " + formatYen(inputTotal);

    return {
      mode: "個別入力",
      total: inputTotal,
      people: memberData.length,
      rows: rows,
      diff: 0,
      summary: memberData.length + "人で個別計算\n" + note
    };
  }

  // ===== 結果表示 =====
  function displayResult(result) {
    var html = '<table class="result-table">' +
      '<tr><th>名前</th><th>支払い金額</th></tr>';
    result.rows.forEach(function (row) {
      html += '<tr><td>' + sanitizeText(row.name) + '</td><td>' + formatYen(row.amount) + '</td></tr>';
    });
    html += '</table>';
    resultContent.innerHTML = html;

    var summaryHtml = '<div>合計: <span class="big">' + formatYen(result.total) + '</span> / ' +
      result.people + '人</div>' +
      '<div>' + sanitizeText(result.summary).replace(/\n/g, "<br>") + '</div>';
    resultSummary.innerHTML = summaryHtml;

    resultSection.style.display = "block";
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ===== コピー =====
  copyBtn.addEventListener("click", function () {
    var rows = resultContent.querySelectorAll(".result-table tr");
    var lines = [];
    lines.push("【割り勘計算結果】");
    lines.push(resultSummary.textContent);
    lines.push("─────────────");
    rows.forEach(function (row, i) {
      if (i === 0) return; // header
      var cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        lines.push(cells[0].textContent + ": " + cells[1].textContent);
      }
    });

    var text = lines.join("\n");

    // Clipboard API (ローカルのみ、外部通信なし)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast("コピーしました！");
      }, function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("コピーしました！");
    } catch (e) {
      showToast("コピーに失敗しました");
    }
    document.body.removeChild(ta);
  }

  // ===== リセット =====
  resetBtn.addEventListener("click", function () {
    totalAmountEl.value = "";
    includeTaxEl.checked = false;
    includeServiceEl.checked = false;
    adjustedTotalEl.textContent = "";
    equalPeopleEl.value = 2;
    roundingModeEl.value = "ceil100";
    resultSection.style.display = "none";

    // 傾斜配分初期化
    ratioMembersEl.innerHTML = "";
    ratioMemberCount = 0;
    createRatioMember("グループA", 1.5, 2);
    createRatioMember("グループB", 1, 3);

    // 個別入力初期化
    itemMembersEl.innerHTML = "";
    itemMemberCount = 0;
    createItemMember("Aさん");
    createItemMember("Bさん");
    sharedCostEl.value = 0;

    showToast("リセットしました");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ===== 履歴 (sessionStorage使用 - 外部通信なし) =====
  var HISTORY_KEY = "warikan_history";

  function loadHistory() {
    try {
      var data = sessionStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(result) {
    var history = loadHistory();
    var entry = {
      date: new Date().toLocaleString("ja-JP"),
      mode: result.mode,
      total: result.total,
      people: result.people,
      summary: result.summary,
      rows: result.rows
    };
    history.unshift(entry);
    if (history.length > 20) history.pop();
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      // ストレージ制限時は無視
    }
    renderHistory();
  }

  function renderHistory() {
    var history = loadHistory();
    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty-history">まだ履歴がありません</p>';
      return;
    }
    var html = "";
    history.forEach(function (h, i) {
      html += '<div class="history-item" data-history-index="' + i + '">' +
        '<div class="history-date">' + sanitizeText(h.date) + '</div>' +
        '<div class="history-title">' + sanitizeText(h.mode) + ' - ' + formatYen(h.total) + ' / ' + h.people + '人</div>' +
        '<div class="history-detail">' + sanitizeText(h.summary) + '</div>' +
      '</div>';
    });
    historyList.innerHTML = html;

    // 履歴クリックで結果再表示
    historyList.querySelectorAll(".history-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var idx = parseInt(item.getAttribute("data-history-index"));
        var h = loadHistory()[idx];
        if (h) {
          displayResult({
            mode: h.mode,
            total: h.total,
            people: h.people,
            rows: h.rows,
            diff: 0,
            summary: h.summary
          });
        }
      });
    });
  }

  clearHistoryBtn.addEventListener("click", function () {
    try {
      sessionStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      // ignore
    }
    renderHistory();
    showToast("履歴をクリアしました");
  });

  // 初期表示
  renderHistory();

})();
