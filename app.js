const fields = {
  vision: "夫婦で健康に過ごし、年に数回は旅行へ行ける状態を維持したい。会社に過度に依存せず、退職後の生活費を見える化しておきたい。",
  currentAge: 50,
  retireAge: 65,
  lifeAge: 88,
  pensionStartAge: 65,
  hasSpouse: 1,
  spouseAge: 48,
  monthlyLife: 45,
  monthlyHousing: 0,
  annualMedical: 35,
  annualDream: 240,
  oneTimeEvent: 500,
  familySupport: 300,
  careReserve: 800,
  debtAtRetire: 0,
  pensionSelf: 160,
  pensionSpouse: 90,
  annuityAnnual: 120,
  annuityYears: 10,
  workIncome: 120,
  workUntilAge: 70,
  otherIncome: 60,
  retirementReturn: 1,
  personalAssetsNow: 1500,
  monthlySaving: 20,
  preRetireReturn: 2,
  plannedRetirementPay: 2500,
  retirementNetRatio: 85,
  corporateReserveNow: 800,
  corporateAnnualReserve: 120,
  insuranceCashAtRetire: 1500
};

const colors = {
  pension: "#2f67a2",
  personal: "#176b54",
  retirement: "#b66b12",
  gap: "#b43d37",
  line: "#6860a8"
};

const STORAGE_KEY = "second-life-planner-state-v1";
const els = {};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-field]").forEach((input) => {
    els[input.dataset.field] = input;
    input.addEventListener("input", update);
    input.addEventListener("change", update);
  });

  document.getElementById("saveButton").addEventListener("click", saveState);
  document.getElementById("resetButton").addEventListener("click", resetState);
  document.getElementById("printButton").addEventListener("click", () => window.print());

  loadState();
  update();
});

function readState() {
  const state = {};
  for (const [key, fallback] of Object.entries(fields)) {
    const element = els[key];
    if (!element) continue;
    if (element.tagName === "TEXTAREA") {
      state[key] = element.value.trim();
    } else if (element.tagName === "SELECT") {
      state[key] = Number(element.value);
    } else {
      const value = Number(element.value);
      state[key] = Number.isFinite(value) ? value : fallback;
    }
  }
  return state;
}

function writeState(state) {
  for (const [key, fallback] of Object.entries(fields)) {
    if (!els[key]) continue;
    els[key].value = state[key] ?? fallback;
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    writeState(saved ? { ...fields, ...saved } : fields);
  } catch {
    writeState(fields);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readState()));
  flashButton("saveButton", "保存済み");
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  writeState(fields);
  update();
}

function flashButton(id, text) {
  const button = document.getElementById(id);
  const old = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = old;
  }, 1200);
}

function update() {
  const state = normalize(readState());
  const result = calculate(state);
  renderSummary(result);
  renderFundingChart(result);
  renderBalanceChart(result);
  renderActions(result);
  renderScenarios(state);
}

function normalize(state) {
  const yearsToRetire = Math.max(0, state.retireAge - state.currentAge);
  const retirementYears = Math.max(1, state.lifeAge - state.retireAge);
  return {
    ...state,
    hasSpouse: Number(state.hasSpouse) === 1,
    yearsToRetire,
    retirementYears,
    netRatio: clamp(state.retirementNetRatio / 100, 0.3, 1),
    preRate: state.preRetireReturn / 100,
    retireRate: state.retirementReturn / 100
  };
}

