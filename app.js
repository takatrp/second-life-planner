const fields = {
  vision: "夫婦で健康に過ごし、年に数回は旅行へ行ける状態を維持したい。会社に過度に依存せず、退職後の生活費を見える化しておきたい。",
  currentAge: 50,
  retireAge: 65,
  lifeAge: 88,
  pensionStartAge: 65,
  hasSpouse: 1,
  spouseAge: 48,
  expenseMode: "total",
  monthlyExpenseTotal: 45 + (35 + 240) / 12,
  monthlyLife: 45,
  monthlyHousing: 0,
  annualMedical: 35,
  annualDream: 240,
  oneTimeEvent: 500,
  familySupport: 300,
  careMonthly: 9,
  careMonths: 55,
  careOneTime: 47.2,
  careStartAge: 78,
  careSubject: "self",
  debtAtRetire: 0,
  pensionSelf: 160,
  pensionSelfChecked: 0,
  pensionSpouse: 90,
  spousePensionStartAge: 65,
  pensionSelfBasis: "net",
  pensionSpouseBasis: "net",
  pensionSelfNetRatio: 100,
  pensionSpouseNetRatio: 100,
  pensionSpouseChecked: 0,
  annuityAnnual: 120,
  annuityYears: 10,
  workIncome: 120,
  workIncomeType: 0,
  workUntilAge: 70,
  otherIncome: 60,
  retirementReturn: 1,
  inflationRate: 2,
  priceBasis: "retirement",
  personalAssetsNow: 1500,
  monthlySaving: 20,
  preRetireReturn: 2,
  plannedRetirementPay: 2500,
  retirementNetRatio: 85,
  finalMonthlyComp: 120,
  officerYears: 25,
  meritMultiplier: 3,
  corporateReserveNow: 800,
  confirmedPayable: null,
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
  checkInsuranceCash: false,
  migrationReviewed: false
};

const colors = {
  pension: "#2f67a2",
  personal: "#176b54",
  retirement: "#b66b12",
  gap: "#b43d37",
  line: "#6860a8"
};

const STORAGE_KEY = "second-life-planner-state-v2";
const LEGACY_STORAGE_KEY = "second-life-planner-state-v1";
const VERSION = "Rev.6.1";
const els = {};
let currentPlan = { version: PlannerModel.VERSION, state: { ...fields, evidence:{} }, sources: structuredClone(PlannerModel.SOURCES) };
let loadError = "";
let comparisonBaseline = "";
let rememberedExpenseTotal = fields.monthlyExpenseTotal;
let expenseInputMode = fields.expenseMode;
const evidenceLabels = PlannerModel.EVIDENCE_LABELS;

const coreAssumptionFields = [
  "vision", "currentAge", "retireAge", "lifeAge", "pensionStartAge", "hasSpouse", "spouseAge",
  "monthlyLife", "monthlyHousing", "annualMedical", "annualDream", "oneTimeEvent", "familySupport",
  "careMonthly", "careMonths", "careOneTime", "debtAtRetire", "pensionSelf", "pensionSpouse",
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
  { key: "checkInsuranceCash", label: "法人側の積立・金融商品の退職時見込額を確認したか", homework: "法人側の積立・金融商品の退職時見込額を資料で確認する" }
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
    title: "法人側の目的別積立",
    content: "法人側で退職時点に使う資金を、目的を分けて積み立てる。",
    feature: "通常の事業資金と目的を分け、退職時点に向けた原資を管理しやすい。",
    caution: "商品性、換金時期、税務処理、途中解約リスク、資金繰りへの影響を確認する。"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  syncFooterMeta();
  createEvidenceFields();

  document.querySelectorAll("[data-field]").forEach((input) => {
    els[input.dataset.field] = input;
    input.addEventListener("input", onFieldChange);
    input.addEventListener("change", onFieldChange);
  });

  document.getElementById("saveButton").addEventListener("click", saveState);
  document.getElementById("exportPlanButton").addEventListener("click", exportPlan);
  document.getElementById("importPlanInput").addEventListener("change", importPlan);
  document.getElementById("startFromLegacyButton").addEventListener("click", startFromLegacy);
  document.getElementById("resetButton").addEventListener("click", resetState);
  document.getElementById("printButton").addEventListener("click", () => {
    if (PlannerModel.calculate(readState()).errors.length) return update();
    generateIssueSummary(); window.print();
  });
  document.getElementById("closeCalc").addEventListener("click", () => document.getElementById("calcDialog").close());
  document.getElementById("generateSummaryButton").addEventListener("click", generateIssueSummary);
  document.getElementById("downloadSummaryJsonButton").addEventListener("click", downloadSummaryJson);

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-breakdown]");
    if (!trigger) return;
    openCalculationBreakdown(trigger.dataset.breakdown);
  });

  for (const id of ["compareLiving","compareSaving","compareRetireAge"]) {
    document.getElementById(id).addEventListener("input", () => renderQuickComparisons(PlannerModel.calculate(readState())));
  }
  document.getElementById("resetComparisonButton").addEventListener("click", () => {
    comparisonBaseline = ""; update();
  });
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener("click", () => {
    const target=document.getElementById(link.getAttribute("href").slice(1));
    if (target?.tagName === "DETAILS") target.open=true;
  }));
  loadState();
  update();
});

function readState() {
  const state = {...currentPlan.state};
  for (const [key, fallback] of Object.entries(fields)) {
    const element = els[key];
    if (!element) continue;
    if (element.tagName === "TEXTAREA") {
      state[key] = element.value.trim();
    } else if (element.type === "checkbox") {
      state[key] = element.checked;
    } else if (element.tagName === "SELECT") {
      state[key] = typeof fallback === "string" ? element.value : Number(element.value);
    } else {
      state[key] = element.value.trim() === "" ? (key === "confirmedPayable" ? null : "") : Number(element.value);
    }
  }
  state.evidence = structuredClone(currentPlan.state.evidence || {});
  document.querySelectorAll("[data-evidence]").forEach(input => {
    const [key, part] = input.dataset.evidence.split(":");
    (state.evidence[key] ||= {})[part] = input.value;
  });
  if (currentPlan.state.migrationWarning) state.migrationWarning = currentPlan.state.migrationWarning;
  if (currentPlan.state.legacySummaryOnly) state.legacySummaryOnly = true;
  if (state.expenseMode==="breakdown") state.monthlyExpenseTotal=rememberedExpenseTotal;
  else rememberedExpenseTotal=state.monthlyExpenseTotal;
  return state;
}

