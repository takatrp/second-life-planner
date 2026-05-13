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
  careMonthly: 8.3,
  careYears: 5,
  careOneTime: 74,
  debtAtRetire: 0,
  pensionSelf: 160,
  pensionSelfChecked: 0,
  pensionSpouse: 90,
  pensionSpouseChecked: 0,
  annuityAnnual: 120,
  annuityYears: 10,
  workIncome: 120,
  workIncomeType: 0,
  workUntilAge: 70,
  otherIncome: 60,
  retirementReturn: 1,
  inflationRate: 2,
  personalAssetsNow: 1500,
  monthlySaving: 20,
  preRetireReturn: 2,
  plannedRetirementPay: 2500,
  retirementNetRatio: 85,
  finalMonthlyComp: 120,
  officerYears: 25,
  meritMultiplier: 3,
  corporateReserveNow: 800,
  corporateAnnualReserve: 120,
  insuranceCashAtRetire: 1500,
  guaranteeDebt: 0,
  guaranteeReleaseStatus: 0,
  optionSpendReview: false,
  optionRetireLater: false,
  optionWorkIncome: false,
  optionPersonalSaving: false,
  optionCorporateReserve: false,
  optionInsuranceReserve: false,
  selectedDirection: "",
  checkNenkinSelf: false,
  checkNenkinSpouse: false,
  checkRetirementRule: false,
  checkMeritLimit: false,
  checkGuaranteeDebt: false,
  checkGuaranteeRelease: false,
  checkInsuranceCash: false
};

const colors = {
  pension: "#2f67a2",
  personal: "#176b54",
  retirement: "#b66b12",
  gap: "#b43d37",
  line: "#6860a8"
};

const STORAGE_KEY = "second-life-planner-state-v1";
const VERSION = "Rev.4";
const els = {};

const coreAssumptionFields = [
  "vision", "currentAge", "retireAge", "lifeAge", "pensionStartAge", "hasSpouse", "spouseAge",
  "monthlyLife", "monthlyHousing", "annualMedical", "annualDream", "oneTimeEvent", "familySupport",
  "careMonthly", "careYears", "careOneTime", "debtAtRetire", "pensionSelf", "pensionSpouse",
  "annuityAnnual", "annuityYears", "workIncome", "workIncomeType", "workUntilAge", "otherIncome",
  "retirementReturn", "inflationRate", "personalAssetsNow", "monthlySaving", "preRetireReturn",
  "plannedRetirementPay", "retirementNetRatio", "finalMonthlyComp", "officerYears", "meritMultiplier",
  "corporateReserveNow", "corporateAnnualReserve", "insuranceCashAtRetire", "guaranteeDebt", "guaranteeReleaseStatus"
];

const proposalChecks = [
  { key: "checkNenkinSelf", label: "ねんきん定期便を確認したか", homework: "本人のねんきん定期便を確認する" },
  { key: "checkNenkinSpouse", label: "配偶者の年金加入歴を確認したか", homework: "配偶者の年金加入歴、加給年金・振替加算を確認する" },
  { key: "checkRetirementRule", label: "役員退職給与規程を確認したか", homework: "役員退職給与規程と議事録を確認する" },
  { key: "checkMeritLimit", label: "功績倍率法の目安と予定退職金の整合を確認したか", homework: "最終報酬月額・在任年数・功績倍率の整合を確認する" },
  { key: "checkGuaranteeDebt", label: "法人借入の経営者保証残を確認したか", homework: "法人借入の保証残と保証契約を確認する" },
  { key: "checkGuaranteeRelease", label: "保証解除の見込みを確認したか", homework: "事業承継時の保証解除条件を確認する" },
  { key: "checkInsuranceCash", label: "法人保険・積立商品の解約返戻金見込みを確認したか", homework: "保険・積立商品の解約返戻金見込みを設計書で確認する" }
];