function calculate(state) {
  const annualBasicSpend = (state.monthlyLife + state.monthlyHousing) * 12 + state.annualMedical + state.annualDream;
  const oneTimeAtRetire = state.oneTimeEvent + state.familySupport + state.debtAtRetire;
  const careAge = Math.min(Math.max(state.retireAge + 10, 78), state.lifeAge);
  const personalAtRetire = futureValue(state.personalAssetsNow, state.monthlySaving * 12, state.preRate, state.yearsToRetire);

  const cashflows = [];
  let requiredCapital = oneTimeAtRetire;
  let incomePv = 0;
  let spendingPv = oneTimeAtRetire;

  for (let i = 0; i < state.retirementYears; i += 1) {
    const age = state.retireAge + i;
    const discount = Math.pow(1 + state.retireRate, i);
    const pension = age >= state.pensionStartAge ? state.pensionSelf + (state.hasSpouse ? state.pensionSpouse : 0) : 0;
    const annuity = i < state.annuityYears ? state.annuityAnnual : 0;
    const work = age < state.workUntilAge ? state.workIncome : 0;
    const other = state.otherIncome;
    const income = pension + annuity + work + other;
    const care = age === careAge ? state.careReserve : 0;
    const spending = annualBasicSpend + care;
    const deficit = Math.max(0, spending - income);

    incomePv += income / discount;
    spendingPv += spending / discount;
    requiredCapital += deficit / discount;
    cashflows.push({ age, income, spending, deficit, pension, annuity, work, other, care });
  }

  const requiredNetFromCompany = Math.max(0, requiredCapital - personalAtRetire);
  const requiredGrossRetirementPay = requiredNetFromCompany / state.netRatio;
  const plannedNetRetirementPay = state.plannedRetirementPay * state.netRatio;
  const retirementDesignGap = Math.max(0, requiredGrossRetirementPay - state.plannedRetirementPay);

  const corporatePreparedGross = futureValue(state.corporateReserveNow, state.corporateAnnualReserve, state.preRate, state.yearsToRetire) + state.insuranceCashAtRetire;
  const sourceGapForRequired = Math.max(0, requiredGrossRetirementPay - corporatePreparedGross);
  const annualAdditionalPreparation = state.yearsToRetire > 0
    ? annualPaymentForFutureValue(sourceGapForRequired, state.preRate, state.yearsToRetire)
    : sourceGapForRequired;

  const planBalances = simulateBalances(state, cashflows, personalAtRetire + plannedNetRetirementPay, oneTimeAtRetire);
  const fullBalances = simulateBalances(state, cashflows, personalAtRetire + requiredNetFromCompany, oneTimeAtRetire);
  const planRunout = planBalances.find((point) => point.balance < 0);
  const coverageRatio = requiredCapital > 0 ? (personalAtRetire + plannedNetRetirementPay) / requiredCapital : 1;

  return {
    state,
    annualBasicSpend,
    oneTimeAtRetire,
    careAge,
    personalAtRetire,
    cashflows,
    requiredCapital,
    incomePv,
    spendingPv,
    requiredNetFromCompany,
    requiredGrossRetirementPay,
    plannedNetRetirementPay,
    retirementDesignGap,
    corporatePreparedGross,
    sourceGapForRequired,
    annualAdditionalPreparation,
    planBalances,
    fullBalances,
    planRunout,
    coverageRatio
  };
}

function futureValue(start, annualContribution, rate, years) {
  if (years <= 0) return start;
  const grownStart = start * Math.pow(1 + rate, years);
  if (Math.abs(rate) < 0.00001) {
    return grownStart + annualContribution * years;
  }
  return grownStart + annualContribution * ((Math.pow(1 + rate, years) - 1) / rate);
}

function annualPaymentForFutureValue(target, rate, years) {
  if (target <= 0) return 0;
  if (years <= 0) return target;
  if (Math.abs(rate) < 0.00001) return target / years;
  return target * rate / (Math.pow(1 + rate, years) - 1);
}

function simulateBalances(state, cashflows, startingCapital, oneTimeAtRetire) {
  let balance = startingCapital - oneTimeAtRetire;
  return cashflows.map((flow) => {
    balance *= 1 + state.retireRate;
    balance += flow.income - flow.spending;
    return { age: flow.age, balance };
  });
}

function renderSummary(result) {
  setText("requiredCapital", yen(result.requiredCapital));
  setText("personalAtRetire", yen(result.personalAtRetire));
  setText("requiredRetirementPay", yen(result.requiredGrossRetirementPay));
  setText("annualPreparation", `${yen(result.annualAdditionalPreparation)}/年`);

  const statusTitle = document.getElementById("statusTitle");
  const statusPill = document.getElementById("statusPill");
  statusPill.classList.remove("warn", "bad");

  if (result.coverageRatio >= 1) {
    statusTitle.textContent = "現在案で生活資金を概ね充足";
    statusPill.textContent = "充足";
  } else if (result.coverageRatio >= 0.8) {
    statusTitle.textContent = "退職金設計の微修正が必要";
    statusPill.textContent = "要調整";
    statusPill.classList.add("warn");
  } else {
    statusTitle.textContent = "今から準備体制の再設計が必要";
    statusPill.textContent = "不足";
    statusPill.classList.add("bad");
  }
}