function writeState(state) {
  state=PlannerModel.normalizeExpenseState(state);
  rememberedExpenseTotal=state.monthlyExpenseTotal;
  expenseInputMode=state.expenseMode;
  for (const [key, fallback] of Object.entries(fields)) {
    if (!els[key]) continue;
    if (els[key].type === "checkbox") {
      els[key].checked = Boolean(state[key] ?? fallback);
    } else {
      els[key].value = state[key] ?? (fallback ?? "");
    }
  }
  document.querySelectorAll("[data-evidence]").forEach(input => {
    const [key, part] = input.dataset.evidence.split(":");
    const item=state.evidence?.[key];
    input.value = part==="status" && item?.status==="verified" && !PlannerModel.verified(state,key)
      ? "assumed" : item?.[part] || (part === "status" ? "assumed" : "");
  });
  document.querySelector(".migration-check").hidden = !state.migrationWarning || state.legacySummaryOnly;
}

function mergeLoadedState(saved) {
  const state={...fields,...PlannerModel.normalizeExpenseState(saved)};
  for (const key of ['finalMonthlyComp','officerYears','meritMultiplier','guaranteeDebt']) {
    if (!Object.prototype.hasOwnProperty.call(saved,key)) state[key]='';
    else if (saved[key]!=='' && (typeof saved[key]!=='number' || !Number.isFinite(saved[key]) || saved[key]<0 || saved[key]>1e9))
      throw new Error(`${({finalMonthlyComp:"最終報酬月額",officerYears:"役員在任年数",meritMultiplier:"功績倍率",guaranteeDebt:"経営者保証残"})[key]}の参考値は0以上の有限な金額・数値、または未入力にしてください`);
  }
  return state;
}

function referenceValueError(state) {
  try {mergeLoadedState(state); return '';}
  catch (error) {return error.message;}
}

function loadState() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const next = raw ? PlannerModel.migrate(raw) : currentPlan;
    const state=mergeLoadedState(next.state);
    currentPlan=next;
    writeState(state);
  } catch (error) {
    currentPlan = {...currentPlan,legacyOriginal:raw || null};
    writeState(fields);
    loadError = `保存済みデータを読み込めませんでした。原本は保持しています: ${error.message}`;
  }
}

function saveState() {
  const state = readState();
  const referenceError=referenceValueError(state);
  if (referenceError) return showInputError(`保存できませんでした: ${referenceError}`);
  const result = PlannerModel.calculate(state);
  if (result.errors.length && !state.legacySummaryOnly) return update();
  currentPlan = { ...currentPlan, version: PlannerModel.VERSION, state,
    sources: currentPlan.sources || structuredClone(PlannerModel.SOURCES) };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPlan));
    loadError = "";
    flashButton("saveButton", "保存済み");
  } catch (error) { showInputError(`保存できませんでした: ${error.message}`); }
}

function resetState() {
  currentPlan = {version:PlannerModel.VERSION,state:{...fields,evidence:{}},sources:structuredClone(PlannerModel.SOURCES),
    legacyOriginal:currentPlan.legacyOriginal,legacyV2Original:currentPlan.legacyV2Original};
  writeState(fields);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPlan)); loadError=""; }
  catch (error) { loadError=`初期化した状態を保存できませんでした: ${error.message}`; }
  update();
}

function createEvidenceFields() {
  const container = document.getElementById("evidenceGrid");
  for (const [key,label] of Object.entries(evidenceLabels)) {
    const block = document.createElement("div");
    block.className = "evidence-item";
    const title = document.createElement("strong");
    title.textContent = label;
    block.appendChild(title);
    const select = document.createElement("select");
    select.dataset.evidence = `${key}:status`;
    for (const [value,text] of [["missing","未入力"],["assumed","仮定"],["verified","資料確認済み"]]) {
      const option = document.createElement("option"); option.value=value; option.textContent=text; select.appendChild(option);
    }
    block.appendChild(select);
    for (const [part,placeholder,type] of [["source","資料・出所","text"],["date","確認日","date"],["note","補足","text"]]) {
      const input=document.createElement("input"); input.dataset.evidence=`${key}:${part}`;
      input.type=type; input.placeholder=placeholder; input.setAttribute("aria-label",`${label}の${placeholder}`); block.appendChild(input);
    }
    const snapshot=document.createElement("input");
    snapshot.type="hidden"; snapshot.dataset.evidence=`${key}:verifiedValue`; block.appendChild(snapshot);
    select.addEventListener("change",()=>{
      snapshot.value=select.value==="verified"?PlannerModel.evidenceValue(readState(),key):"";
    });
    container.appendChild(block);
  }
  container.addEventListener("input",update);
  container.addEventListener("change",update);
}

function onFieldChange(event) {
  if (event?.target===els.expenseMode && els.expenseMode.value!==expenseInputMode) {
    if (expenseInputMode==='total') rememberedExpenseTotal=Number(els.monthlyExpenseTotal.value);
    else els.monthlyExpenseTotal.value=rememberedExpenseTotal;
    expenseInputMode=els.expenseMode.value;
  }
  const state=readState();
  for (const [key] of Object.entries(evidenceLabels)) {
    const status=document.querySelector(`[data-evidence="${key}:status"]`);
    const snapshot=document.querySelector(`[data-evidence="${key}:verifiedValue"]`);
    if (status.value==="verified" && snapshot.value!==PlannerModel.evidenceValue(state,key))
      status.value="assumed";
  }
  update();
}