const optionDefinitions = [
  {
    key: "optionSpendReview",
    title: "支出水準の見直し",
    content: "基本生活費、住居費、趣味・旅行、介護想定を見直し、必要資金そのものを下げる。",
    feature: "会社側の資金繰りや税務設計に依存せず、生活設計から不足を圧縮できる。",
    caution: "ありたい老後を削りすぎると納得感が落ちるため、削る項目と残す項目を分ける。"
  },
  {
    key: "optionRetireLater",
    title: "引退時期の延長",
    content: "引退予定を後ろにずらし、積立期間と収入期間を伸ばす。",
    feature: "個人資産形成と法人準備の期間を同時に確保しやすい。",
    caution: "健康、後継者、現場負担、金融機関との関係を合わせて確認する。"
  },
  {
    key: "optionWorkIncome",
    title: "引退後収入の継続",
    content: "顧問料、相談役収入、事業収入などを一定期間残す。",
    feature: "退職直後の取り崩しを抑え、必要退職金を圧縮しやすい。",
    caution: "役員報酬・給与として受ける場合は在職老齢年金の調整を確認する。"
  },
  {
    key: "optionPersonalSaving",
    title: "個人積立の増額",
    content: "NISA、小規模企業共済、預貯金など個人側の積立額を増やす。",
    feature: "会社に依存しない老後資金を増やし、退職金への依存度を下げられる。",
    caution: "役員報酬、所得税・住民税、家計キャッシュフローとの両立を確認する。"
  },
  {
    key: "optionCorporateReserve",
    title: "法人内部留保の積み増し",
    content: "利益計画と資金繰りの中で、退職金原資に回せる内部留保を増やす。",
    feature: "法人資金として柔軟性を残しながら、退職金原資の不足を埋められる。",
    caution: "運転資金、納税、借入返済、設備投資との優先順位を継続MAS等で確認する。"
  },
  {
    key: "optionInsuranceReserve",
    title: "法人保険等による退職金原資の準備",
    content: "法人保険・積立商品等を使い、退職時点の原資準備を目的化する。",
    feature: "退職時点を目的化した積立、事業資金との分離、保障機能を併せ持つ構造がある。",
    caution: "解約返戻率、損金性、保障額、途中解約リスク、資金繰りへの影響を確認する。"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  syncFooterMeta();

  document.querySelectorAll("[data-field]").forEach((input) => {
    els[input.dataset.field] = input;
    input.addEventListener("input", update);
    input.addEventListener("change", update);
  });

  document.getElementById("saveButton").addEventListener("click", saveState);
  document.getElementById("resetButton").addEventListener("click", resetState);
  document.getElementById("printButton").addEventListener("click", () => window.print());
  document.getElementById("closeCalc").addEventListener("click", () => document.getElementById("calcDialog").close());
  document.getElementById("generateSummaryButton").addEventListener("click", generateIssueSummary);
  document.getElementById("downloadSummaryJsonButton").addEventListener("click", downloadSummaryJson);

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-breakdown]");
    if (!trigger) return;
    openCalculationBreakdown(trigger.dataset.breakdown);
  });

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
    } else if (element.type === "checkbox") {
      state[key] = element.checked;
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
    if (els[key].type === "checkbox") {
      els[key].checked = Boolean(state[key] ?? fallback);
    } else {
      els[key].value = state[key] ?? fallback;
    }
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

function syncFooterMeta() {
  const yearEl = document.getElementById("cpy-year");
  const dateEl = document.getElementById("last-updated-date");
  const revEl = document.getElementById("build-rev");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  if (dateEl) {
    const modified = new Date(document.lastModified);
    const yyyy = String(modified.getFullYear());
    const mm = String(modified.getMonth() + 1).padStart(2, "0");
    const dd = String(modified.getDate()).padStart(2, "0");
    dateEl.textContent = `${yyyy}-${mm}-${dd}`;
  }
  if (revEl) revEl.textContent = VERSION;
}

function update() {
  const state = normalize(readState());
  const result = calculate(state);
  renderSummary(result);
  renderFundingChart(result);
  renderBalanceChart(result);
  renderAccuracyStatus(result);
  renderShortageChoices(result);
  renderBasis(result);
  renderProposalChecklist(result);
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
    retireRate: state.retirementReturn / 100,
    inflationRateDecimal: state.inflationRate / 100
  };
}