function renderFundingChart(result) {
  const totalNeed = result.spendingPv;
  let remaining = totalNeed;
  const pensionValue = Math.min(Math.max(0, result.incomePv), remaining);
  remaining -= pensionValue;
  const personalValue = Math.min(Math.max(0, result.personalAtRetire), remaining);
  remaining -= personalValue;
  const retirementValue = Math.min(Math.max(0, result.plannedNetRetirementPay), remaining);
  remaining -= retirementValue;
  const planFunding = [
    { label: "公的年金等", value: pensionValue, color: colors.pension },
    { label: "個人資産", value: personalValue, color: colors.personal },
    { label: "予定退職金", value: retirementValue, color: colors.retirement }
  ];
  const gap = Math.max(0, remaining);
  const data = gap > 0 ? [...planFunding, { label: "未充足", value: gap, color: colors.gap }] : planFunding;

  drawDonut(document.getElementById("fundingChart"), data);
  renderLegend(data);
  setText("coverageText", `現在案の充足率 ${Math.round(result.coverageRatio * 100)}%`);
}

function renderLegend(data) {
  const legend = document.getElementById("fundingLegend");
  legend.innerHTML = "";
  const template = document.getElementById("legendItemTemplate");
  data.forEach((item) => {
    const node = template.content.cloneNode(true);
    node.querySelector("i").style.background = item.color;
    node.querySelector("b").textContent = `${item.label} ${yen(item.value)}`;
    legend.appendChild(node);
  });
}

function renderBalanceChart(result) {
  drawLineChart(document.getElementById("balanceChart"), result.planBalances, result.fullBalances);
  const endBalance = result.planBalances.at(-1)?.balance ?? 0;
  if (result.planRunout) {
    setText("runoutText", `${result.planRunout.age}歳で資金がマイナス`);
  } else {
    setText("runoutText", `平均余命時点 ${yen(endBalance)} 残`);
  }
}

function renderActions(result) {
  const list = document.getElementById("actionList");
  list.innerHTML = "";
  const items = [];
  const years = result.state.yearsToRetire;

  if (result.retirementDesignGap > 0) {
    items.push({
      className: "bad",
      text: `打ち手1: 予定退職金は必要額より ${yen(result.retirementDesignGap)} 不足。詳細試算で役員退職給与規程、功績倍率、支給時期を確認。`
    });
  } else {
    items.push({
      className: "",
      text: "打ち手1: 予定退職金は手取り不足の逆算額を概ねカバー。過大支給にならない根拠資料を整える段階。"
    });
  }

  if (result.sourceGapForRequired > 0) {
    items.push({
      className: result.sourceGapForRequired > 1000 ? "bad" : "warn",
      text: `打ち手2: 必要退職金の原資は ${yen(result.sourceGapForRequired)} 不足。内部留保、保険、投資余力で年 ${yen(result.annualAdditionalPreparation)} の追加準備が目安。`
    });
  } else {
    items.push({
      className: "",
      text: "打ち手2: 法人側の退職金原資は必要水準に到達見込み。継続MAS側では資金繰りと税負担の接続を確認。"
    });
  }

  if (result.personalAtRetire >= result.requiredCapital * 0.55) {
    items.push({
      className: "",
      text: "打ち手3: 個人資産の寄与が大きいため、退職金は生活保障より税務・事業承継・資金繰りとのバランスで設計。"
    });
  } else {
    items.push({
      className: "warn",
      text: "打ち手3: 個人資産だけでは老後資金の半分に届きにくい。NISA・小規模企業共済・個人年金などの個人側積立も同時に検討。"
    });
  }

  if (years <= 5) {
    items.push({
      className: "bad",
      text: "打ち手4: 引退まで5年以内。新規積立より、支給可能額、既存資産、退職後収入の確定度を優先して確認。"
    });
  } else {
    items.push({
      className: "",
      text: `打ち手4: 引退まで${years}年。今の時点で退職金原資を年次予算に入れると、相談が単発試算で終わりにくい。`
    });
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = item.className;
    li.textContent = item.text;
    list.appendChild(li);
  });
}