function exportPlan() {
  const state=readState();
  const referenceError=referenceValueError(state);
  if (referenceError) return showInputError(`計画を出力できませんでした: ${referenceError}`);
  if (PlannerModel.calculate(state).errors.length && !state.legacySummaryOnly) return update();
  const envelope={...currentPlan,version:PlannerModel.VERSION,state,
    sources:currentPlan.sources || structuredClone(PlannerModel.SOURCES)};
  downloadJson(envelope,"second-life-plan.json");
}
async function importPlan(event) {
  const file=event.target.files?.[0];
  if (!file) return;
  try {
    const raw=await file.text();
    const next=PlannerModel.migrate(raw);
    const state=mergeLoadedState(next.state);
    const result=PlannerModel.calculate(state);
    if (result.errors.length && !state.legacySummaryOnly) throw new Error(result.errors.join("、"));
    currentPlan=next;
    writeState(state);
    document.getElementById("legacyImportError").hidden=true;
    update();
  } catch (error) { showInputError(`読込できませんでした。現在の計画は変更していません: ${error.message}`); }
  event.target.value="";
}
function startFromLegacy() {
  const state={...readState(),legacySummaryOnly:false,migrationReviewed:false};
  currentPlan={...currentPlan,state,sources:structuredClone(PlannerModel.SOURCES)};
  writeState(state);
  update();
}
function downloadJson(data,filename) {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showInputError(message) {
  const box=document.getElementById("inputErrors"); box.hidden=false; box.textContent=message;
  const legacy=document.getElementById("legacyImportError");
  legacy.hidden=false; legacy.textContent=message;
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
  const state = readState();
  const resultColumn=document.querySelector(".result-column");
  if (state.legacySummaryOnly) {
    resultColumn.classList.remove("is-invalid");
    resultColumn.classList.add("is-legacy");
    clearCalculatedResults("旧サマリーには入力値がないため、数値試算を停止しています");
    document.getElementById("legacySummaryPanel").hidden=false;
    document.getElementById("legacySummaryText").textContent=JSON.stringify(currentPlan.legacySummary,null,2);
    return;
  }
  resultColumn.classList.remove("is-legacy");
  document.getElementById("legacySummaryPanel").hidden=true;
  document.getElementById("legacyImportError").hidden=true;
  const result = PlannerModel.calculate(state);
  document.querySelectorAll('[data-spouse-field]').forEach(el=>{el.hidden=!Number(state.hasSpouse);});
  if (result.errors.length) {
    resultColumn.classList.add("is-invalid");
    clearCalculatedResults("入力内容が未完了・不正のため、試算結果を表示できません");
    showInputError(result.errors.join(" / "));
    document.getElementById("statusTitle").textContent = "入力内容を確認してください";
    document.getElementById("statusPill").textContent = "入力エラー";
    document.getElementById("statusPill").className = "status-pill bad";
    for (const id of ["requiredCapital","personalAtRetire","requiredRetirementPay","annualPreparation"])
      setText(id,"-");
    return;
  }
  resultColumn.classList.remove("is-invalid");
  document.getElementById("calculationDetails").hidden=false;
  document.getElementById("summaryOutput").hidden=false;
  const referenceError=referenceValueError(state);
  document.getElementById("inputErrors").hidden = !loadError && !referenceError;
  if (loadError || referenceError) document.getElementById("inputErrors").textContent = [loadError,referenceError].filter(Boolean).join(" / ");
  syncInputContext(result);
  renderSummary(result);
  renderFundingChart(result);
  renderBalanceChart(result);
  renderAccuracyStatus(result);
  renderShortageChoices(result);
  renderBasis(result);
  renderProposalChecklist(result);
  renderScenarios(state);
  renderIssueSummary(buildIssueSummary(state,result));
  renderQuickComparisons(result);
  renderMeetingPrint(result);
}

function clearCalculatedResults(message) {
  for (const id of ['firstShortage','additionalCapital','requiredCapital','personalAtRetire','requiredRetirementPay','annualPreparation','companyReadiness','runoutText','coverageText','outsideCostsText','fundingConditions','periodDescription','shortageCauseTitle','shortageCauseText','assumptionStrip','incomeAssumptions','careAssumptions']) setText(id,'-');
  for (const option of optionDefinitions) setText(`${option.key}Effect`,'入力内容を確認してください');
  for (const id of ['balanceChart','fundingChart']) {
    const canvas=document.getElementById(id); canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
  }
  for (const id of ['quickComparisonResults','essentialWarnings','assessmentReasonList','formulaList','validationList','fundingLegend','scenarioGrid']) document.getElementById(id).replaceChildren();
  document.getElementById('calculationDetails').hidden=true;
  document.getElementById('summaryOutput').value=message;
  document.getElementById('summaryOutput').hidden=true;
  document.getElementById('printSummary').textContent=message;
  document.getElementById('printMeetingSummary').textContent=message;
}

function syncInputContext(result) {
  const s=result.state;
  document.querySelectorAll('[data-spouse-field]').forEach(el=>{el.hidden=!s.hasSpouse;});
  const breakdown=result.annualBasicSpend/12;
  const totalMode=s.expenseMode==='total';
  els.monthlyExpenseTotal.readOnly=!totalMode;
  if (!totalMode) els.monthlyExpenseTotal.value=breakdown;
  document.querySelector('.total-expense-field > span').textContent=totalMode?'老後の生活費 合計':'老後の生活費 合計（内訳から計算）';
  els.expenseMode.options[0].textContent=`合計を入力（${man(rememberedExpenseTotal)}/月）`;
  els.expenseMode.options[1].textContent=`内訳を合算（${man(breakdown)}/月）`;
  setText('expenseModeNote',`合計入力 ${man(rememberedExpenseTotal)}/月、内訳合計 ${man(breakdown)}/月。切替えると選んだ側の金額で計算します`);
  setText('expenseModeSummary',totalMode?'生活費は合計入力だけを使用。保存中の内訳は重ねて加算しません':`生活費は内訳合計 ${man(breakdown)}/月を使用しています。合計欄を直接編集するには「生活費の内訳」で計算方法を切り替えてください`);
  setText('selfPensionLabel',`本人年金（${s.pensionSelfBasis==='gross'?'額面':'手取り見込'}）`);
  setText('spousePensionLabel',`配偶者年金（${s.pensionSpouseBasis==='gross'?'額面':'手取り見込'}）`);
  setText('assumptionStrip',`${s.retireAge}歳から${s.lifeAge}歳になるまで / ${s.priceBasis==='current'?'現在価格':'退職時点価格'} / 支出インフレ ${pct(s.inflationRate)} / 現役中の利回り ${pct(s.preRetireReturn)} / 老後 ${pct(s.retirementReturn)}。収入は固定額`);
  setText('incomeAssumptions',`年金開始: 本人${s.pensionStartAge}歳${s.hasSpouse?`・配偶者自身の${s.spousePensionStartAge}歳`:''}。額面入力時の手取り率: 本人${pct(s.pensionSelfNetRatio)}${s.hasSpouse?`・配偶者${pct(s.pensionSpouseNetRatio)}`:''}。年金保険 ${man(s.annuityAnnual)}/年×${s.annuityYears}年、仕事 ${man(s.workIncome)}/年（${s.workUntilAge}歳まで）、その他 ${man(s.otherIncome)}/年`);
  setText('careAssumptions',`介護: ${s.careSubject==='spouse'?'配偶者':'本人'}${s.careStartAge}歳から ${man(s.careMonthly)}/月×${s.careMonths}か月＋一時${man(s.careOneTime)}。退職時の一時支出合計 ${man(s.oneTimeEvent+s.familySupport+s.debtAtRetire)}。予定退職金の手取り率 ${pct(s.retirementNetRatio)}（仮定）`);
}

function comparisonLivingDraft(state, monthly) {
  const draft={...state};
  if (draft.expenseMode==='total') draft.monthlyExpenseTotal=monthly;
  else {
    const original=PlannerModel.calculate(state).annualBasicSpend/12;
    if (monthly===original) return draft;
    if (original>0) for (const key of ['monthlyLife','monthlyHousing','annualMedical','annualDream']) draft[key]*=monthly/original;
    else {draft.monthlyLife=monthly; draft.monthlyHousing=0; draft.annualMedical=0; draft.annualDream=0;}
  }
  return draft;
}

function renderQuickComparisons(result) {
  if (result.errors.length) return;
  const s=result.state;
  const signature=JSON.stringify(Object.entries(s).filter(([k])=>k!=='evidence'));
  if (signature!==comparisonBaseline) {
    comparisonBaseline=signature;
    document.getElementById('compareLiving').value=result.annualBasicSpend/12;
    document.getElementById('compareSaving').value=s.monthlySaving;
    document.getElementById('compareRetireAge').value=s.retireAge;
  }
  const specs=[
    ['生活費', 'compareLiving', value=>comparisonLivingDraft(s,value)],
    ['個人積立','compareSaving', value=>({...s,monthlySaving:value})],
    ['引退年齢','compareRetireAge', value=>({...s,retireAge:value})]
  ];
  const cards=specs.map(([label,id,change])=>{
    const value=document.getElementById(id).value;
    const card=document.createElement('article');
    if (value.trim()==='' || !Number.isFinite(Number(value)) || Number(value)<0) {card.textContent=`${label}: 比較する値を入力してください`;return card;}
    const comparison=PlannerModel.compare(s,change(Number(value)));
    if (comparison.errors) {card.textContent=`${label}: ${comparison.errors.join(' / ')}`;return card;}
    const after=comparison.after, convertedGap=after.householdGap/(1+s.preRate)**(after.state.retireAge-s.retireAge);
    const title=document.createElement('strong'); title.textContent=label;
    const amount=document.createElement('p');amount.textContent=`追加必要資金 ${yenNeed(convertedGap)}（${s.retireAge}歳時点換算）`;
    const runout=document.createElement('small');runout.textContent=after.planRunout?`${after.planRunout.age}歳の年に初めて不足`:'設定した期間では不足なし';
    card.append(title,amount,runout);return card;
  });
  document.getElementById('quickComparisonResults').replaceChildren(...cards);
}

function renderMeetingPrint(result) {
  const s=result.state, summary=buildIssueSummary(s,result);
  const essentials=Array.from(document.getElementById('essentialWarnings').children).map(el=>el.textContent);
  const sections=[
    ['試算条件',`${summary.period}（${s.retirementYears}年）。生活費 ${man(result.annualBasicSpend/12)}/月。${summary.basis}。支出インフレ ${pct(s.inflationRate)}、現役運用 ${pct(s.preRetireReturn)}、老後運用 ${pct(s.retirementReturn)}。年金等収入は固定額。年初収支後に運用益を反映`],
    ['生活資金',`${result.planRunout?`${result.planRunout.age}歳の年に初めて不足`:'設定した期間では不足なし'}。引退時の追加必要資金 ${yenNeed(result.householdGap)}。必要資金合計 ${yenNeed(result.requiredCapital)}、個人資産見込 ${yen(result.personalAtRetire)}。追加必要資金は初回不足年の赤字額ではありません`],
    ['退職金の条件',document.getElementById('fundingConditions').textContent+` 手取り率 ${pct(s.retirementNetRatio)}（仮定）。世帯と法人の不足は合算しません`],
    ['収入・介護',document.getElementById('incomeAssumptions').textContent+'。'+document.getElementById('careAssumptions').textContent+'。期間外介護費 '+yenNeed(result.careOutside)+'は必要資金に含まず'],
    ['確認・留意点',`${result.assessment.reasons.filter(x=>/未確認|根拠/.test(x)).length}項目の根拠・前提が未確認。${essentials.join(' / ')}。${summary.sources?.care?.title||'介護参照元未記録'}（${summary.sources?.care?.year||'年不明'}）。統計平均は個人の必要額・上限ではありません。将来の資金・運用を保証しません`],
    ['面談で選んだ方向',s.selectedDirection||'未入力'],
    ['次回の確認',summary.homework.slice(0,3).join(' / ')||'根拠と将来の変動を継続確認']
  ];
  const node=document.getElementById('printMeetingSummary');
  node.innerHTML=`<h1>セカンドライフ 面談サマリー</h1><p>${esc(summary.status)} / ${new Date().toISOString().slice(0,10)} / ${VERSION}</p>`+sections.map(([title,text])=>`<section><h2>${esc(title)}</h2><p>${esc(text)}</p></section>`).join('');
}

function renderSummary(result) {
  setHtml("requiredCapital", calcValueHtml(yenNeed(result.requiredCapital), "requiredCapital"));
  setHtml("personalAtRetire", calcValueHtml(yen(result.personalAtRetire), "personalAtRetire"));
  setHtml("requiredRetirementPay", calcValueHtml(yenNeed(result.requiredGrossRetirementPay), "requiredRetirementPay"));
  setHtml("annualPreparation", calcValueHtml(result.annualAdditionalPreparation === null
    ? `${yenNeed(result.sourceGapForRequired)} 即時` : `${yenNeed(result.annualAdditionalPreparation)}/年`, "annualPreparation"));
  renderReverseEquation(result);
  setText("firstShortage",result.planRunout ? `${result.planRunout.age}歳の年に初めて不足` : "設定した期間では不足なし");
  setText("additionalCapital",yenNeed(result.householdGap));
  const warnings=[];
  const referenceError=referenceValueError(result.state);
  if (referenceError) warnings.push(referenceError);
  if (result.state.guaranteeDebt==='') warnings.push("経営者保証残が未入力です。保証がないと確認した値ではありません");
  if (result.state.migrationWarning && !result.state.migrationReviewed) warnings.push(result.state.migrationWarning);
  if (result.state.pensionStartAge<65 && result.state.pensionSelf>0 && !PlannerModel.verified(result.state,'earlyPensionSelf')) warnings.push("本人の65歳前受給額の根拠は未確認です");
  if (result.state.hasSpouse && result.state.spousePensionStartAge<65 && result.state.pensionSpouse>0 && !PlannerModel.verified(result.state,'earlyPensionSpouse')) warnings.push("配偶者の65歳前受給額の根拠は未確認です");
  if (result.state.workIncome>0 && result.state.workIncomeType===1 && result.state.workUntilAge>result.state.pensionStartAge) warnings.push("給与・役員報酬と年金が重なるため、在職老齢年金を個別確認してください");
  if (result.state.guaranteeDebt>0 && result.state.guaranteeReleaseStatus!==2) warnings.push("法人借入の経営者保証の解除は未確定です");
  document.getElementById("essentialWarnings").replaceChildren(...warnings.map(text=>{
    const li=document.createElement("li"); li.textContent=text; return li;
  }));
  setText("companyReadiness",result.state.plannedRetirementPay>0
    ? `予定額面 ${yen(result.state.plannedRetirementPay)} / 確認済み支払可能額 ${result.confirmedPayable===null?'未入力':yen(result.confirmedPayable)} / 法人原資不足 ${result.companyGap===null?'未確認':yenNeed(result.companyGap)}。準備見込 ${yen(result.corporatePreparedGross)} は支払能力の確認値ではありません。`
    : "予定退職金は0万円です。法人原資は世帯の充足判定に含めていません。");

  const statusTitle = document.getElementById("statusTitle");
  const statusPill = document.getElementById("statusPill");
  statusPill.classList.remove("warn", "bad");

  const labels={shortage:"不足あり",assumed:"仮定・未確認あり",adequate:"設定条件内では充足"};
  statusTitle.textContent=labels[result.assessment.key];
  statusPill.textContent=labels[result.assessment.key];
  if (result.assessment.key==="shortage") statusPill.classList.add("bad");
  if (result.assessment.key==="assumed") statusPill.classList.add("warn");
  setText("periodDescription",`${result.state.retireAge}歳から${result.state.lifeAge}歳になるまでの${result.state.retirementYears}年間。年初に収支を計上し、その後で運用益を反映します。年内の入出金時期は簡略化しています。`);
  const reasons=document.getElementById("assessmentReasonList");
  reasons.replaceChildren(...result.assessment.reasons.map(reason=>{
    const p=document.createElement("p");p.textContent=reason;return p;
  }));
  document.getElementById("assessmentReasons").hidden=!result.assessment.reasons.length;
  setText("assessmentReasonsTitle",`判定理由・未確認事項（${result.assessment.reasons.length}件）`);
  setText("fundingConditions",result.state.plannedRetirementPay>0
    ? `世帯計画は予定退職金${yen(result.state.plannedRetirementPay)}（額面）が予定どおり支払われた場合の手取り${yen(result.plannedNetRetirementPay)}を含みます。法人の確認済み支払可能額: ${result.confirmedPayable===null?"未入力":yen(result.confirmedPayable)}。${result.companyGap===null?"支払原資は未確認":`法人原資不足 ${yenNeed(result.companyGap)}`}。`:
      "退職金を使わない計画です。法人原資の確認は判定に含めません。");
  setText("outsideCostsText",result.careOutside>0
    ? `${yenNeed(result.careOutside)}。計画期間外の予定介護費用で、必要資金には含めていません。別途確保または期間延長を検討してください。`:
      "現在の入力では、計画期間外の介護予定費用はありません。");
}

function renderReverseEquation(result) {
  const need = Math.max(0, result.requiredCapital);
  const personalApplied = Math.min(Math.max(0, result.personalAtRetire), need);
  const retirementNet = Math.max(0, result.requiredNetFromCompany);
  const personalShare = need > 0 ? (personalApplied / need) * 100 : 0;
  const retirementShare = need > 0 ? (retirementNet / need) * 100 : 0;
  const surplusPersonal = Math.max(0, result.personalAtRetire - need);

  setHtml("equationNeed", calcValueHtml(yenNeed(need), "requiredCapital"));
  setHtml("equationPersonal", calcValueHtml(yen(personalApplied), "personalAtRetire"));
  setHtml("equationRetirementNet", calcValueHtml(yenNeed(retirementNet), "requiredRetirementPay"));
  document.getElementById("equationPersonalBar").style.width = `${clamp(personalShare, 0, 100)}%`;
  document.getElementById("equationRetirementBar").style.width = `${clamp(retirementShare, 0, 100)}%`;

  const note = surplusPersonal > 0
    ? `個人資産見込は必要資金を ${yen(surplusPersonal)} 上回るため、必要退職金手取は0円です。`
    : `必要退職金手取 ${yenNeed(retirementNet)} を額面に直すと、必要退職金 ${yenNeed(result.requiredGrossRetirementPay)} です。期間中の黒字は翌年へ繰り越します。`;
  setText("equationNote", note);
}

function openCalculationBreakdown(key) {
  const state = readState();
  const result = PlannerModel.calculate(state);
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
  return {
    requiredCapital: {
      title: "必要資金の計算過程",
      note: "引退時点の最小資金です。各年の黒字を繰り越し、どの年も残高が負にならない額を二分探索（機械精度まで精密化）で求めます。",
      lines: [
        `試算期間 = ${state.retireAge}歳から${state.lifeAge}歳になるまでの${state.retirementYears}年`,
        `退職時一時支出 ${yen(result.oneTimeAtRetire)} を初期資金から控除`,
        `各年の年初残高にその年の収入を加え、支出を引き、その後に運用率 ${pct(state.retirementReturn)} を適用`,
        `介護費用は期間内 ${yen(result.careInside)}、期間外 ${yen(result.careOutside)}。期間外は必要資金に含めません`,
        `すべての年初収支後と年末の残高が負にならない最小の初期資金 = ${yenNeed(result.requiredCapital)}`
      ]
    },
    personalAtRetire: {
      title: "個人資産見込の計算過程",
      note: "現役中の積立は毎年末に行う簡易計算です。",
      lines: [
        `引退までの年数 = 引退予定年齢 ${state.retireAge}歳 - 現在年齢 ${state.currentAge}歳 = ${state.yearsToRetire}年`,
        `現在資産 ${yen(state.personalAssetsNow)} と年末積立 ${yen(state.monthlySaving*12)}/年、利回り ${pct(state.preRetireReturn)}`,
        `引退時の個人資産見込 = ${yen(result.personalAtRetire)}`
      ]
    },
    requiredRetirementPay: {
      title: "必要退職金の計算過程",
      note: "手取り率は仮定です。税額・損金算入は詳しく試算で確認してください。",
      lines: [
        `必要な退職金手取り = max(0, ${yenNeed(result.requiredCapital)} - ${yen(result.personalAtRetire)}) = ${yenNeed(result.requiredNetFromCompany)}`,
        `必要な額面 = 手取り ${yenNeed(result.requiredNetFromCompany)} ÷ 仮定手取り率 ${pct(state.retirementNetRatio)} = ${yenNeed(result.requiredGrossRetirementPay)}`,
        `予定額面 ${yen(state.plannedRetirementPay)}、確認済み法人原資 ${result.confirmedPayable===null?"未入力":yen(result.confirmedPayable)}`
      ]
    },
    annualPreparation: {
      title: "追加準備の計算過程",
      note: "法人原資の予測額は確認済み支払可能額とは別です。実際の支払能力は法人CFで確認してください。",
      lines: [
        `法人準備見込 ${yen(result.corporatePreparedGross)} は既準備・将来積立・保険等の仮定合計`,
        `必要退職金額面との差 ${yenNeed(result.sourceGapForRequired)}`,
        state.yearsToRetire>0 ? `追加積立の年額目安 ${yenNeed(result.annualAdditionalPreparation)}/年`:
          `追加の準備期間なし。即時必要額 ${yenNeed(result.sourceGapForRequired)}`
      ]
    }
  };
}

function renderFundingChart(result) {
  let remaining = result.requiredCapital;
  const personalValue = Math.min(Math.max(0, result.personalAtRetire), remaining);
  remaining -= personalValue;
  const retirementValue = Math.min(Math.max(0, result.plannedNetRetirementPay), remaining);
  remaining -= retirementValue;
  const planFunding = [
    { label: "個人資産", value: personalValue, color: colors.personal },
    { label: "予定退職金の手取り（条件付き）", value: retirementValue, color: colors.retirement }
  ];
  const gap = Math.max(0, remaining);
  const data = gap > 0 ? [...planFunding, { label: "未充足", value: gap, color: colors.gap }] : planFunding;

  drawDonut(document.getElementById("fundingChart"), data, result.requiredCapital===0);
  renderLegend(data);
  setText("coverageText", `退職金が予定どおり支払われた場合の世帯不足 ${yenNeed(result.householdGap)}。年金等は年次収支に反映済み。`);
}

function renderLegend(data) {
  const legend = document.getElementById("fundingLegend");
  legend.innerHTML = "";
  const template = document.getElementById("legendItemTemplate");
  data.forEach((item) => {
    const node = template.content.cloneNode(true);
    node.querySelector("i").style.background = item.color;
    node.querySelector("b").textContent = `${item.label} ${item.label==="未充足"?yenNeed(item.value):yen(item.value)}`;
    legend.appendChild(node);
  });
}

function renderBalanceChart(result) {
  drawLineChart(document.getElementById("balanceChart"), result.planBalances, result.fullBalances);
  const endBalance = result.planBalances.at(-1)?.balance ?? 0;
  if (result.planRunout) {
    setText("runoutText", `${result.planRunout.age}歳の年に初めて不足。グラフは各年末の残高です`);
  } else {
    setText("runoutText", `設定した期間では不足なし。最終年末 ${yen(endBalance)} 残（予定退職金受領を仮定）`);
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
  const box = document.getElementById("precisionStatus");
  const count=result.assessment.reasons.filter(reason=>/未確認|根拠/.test(reason)).length;
  box.className="precision-status compact-status";
  box.querySelector("strong").textContent=count ? `根拠・前提の未確認 ${count}項目` : "根拠・前提の確認状態";
  box.querySelector("span").textContent="設定条件内の試算です。将来の資金・運用を保証しません";
  const list=document.getElementById("precisionNextSteps"); list.replaceChildren();
  const li=document.createElement("li"), link=document.createElement("a");
  link.href="#calculationDetails"; link.textContent=`判定理由を全て見る（${result.assessment.reasons.length}件）`;
  link.addEventListener("click",()=>{document.getElementById("calculationDetails").open=true;document.getElementById("assessmentReasons").open=true;});
  li.appendChild(link); list.appendChild(li);
  const warning=document.getElementById("initialValueWarning");
  warning.hidden=!isUsingInitialValues(result.state);
  warning.textContent="例示値のままです。確認した実数値に置き換えてください";
}

function renderProposalChecklist(result) {
  const unchecked = getUncheckedProposalChecks(result.state);
  setText("uncheckedCheckCount", unchecked.length ? `未確認 ${unchecked.length}件` : "すべて確認済み");
}

function getAccuracyStatus(state) {
  const assessment=PlannerModel.calculate(state).assessment;
  return {key:assessment.key,className:assessment.key==="shortage"?"draft":assessment.key==="assumed"?"meeting":"ready",
    label:{error:"入力エラー",shortage:"不足あり",assumed:"仮定・未確認あり",adequate:"設定条件内では充足"}[assessment.key],
    text:assessment.reasons.length?`${assessment.reasons.length}件の確認・対応事項があります。判定理由を開いて確認してください。`:
      "設定条件内の試算であり、将来の結果を保証しません。"};
}

function getUncheckedProposalChecks(state) {
  return proposalChecks.filter((item) => !state[item.key]);
}

function isUsingInitialValues(state) {
  const defaults = { ...fields, hasSpouse: true };
  return coreAssumptionFields.every((key) => {
    if (!(key in fields)) return true;
    return String(state[key] ?? "") === String(defaults[key] ?? "");
  });
}

function diagnoseShortageCause(result) {
  const household=result.householdGap>PlannerModel.TOLERANCE;
  const company=result.companyGap!==null && result.companyGap>PlannerModel.TOLERANCE;
  if (household && company) return {title:"世帯と法人の両方に不足",
    text:`世帯の生活資金は ${yenNeed(result.householdGap)}、法人の確認済み支払原資は ${yenNeed(result.companyGap)} 不足。別々の指標で、合算しません。`};
  if (household) return {title:"世帯の生活資金が不足",
    text:`予定退職金を受け取れた場合でも ${yenNeed(result.householdGap)} 不足します。`};
  if (company) return {title:"法人の支払原資が不足",
    text:`予定退職金の受領を仮定した世帯計画は足りますが、確認済み法人原資は ${yenNeed(result.companyGap)} 不足しています。`};
  if (result.companyGap===null) return {title:"法人の支払原資は未確認",
    text:"予定退職金の支払可能額を資料で確認するまで、世帯の充足は条件付きです。"};
  return {title:"設定条件内の不足はありません",
    text:"根拠・期間外費用と将来の変動を確認してください。"};
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

function estimateReduction(state, mutate) {
  const draft = { ...state };
  mutate(draft);
  return PlannerModel.compare(state,draft);
}

function reduceSpending(draft, ratio) {
  draft.monthlyExpenseTotal *= ratio;
  draft.monthlyLife *= ratio;
  draft.monthlyHousing *= ratio;
  draft.annualMedical *= ratio;
  draft.annualDream *= ratio;
  draft.careMonthly *= ratio;
  draft.careOneTime *= ratio;
}

function formatEffect(value) {
  if (value.errors) return "この条件では比較できません。期間・利回りを確認してください。";
  const effect=value.householdImprovement;
  const household=effect>PlannerModel.TOLERANCE?`世帯不足が ${yen(effect)} 減少`:
    effect< -PlannerModel.TOLERANCE?`世帯不足が ${yen(-effect)} 増加`:
      "世帯不足への直接影響なし";
  const company=value.companyImprovement===null?"法人支払原資は未確認":
    `確認済み法人原資不足の変化 ${yen(value.companyImprovement)}`;
  return `${value.evaluationAge}歳時点換算: ${household}。${company}。法人準備見込との差の変化 ${yen(value.forecastPreparationImprovement)}（合算しません）`;
}

function renderBasis(result) {
  const formulaList = document.getElementById("formulaList");
  const validationList = document.getElementById("validationList");
  if (!formulaList || !validationList) return;

  formulaList.innerHTML = "";
  validationList.innerHTML = "";

  const formulaItems = [
    `期間: ${result.state.retireAge}歳から${result.state.lifeAge}歳になるまでの${result.state.retirementYears}年。各年の年初残高＋収入－支出に、その後の運用益を反映。`,
    `価格基準: ${result.state.priceBasis==="current"?"現在の購買力":"退職時点の名目額"}。支出は年率${pct(result.state.inflationRate)}で増額、年金・その他収入は固定額。`,
    `介護: 期間内 ${yen(result.careInside)}、期間外 ${yen(result.careOutside)}。対象者 ${result.state.careSubject==="spouse"?"配偶者":"本人"}、開始 ${result.state.careStartAge}歳、期間 ${result.state.careMonths}か月。`,
    `必要資金: 年次CFの途中を含め残高が負にならない最小の引退時資金 ${yenNeed(result.requiredCapital)}。黒字は翌年へ繰越。`,
    `個人資産見込 ${yen(result.personalAtRetire)}。必要退職金の額面 ${yenNeed(result.requiredGrossRetirementPay)} は手取り率 ${pct(result.state.retirementNetRatio)} の仮定から逆算。`,
    `予定退職金の額面 ${yen(result.state.plannedRetirementPay)}。確認済み支払可能額 ${result.confirmedPayable===null?"未入力":yen(result.confirmedPayable)}。法人不足 ${result.companyGap===null?"未確認":yenNeed(result.companyGap)}。`,
    result.state.yearsToRetire>0?`法人準備見込との差を埋める追加積立 ${yenNeed(result.annualAdditionalPreparation)}/年。`:
      `追加の準備期間なし。法人準備見込との差 ${yenNeed(result.sourceGapForRequired)} を即時準備額として表示。`
  ];

  formulaItems.forEach((text) => appendCheckItem(formulaList, "", text));

  const checks = buildValidationChecks(result);
  checks.forEach((item) => appendCheckItem(validationList, item.className, item.text));
}

function buildValidationChecks(result) {
  const checks = [];
  for (const reason of result.assessment.reasons)
    checks.push({className:result.assessment.key==="shortage"?"bad":"warn",text:reason});
  if (result.state.workIncome>0 && result.state.workIncomeType===1 && result.state.workUntilAge>result.state.pensionStartAge)
    checks.push({className:"warn",text:"年金受給と給与・役員報酬が重なるため、在職老齢年金を個別確認してください。"});
  if (result.state.guaranteeDebt==='') checks.push({className:"warn",text:"経営者保証残は未入力です。法人借入の保証契約を別途確認してください。"});
  if (result.state.guaranteeDebt>0 && result.state.guaranteeReleaseStatus!==2)
    checks.push({className:"warn",text:"経営者保証の解除は未確定です。法人借入とは別に確認してください。"});
  if (!checks.length) checks.push({className:"",text:"設定条件内の試算です。将来の資金や運用を保証するものではありません。"});
  return checks;
}

function appendCheckItem(list, className, text) {
  const li = document.createElement("li");
  li.className = className;
  li.textContent = text;
  list.appendChild(li);
}

function generateIssueSummary() {
  if (PlannerModel.calculate(readState()).errors.length) return update();
  renderIssueSummary(buildIssueSummary());
}

function renderIssueSummary(summary) {
  const text = formatIssueSummaryText(summary);
  document.getElementById("summaryOutput").value = text;
  document.getElementById("printSummary").textContent = text;
}

function downloadSummaryJson() {
  if (PlannerModel.calculate(readState()).errors.length) return update();
  const summary = buildIssueSummary();
  downloadJson(summary,"second-life-issue-summary.json");
}

function buildIssueSummary(state = readState(), result = PlannerModel.calculate(state)) {
  const diagnosis = diagnoseShortageCause(result);
  const selectedOptions = optionDefinitions.filter((option) => state[option.key]).map((option) => option.title);
  const unchecked = getUncheckedProposalChecks(state);
  const common = PlannerModel.report(result).summary;

  return {
    title: "論点整理サマリー",
    status: {error:"入力エラー",shortage:"不足あり",assumed:"仮定・未確認あり",adequate:"設定条件内では充足"}[result.assessment.key],
    calculation: common,
    period: common.period,
    basis: state.priceBasis === "current" ? "現在の購買力" : "退職時点の名目額",
    assumptions: [
      `支出インフレ ${pct(state.inflationRate)}、現役中の利回り ${pct(state.preRetireReturn)}、老後の利回り ${pct(state.retirementReturn)}。収入は固定額`,
      `介護対象 ${state.careSubject==='spouse'?'配偶者':'本人'}、${state.careStartAge}歳から${state.careMonths}か月。月額${man(state.careMonthly)}、一時${man(state.careOneTime)}`,
      `予定退職金は額面${yen(state.plannedRetirementPay)}、手取り率${pct(state.retirementNetRatio)}の仮定。予定どおり支払われる場合の世帯計画。法人原資不足と合算しません`,
      ...result.assessment.reasons
    ],
    sources: currentPlan.sources,
    hasUncheckedItems: unchecked.length > 0,
    vision: state.vision || "未入力",
    result: {
      requiredCapital: yenNeed(result.requiredCapital),
      personalAtRetire: yen(result.personalAtRetire),
      requiredRetirementPay: yenNeed(result.requiredGrossRetirementPay),
      annualPreparation: result.annualAdditionalPreparation === null
        ? `${yenNeed(result.sourceGapForRequired)} 即時` : `${yenNeed(result.annualAdditionalPreparation)}/年`,
      householdGap: yenNeed(result.householdGap),
      companyGap: result.companyGap === null ? "未確認" : yenNeed(result.companyGap),
      careOutside: yenNeed(result.careOutside)
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
    `期間: ${summary.period}`,
    `価格基準: ${summary.basis}（収入は固定額）`,
    `必要資金: ${summary.result.requiredCapital}`,
    `個人資産見込: ${summary.result.personalAtRetire}`,
    `必要退職金: ${summary.result.requiredRetirementPay}`,
    `追加準備: ${summary.result.annualPreparation}`,
    `予定退職金を受け取れた場合の世帯不足: ${summary.result.householdGap}`,
    `法人の確認済み支払原資不足: ${summary.result.companyGap}`,
    `期間外の予定介護費用（必要資金に含まず）: ${summary.result.careOutside}`,
    `総合判定: ${summary.status}`,
    `判定理由: ${summary.assumptions.length?summary.assumptions.join(" / "):"設定条件内の試算"}`,
    `介護費用の参照元: ${summary.sources?.care?.title || "未記録"}（${summary.sources?.care?.year || "年不明"}、${summary.sources?.care?.checkedAt || "確認日不明"}）`,
    `参照URL: ${summary.sources?.care?.url || summary.sources?.care?.reference?.url || "未記録"}`,
    "年初に収支を計上し、その後に運用益を反映。年内の入出金時期は簡略化しています。",
    "設定条件内の試算であり、将来の資金や運用を保証しません。",
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
    const adjusted = {
      ...state,
      monthlyExpenseTotal: state.monthlyExpenseTotal * scenario.spend,
      monthlyLife: state.monthlyLife * scenario.spend,
      monthlyHousing: state.monthlyHousing * scenario.spend,
      annualMedical: state.annualMedical * scenario.spend,
      annualDream: state.annualDream * scenario.spend,
      retirementReturn: state.retirementReturn + scenario.returnShift,
      inflationRate: scenario.inflation
    };
    const result = PlannerModel.calculate(adjusted);
    const card = document.createElement("article");
    card.className = "scenario-card";
    card.innerHTML = `<span>${scenario.name}</span><strong>${result.errors.length?"条件を確認":yenNeed(result.requiredGrossRetirementPay)}</strong>`;
    grid.appendChild(card);
  });
}

function drawDonut(canvas, data, zeroCapital = false) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const total = zeroCapital ? 0 : data.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.38;
  const inner = radius * 0.58;
  let angle = -Math.PI / 2;

  if (zeroCapital || total===0) {
    ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI*2); ctx.fillStyle="#d9e1de"; ctx.fill();
  }
  data.forEach((item) => {
    const slice = total>0 ? (Math.max(0, item.value) / total) * Math.PI * 2 : 0;
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
  ctx.fillText(yenNeed(total), cx, cy - 4);
  ctx.fillStyle = "#657174";
  ctx.font = "12px sans-serif";
  ctx.fillText(zeroCapital ? "追加の初期資金は不要" : "引退時の必要資金", cx, cy + 18);
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
  ctx.fillText("必要資金を満たす案", margin.left + 78, 16);
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
  const rounded = Math.abs(value)<PlannerModel.TOLERANCE ? 0 : Math.round(value);
  if (!Number.isFinite(rounded)) return "-";
  return `${(rounded===0?0:rounded).toLocaleString("ja-JP")}万円`;
}

function yenNeed(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.ceil(Math.max(0,value)).toLocaleString("ja-JP")}万円`;
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