function calculate(state) {
  const annualBasicSpend = (state.monthlyLife + state.monthlyHousing) * 12 + state.annualMedical + state.annualDream;
  const oneTimeAtRetire = state.oneTimeEvent + state.familySupport + state.debtAtRetire;
  const careReserve = state.careMonthly * 12 * state.careYears + state.careOneTime;
  const careAge = Math.min(Math.max(state.retireAge + 10, 78), state.lifeAge);
  const personalAtRetire = futureValue(state.personalAssetsNow, state.monthlySaving * 12, state.preRate, state.yearsToRetire);
  const retirementTaxLimit = state.finalMonthlyComp * state.officerYears * state.meritMultiplier;

  const cashflows = [];
  let requiredCapital = oneTimeAtRetire;
  let incomePv = 0;
  let spendingPv = oneTimeAtRetire;

  for (let i = 0; i < state.retirementYears; i += 1) {
    const age = state.retireAge + i;
    const discount = Math.pow(1 + state.retireRate, i);
    const inflation = Math.pow(1 + state.inflationRateDecimal, i);
    const pension = age >= state.pensionStartAge ? state.pensionSelf + (state.hasSpouse ? state.pensionSpouse : 0) : 0;
    const annuity = i < state.annuityYears ? state.annuityAnnual : 0;
    const work = age < state.workUntilAge ? state.workIncome : 0;
    const other = state.otherIncome;
    const income = pension + annuity + work + other;
    const care = age === careAge ? careReserve * inflation : 0;
    const spending = annualBasicSpend * inflation + care;
    const deficit = Math.max(0, spending - income);

    incomePv += income / discount;
    spendingPv += spending / discount;
    requiredCapital += deficit / discount;
    cashflows.push({ age, income, spending, deficit, pension, annuity, work, other, care, inflation });
  }

  const requiredNetFromCompany = Math.max(0, requiredCapital - personalAtRetire);
  const requiredGrossRetirementPay = requiredNetFromCompany / state.netRatio;
  const plannedNetRetirementPay = state.plannedRetirementPay * state.netRatio;
  const retirementDesignGap = Math.max(0, requiredGrossRetirementPay - state.plannedRetirementPay);
  const requiredOverTaxLimit = Math.max(0, requiredGrossRetirementPay - retirementTaxLimit);
  const plannedOverTaxLimit = Math.max(0, state.plannedRetirementPay - retirementTaxLimit);

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
    careReserve,
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
    retirementTaxLimit,
    requiredOverTaxLimit,
    plannedOverTaxLimit,
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
  setHtml("requiredCapital", calcValueHtml(yen(result.requiredCapital), "requiredCapital"));
  setHtml("personalAtRetire", calcValueHtml(yen(result.personalAtRetire), "personalAtRetire"));
  setHtml("requiredRetirementPay", calcValueHtml(yen(result.requiredGrossRetirementPay), "requiredRetirementPay"));
  setHtml("annualPreparation", calcValueHtml(`${yen(result.annualAdditionalPreparation)}/年`, "annualPreparation"));

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

function openCalculationBreakdown(key) {
  const state = normalize(readState());
  const result = calculate(state);
  const item = getCalculationBreakdowns(result)[key];
  if (!item) return;

  document.getElementById("calcTitle").textContent = item.title;
  document.getElementById("calcBody").innerHTML = `
    ${item.note ? `<p class="calc-note-box">${esc(item.note)}</p>` : ""}
    <ol class="calc-lines">
      ${item.lines.map((line, index) => `<li><b>${index + 1}</b><code>${esc(line)}</code></li>`).join("")}
    </ol>
  `;
  document.getElementById("calcDialog").showModal();
}

function getCalculationBreakdowns(result) {
  const { state } = result;
  const yearlyDeficitPv = Math.max(0, result.requiredCapital - result.oneTimeAtRetire);
  const personalStartGrowth = state.personalAssetsNow * Math.pow(1 + state.preRate, state.yearsToRetire);
  const personalContributionGrowth = result.personalAtRetire - personalStartGrowth;
  const netShortage = Math.max(0, result.requiredCapital - result.personalAtRetire);
  const corporateReserveGrowth = futureValue(state.corporateReserveNow, state.corporateAnnualReserve, state.preRate, state.yearsToRetire);

  return {
    requiredCapital: {
      title: "必要資金の計算過程",
      note: "退職時点で用意しておきたい生活資金です。各年の不足額を退職時点の価値に割り戻して、一時支出を加えています。",
      lines: [
        `年間基本支出 = (基本生活費 ${yen(state.monthlyLife)} + 住居費 ${yen(state.monthlyHousing)}) x 12 + 医療 ${yen(state.annualMedical)} + 趣味等 ${yen(state.annualDream)} = ${yen(result.annualBasicSpend)}/年`,
        `退職時一時支出 = 退職時イベント ${yen(state.oneTimeEvent)} + 子・孫支援 ${yen(state.familySupport)} + 退職時借入返済 ${yen(state.debtAtRetire)} = ${yen(result.oneTimeAtRetire)}`,
        `介護予備 = 月額 ${man(state.careMonthly)} x 12か月 x ${state.careYears}年 + 一時費用 ${yen(state.careOneTime)} = ${yen(result.careReserve)}。${result.careAge}歳時点にインフレ反映して計上`,
        `各年不足額 = max(0, インフレ反映後支出 - 公的年金・年金保険・仕事収入・その他収入)。老後運用利回り ${pct(state.retirementReturn)} で退職時点に割引`,
        `各年不足額の現在価値合計 ${yen(yearlyDeficitPv)} + 退職時一時支出 ${yen(result.oneTimeAtRetire)} = 必要資金 ${yen(result.requiredCapital)}`
      ]
    },
    personalAtRetire: {
      title: "個人資産見込の計算過程",
      note: "現在の個人金融資産と、引退までの個人積立を現役中利回りで積み上げた見込額です。",
      lines: [
        `引退までの年数 = 引退予定年齢 ${state.retireAge}歳 - 現在年齢 ${state.currentAge}歳 = ${state.yearsToRetire}年`,
        `現在資産の成長 = ${yen(state.personalAssetsNow)} x (1 + ${pct(state.preRetireReturn)})^${state.yearsToRetire} = ${yen(personalStartGrowth)}`,
        `毎年の積立 = 個人の月額積立 ${yen(state.monthlySaving)} x 12か月 = ${yen(state.monthlySaving * 12)}/年`,
        `積立の将来価値 = 年 ${yen(state.monthlySaving * 12)} を ${pct(state.preRetireReturn)} で${state.yearsToRetire}年積立 = ${yen(personalContributionGrowth)}`,
        `現在資産の成長 ${yen(personalStartGrowth)} + 積立の将来価値 ${yen(personalContributionGrowth)} = 個人資産見込 ${yen(result.personalAtRetire)}`
      ]
    },
    requiredRetirementPay: {
      title: "必要退職金の計算過程",
      note: "個人資産で不足する手取り額から、退職金の額面を逆算しています。税務上の損金算入目安も同時に確認します。",
      lines: [
        `手取り不足額 = max(0, 必要資金 ${yen(result.requiredCapital)} - 個人資産見込 ${yen(result.personalAtRetire)}) = ${yen(netShortage)}`,
        `必要退職金 = 手取り不足額 ${yen(netShortage)} ÷ 退職金手取り率 ${pct(state.retirementNetRatio)} = ${yen(result.requiredGrossRetirementPay)}`,
        `予定退職金との差額 = max(0, 必要退職金 ${yen(result.requiredGrossRetirementPay)} - 予定退職金 ${yen(state.plannedRetirementPay)}) = ${yen(result.retirementDesignGap)}`,
        `功績倍率法の目安 = 最終報酬月額 ${yen(state.finalMonthlyComp)} x 在任年数 ${state.officerYears}年 x 功績倍率 ${state.meritMultiplier} = ${yen(result.retirementTaxLimit)}`,
        `損金算入目安の超過額 = max(0, 必要退職金 ${yen(result.requiredGrossRetirementPay)} - 功績倍率法の目安 ${yen(result.retirementTaxLimit)}) = ${yen(result.requiredOverTaxLimit)}`
      ]
    },
    annualPreparation: {
      title: "追加準備の計算過程",
      note: "必要退職金に対して、法人側で準備できる退職金原資が不足する場合の年額積立目安です。",
      lines: [
        `法人内準備の将来価値 = 既準備額 ${yen(state.corporateReserveNow)} と年次積立 ${yen(state.corporateAnnualReserve)}/年を ${pct(state.preRetireReturn)} で${state.yearsToRetire}年積立 = ${yen(corporateReserveGrowth)}`,
        `退職時に使える法人原資 = 法人内準備の将来価値 ${yen(corporateReserveGrowth)} + 保険等の退職時見込額 ${yen(state.insuranceCashAtRetire)} = ${yen(result.corporatePreparedGross)}`,
        `原資不足 = max(0, 必要退職金 ${yen(result.requiredGrossRetirementPay)} - 法人原資 ${yen(result.corporatePreparedGross)}) = ${yen(result.sourceGapForRequired)}`,
        state.yearsToRetire > 0
          ? `追加準備年額 = 原資不足 ${yen(result.sourceGapForRequired)} を ${pct(state.preRetireReturn)} で${state.yearsToRetire}年積み立てて作る年額 = ${yen(result.annualAdditionalPreparation)}/年`
          : `引退予定が現在以前のため、追加準備年額 = 原資不足 ${yen(result.sourceGapForRequired)} をそのまま即時準備額として表示 = ${yen(result.annualAdditionalPreparation)}/年`,
        `既存の法人年次積立余力 ${yen(state.corporateAnnualReserve)}/年とは別に、上記の不足を埋めるための追加目安として確認`
      ]
    }
  };
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

function renderShortageChoices(result) {
  const diagnosis = diagnoseShortageCause(result);
  setText("shortageCauseTitle", diagnosis.title);
  setText("shortageCauseText", diagnosis.text);

  const state = result.state;
  const effects = estimateOptionEffects(state);
  optionDefinitions.forEach((option) => {
    setText(`${option.key}Content`, option.content);
    setText(`${option.key}Effect`, effects[option.key]);
    setText(`${option.key}Feature`, option.feature);
    setText(`${option.key}Caution`, option.caution);
  });
}

function renderAccuracyStatus(result) {
  const status = getAccuracyStatus(result.state);
  const box = document.getElementById("precisionStatus");
  const warning = document.getElementById("initialValueWarning");
  const summaryPanel = document.querySelector(".summary-panel");
  box.className = `precision-status ${status.className}`;
  box.querySelector("strong").textContent = status.label;
  box.querySelector("span").textContent = status.text;
  summaryPanel.classList.toggle("is-provisional", status.key === "draft");

  const usingInitialValues = isUsingInitialValues(result.state);
  warning.hidden = !usingInitialValues;
  if (usingInitialValues) {
    warning.textContent = "初期値のまま試算しています。実数値で上書きしてください。";
  }
}

function renderProposalChecklist(result) {
  const unchecked = getUncheckedProposalChecks(result.state);
  setText("uncheckedCheckCount", unchecked.length ? `未確認 ${unchecked.length}件` : "すべて確認済み");
}

function getAccuracyStatus(state) {
  const checkedCount = proposalChecks.filter((item) => Boolean(state[item.key])).length;
  if (checkedCount === proposalChecks.length) {
    return {
      key: "ready",
      className: "ready",
      label: "提案可能水準",
      text: "主要な確認項目がすべて確認済みです。提案書化の前に証憑保存を確認してください。"
    };
  }
  if (checkedCount >= 3) {
    return {
      key: "meeting",
      className: "meeting",
      label: "面談用試算",
      text: "一部確認済みですが、提案前に未確認項目を埋める必要があります。"
    };
  }
  return {
    key: "draft",
    className: "draft",
    label: "仮置き試算",
    text: "主要な確認項目が未確認です。この状態の数字は提案には使えません。"
  };
}

function getUncheckedProposalChecks(state) {
  return proposalChecks.filter((item) => !state[item.key]);
}

function isUsingInitialValues(state) {
  const defaults = normalize({ ...fields });
  return coreAssumptionFields.every((key) => {
    if (!(key in fields)) return true;
    return String(state[key] ?? "") === String(defaults[key] ?? "");
  });
}

function diagnoseShortageCause(result) {
  const state = result.state;
  const baseGap = getOverallShortage(result);
  if (baseGap <= 0) {
    return {
      title: "不足は小さい状態です",
      text: "現在の入力では、生活資金と退職金原資の不足は大きくありません。未確認事項の確認後に再判定します。"
    };
  }

  const pensionRisk = estimatePensionRisk(state, baseGap);
  const scores = [
    { key: "personal", label: "個人資産の積立不足", value: Math.max(0, result.requiredCapital * 0.45 - result.personalAtRetire) },
    { key: "corporate", label: "法人準備不足", value: result.sourceGapForRequired },
    { key: "pension", label: "公的年金期待過大", value: pensionRisk },
    { key: "spending", label: "支出過大", value: estimateReduction(state, (draft) => reduceSpending(draft, 0.9)) }
  ].sort((a, b) => b.value - a.value);

  const top = scores[0];
  const second = scores[1];
  if (!top || top.value <= 0) {
    return {
      title: "不足の主因は特定しにくい状態です",
      text: "不足は複数の前提に薄く分散しています。各入力値の確認後に再判定します。"
    };
  }

  if (second && second.value >= top.value * 0.85) {
    return {
      title: `不足は${top.label}と${second.label}の複合要因です`,
      text: `寄与度は ${top.label} ${yen(top.value)}、${second.label} ${yen(second.value)} が近い水準です。`
    };
  }

  return {
    title: `不足の主因は${top.label}です`,
    text: `現在の入力では、${top.label}の寄与度が最も大きい状態です。`
  };
}

function estimateOptionEffects(state) {
  return {
    optionSpendReview: formatEffect(estimateReduction(state, (draft) => reduceSpending(draft, 0.9))),
    optionRetireLater: formatEffect(estimateReduction(state, (draft) => {
      draft.retireAge += 2;
      draft.workUntilAge = Math.max(draft.workUntilAge, draft.retireAge + 2);
    })),
    optionWorkIncome: formatEffect(estimateReduction(state, (draft) => {
      draft.workUntilAge += 3;
      draft.workIncome += 60;
    })),
    optionPersonalSaving: formatEffect(estimateReduction(state, (draft) => {
      draft.monthlySaving += 10;
    })),
    optionCorporateReserve: formatEffect(estimateReduction(state, (draft) => {
      draft.corporateAnnualReserve += 120;
    })),
    optionInsuranceReserve: formatEffect(estimateReduction(state, (draft) => {
      draft.insuranceCashAtRetire += 1000;
    }))
  };
}

function estimatePensionRisk(state, baseGap) {
  const pensionAdjusted = normalize({
    ...state,
    pensionSelf: state.pensionSelf * 0.75,
    pensionSpouse: state.pensionSpouse * 0.75
  });
  const stressedGap = getOverallShortage(calculate(pensionAdjusted));
  const stressImpact = Math.max(0, stressedGap - baseGap);
  const unverifiedFactor = (!state.pensionSelfChecked || (state.hasSpouse && !state.pensionSpouseChecked)) ? 1.25 : 0.55;
  return stressImpact * unverifiedFactor;
}

function estimateReduction(state, mutate) {
  const base = calculate(normalize({ ...state }));
  const draft = { ...state };
  mutate(draft);
  const adjusted = calculate(normalize(draft));
  return Math.max(0, getOverallShortage(base) - getOverallShortage(adjusted));
}

function getOverallShortage(result) {
  return Math.max(0, result.retirementDesignGap) + Math.max(0, result.sourceGapForRequired);
}

function reduceSpending(draft, ratio) {
  draft.monthlyLife *= ratio;
  draft.monthlyHousing *= ratio;
  draft.annualMedical *= ratio;
  draft.annualDream *= ratio;
  draft.careMonthly *= ratio;
  draft.careOneTime *= ratio;
}

function formatEffect(value) {
  return value > 0 ? `不足額を概算で ${yen(value)} 圧縮` : "不足額への直接影響は小さい";
}

function renderBasis(result) {
  const formulaList = document.getElementById("formulaList");
  const validationList = document.getElementById("validationList");
  if (!formulaList || !validationList) return;

  formulaList.innerHTML = "";
  validationList.innerHTML = "";

  const formulaItems = [
    `年間支出: (${yen(result.state.monthlyLife)} + ${yen(result.state.monthlyHousing)}) x 12 + 医療 ${yen(result.state.annualMedical)} + 趣味等 ${yen(result.state.annualDream)} = ${yen(result.annualBasicSpend)}/年。老後期間中はインフレ率 ${pct(result.state.inflationRate)} で増加。`,
    `介護予備: 月額 ${man(result.state.careMonthly)} x 12か月 x ${result.state.careYears}年 + 一時費用 ${yen(result.state.careOneTime)} = ${yen(result.careReserve)}。${result.careAge}歳時点に一括計上。`,
    `必要資金: 各年の不足額を老後運用利回り ${pct(result.state.retirementReturn)} で退職時点へ割引し、退職時イベント・家族支援・個人借入返済を加算 = ${yen(result.requiredCapital)}。`,
    `個人資産見込: 現在資産 ${yen(result.state.personalAssetsNow)} と年 ${yen(result.state.monthlySaving * 12)} の積立を、現役中利回り ${pct(result.state.preRetireReturn)} で${result.state.yearsToRetire}年積立 = ${yen(result.personalAtRetire)}。`,
    `必要退職金: (必要資金 ${yen(result.requiredCapital)} - 個人資産見込 ${yen(result.personalAtRetire)}) ÷ 手取り率 ${pct(result.state.retirementNetRatio)} = ${yen(result.requiredGrossRetirementPay)}。`,
    `功績倍率法の目安: 最終報酬月額 ${yen(result.state.finalMonthlyComp)} x 在任年数 ${result.state.officerYears}年 x 功績倍率 ${result.state.meritMultiplier} = ${yen(result.retirementTaxLimit)}。`,
    `法人原資: 既準備額 ${yen(result.state.corporateReserveNow)} と年 ${yen(result.state.corporateAnnualReserve)} の積立見込 + 保険等 ${yen(result.state.insuranceCashAtRetire)} = ${yen(result.corporatePreparedGross)}。不足分を年額換算すると ${yen(result.annualAdditionalPreparation)}/年。`
  ];

  formulaItems.forEach((text) => appendCheckItem(formulaList, "", text));

  const checks = buildValidationChecks(result);
  checks.forEach((item) => appendCheckItem(validationList, item.className, item.text));
}

function buildValidationChecks(result) {
  const checks = [];

  checks.push(result.requiredOverTaxLimit > 0
    ? { className: "bad", text: `必要退職金が功績倍率法の目安を ${yen(result.requiredOverTaxLimit)} 超過。逆算額をそのまま期待値にしない。` }
    : { className: "", text: "必要退職金は功績倍率法の目安内。報酬月額・在任年数・功績倍率の根拠を保存。" });

  checks.push(result.state.pensionSelfChecked
    ? { className: "", text: "本人年金額は確認済み扱い。ねんきん定期便等の金額で入力されている前提。" }
    : { className: "warn", text: "本人年金額が未確認。初期値160万円のまま提案書に進めない。" });

  if (result.state.hasSpouse) {
    checks.push(result.state.pensionSpouseChecked
      ? { className: "", text: "配偶者年金は加入歴確認済み扱い。専業主婦、役員、勤務歴、加給年金・振替加算を確認。" }
      : { className: "warn", text: "配偶者年金が未確認。加入歴、加給年金・振替加算、役員報酬歴を確認。" });
  }

  checks.push(result.state.workIncome > 0 && result.state.workIncomeType === 1 && result.state.workUntilAge > result.state.pensionStartAge
    ? { className: "warn", text: "年金開始後も給与・役員報酬が残るため、在職老齢年金の調整対象になる可能性。" }
    : { className: "", text: "退職後収入と在職老齢年金の重なりは大きな警告なし。収入区分は面談で確認。" });

  checks.push(result.state.inflationRate >= 2
    ? { className: "warn", text: `インフレ率 ${pct(result.state.inflationRate)} を反映中。支出は年ごとに増えるため、必要資金が大きくなりやすい。` }
    : { className: "", text: `インフレ率 ${pct(result.state.inflationRate)} で試算中。物価上振れ時の感度も確認。` });

  checks.push(result.state.guaranteeDebt > 0 && result.state.guaranteeReleaseStatus !== 2
    ? { className: "warn", text: "経営者保証の解除が未確定。引退後の会社依存リスクとして、生活資金とは別枠で確認。" }
    : { className: "", text: "経営者保証は大きな未解消リスクなし。保証契約・金融機関交渉状況を証憑で確認。" });

  return checks;
}

function appendCheckItem(list, className, text) {
  const li = document.createElement("li");
  li.className = className;
  li.textContent = text;
  list.appendChild(li);
}

function generateIssueSummary() {
  const summary = buildIssueSummary();
  document.getElementById("summaryOutput").value = formatIssueSummaryText(summary);
}

function downloadSummaryJson() {
  const summary = buildIssueSummary();
  const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "second-life-issue-summary.json";
  link.click();
  URL.revokeObjectURL(url);
}

function buildIssueSummary() {
  const state = normalize(readState());
  const result = calculate(state);
  const diagnosis = diagnoseShortageCause(result);
  const selectedOptions = optionDefinitions.filter((option) => state[option.key]).map((option) => option.title);
  const unchecked = getUncheckedProposalChecks(state);

  return {
    title: "論点整理サマリー",
    status: getAccuracyStatus(state).label,
    hasUncheckedItems: unchecked.length > 0,
    vision: state.vision || "未入力",
    result: {
      requiredCapital: yen(result.requiredCapital),
      personalAtRetire: yen(result.personalAtRetire),
      requiredRetirementPay: yen(result.requiredGrossRetirementPay),
      annualPreparation: `${yen(result.annualAdditionalPreparation)}/年`
    },
    shortageCause: diagnosis.title,
    consideredOptions: selectedOptions.length ? selectedOptions : ["未選択"],
    selectedDirection: state.selectedDirection || "未入力",
    uncheckedItems: unchecked.map((item) => item.label),
    homework: unchecked.map((item) => item.homework)
  };
}

function formatIssueSummaryText(summary) {
  return [
    "【論点整理サマリー】",
    `精度ステータス: ${summary.status}${summary.hasUncheckedItems ? "（未確認事項あり）" : ""}`,
    "",
    "■ 今回確認したありたい老後",
    summary.vision,
    "",
    "■ 試算結果",
    `必要資金: ${summary.result.requiredCapital}`,
    `個人資産見込: ${summary.result.personalAtRetire}`,
    `必要退職金: ${summary.result.requiredRetirementPay}`,
    `追加準備: ${summary.result.annualPreparation}`,
    "",
    "■ 不足の主因",
    summary.shortageCause,
    "",
    "■ 検討した打ち手の選択肢",
    summary.consideredOptions.map((item) => `・${item}`).join("\n"),
    "",
    "■ 経営者が選んだ方向性",
    summary.selectedDirection,
    "",
    "■ 未確認事項",
    summary.uncheckedItems.length ? summary.uncheckedItems.map((item) => `・${item}`).join("\n") : "なし",
    "",
    "■ 次回までの宿題",
    summary.homework.length ? summary.homework.map((item) => `・${item}`).join("\n") : "なし"
  ].join("\n");
}

function renderScenarios(state) {
  const scenarios = [
    { name: "低物価", spend: 0.95, returnShift: -0.25, inflation: 0.5 },
    { name: "標準", spend: 1, returnShift: 0, inflation: state.inflationRate },
    { name: "物価上振れ", spend: 1.1, returnShift: -0.25, inflation: Math.max(2, state.inflationRate + 1) }
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
      retirementReturn: state.retirementReturn + scenario.returnShift,
      inflationRate: scenario.inflation
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

function setHtml(id, html) {
  document.getElementById(id).innerHTML = html;
}

function calcValueHtml(value, key) {
  const text = esc(value);
  return key ? `<button type="button" class="calc-link" data-breakdown="${esc(key)}" title="計算過程を表示">${text}</button>` : text;
}

function yen(value) {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded)) return "-";
  return `${rounded.toLocaleString("ja-JP")}万円`;
}

function man(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return `${amount.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万円`;
}

function pct(value) {
  return `${Number(value).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}%`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