function renderScenarios(state) {
  const scenarios = [
    { name: "堅実", spend: 0.9, returnShift: -0.5 },
    { name: "標準", spend: 1, returnShift: 0 },
    { name: "ゆとり", spend: 1.15, returnShift: -0.25 }
  ];
  const grid = document.getElementById("scenarioGrid");
  grid.innerHTML = "";

  scenarios.forEach((scenario) => {
    const adjusted = normalize({
      ...state,
      monthlyLife: state.monthlyLife * scenario.spend,
      monthlyHousing: state.monthlyHousing * scenario.spend,
      annualMedical: state.annualMedical * scenario.spend,
      annualDream: state.annualDream * scenario.spend,
      retirementReturn: state.retirementReturn + scenario.returnShift
    });
    const result = calculate(adjusted);
    const card = document.createElement("article");
    card.className = "scenario-card";
    card.innerHTML = `<span>${scenario.name}</span><strong>${yen(result.requiredGrossRetirementPay)}</strong>`;
    grid.appendChild(card);
  });
}

function drawDonut(canvas, data) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0) || 1;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.38;
  const inner = radius * 0.58;
  let angle = -Math.PI / 2;

  data.forEach((item) => {
    const slice = (Math.max(0, item.value) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    angle += slice;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = "#fbfcfc";
  ctx.fill();
  ctx.fillStyle = "#1d2528";
  ctx.textAlign = "center";
  ctx.font = "700 22px sans-serif";
  ctx.fillText(yen(total), cx, cy - 4);
  ctx.fillStyle = "#657174";
  ctx.font = "12px sans-serif";
  ctx.fillText("生涯支出と収入の構成", cx, cy + 18);
}

function drawLineChart(canvas, plan, full) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const margin = { top: 22, right: 20, bottom: 34, left: 54 };
  const all = [...plan, ...full].map((p) => p.balance);
  const min = Math.min(0, ...all);
  const max = Math.max(100, ...all);
  const ageMin = plan[0]?.age ?? 60;
  const ageMax = plan.at(-1)?.age ?? 90;

  ctx.strokeStyle = "#d9e1de";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + ((h - margin.top - margin.bottom) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(w - margin.right, y);
    ctx.stroke();
  }

  const zeroY = scaleY(0, min, max, h, margin);
  ctx.strokeStyle = "#b43d37";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(margin.left, zeroY);
  ctx.lineTo(w - margin.right, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  drawSeries(ctx, full, ageMin, ageMax, min, max, w, h, margin, "#2f8f72");
  drawSeries(ctx, plan, ageMin, ageMax, min, max, w, h, margin, colors.line);

  ctx.fillStyle = "#657174";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${ageMin}歳`, margin.left, h - 10);
  ctx.textAlign = "right";
  ctx.fillText(`${ageMax}歳`, w - margin.right, h - 10);
  ctx.textAlign = "left";
  ctx.fillText("現在案", margin.left, 16);
  ctx.fillStyle = colors.line;
  ctx.fillRect(margin.left + 48, 8, 18, 4);
  ctx.fillStyle = "#657174";
  ctx.fillText("必要退職金を満たす案", margin.left + 78, 16);
  ctx.fillStyle = "#2f8f72";
  ctx.fillRect(margin.left + 196, 8, 18, 4);
}

function drawSeries(ctx, points, ageMin, ageMax, min, max, w, h, margin, color) {
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = scaleX(point.age, ageMin, ageMax, w, margin);
    const y = scaleY(point.balance, min, max, h, margin);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function scaleX(age, ageMin, ageMax, w, margin) {
  const span = Math.max(1, ageMax - ageMin);
  return margin.left + ((age - ageMin) / span) * (w - margin.left - margin.right);
}

function scaleY(value, min, max, h, margin) {
  const span = Math.max(1, max - min);
  return margin.top + (1 - (value - min) / span) * (h - margin.top - margin.bottom);
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function yen(value) {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded)) return "-";
  return `${rounded.toLocaleString("ja-JP")}万円`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
