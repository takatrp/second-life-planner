const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../model.js');

const base = (overrides = {}) => ({
  currentAge: 65, retireAge: 65, lifeAge: 85, pensionStartAge: 65,
  hasSpouse: 0, spouseAge: 63, spousePensionStartAge: 65,
  monthlyLife: 10, monthlyHousing: 0, annualMedical: 0, annualDream: 0,
  oneTimeEvent: 0, familySupport: 0, careMonthly: 0, careMonths: 0,
  careOneTime: 0, careStartAge: 78, careSubject: 'self', debtAtRetire: 0,
  pensionSelf: 0, pensionSpouse: 0, annuityAnnual: 0, annuityYears: 0,
  workIncome: 0, workUntilAge: 65, otherIncome: 0, retirementReturn: 0,
  inflationRate: 0, personalAssetsNow: 0, monthlySaving: 0, preRetireReturn: 0,
  plannedRetirementPay: 0, retirementNetRatio: 100, corporateReserveNow: 0,
  corporateAnnualReserve: 0, insuranceCashAtRetire: 0, confirmedPayable: null,
  priceBasis: 'retirement', pensionSelfBasis: 'net', pensionSpouseBasis: 'net',
  pensionSelfNetRatio: 100, pensionSpouseNetRatio: 100,
  evidence: {}, ...overrides
});
const calc = (o) => model.calculate(base(o));
const near = (a, b, eps = 0.0001) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const evidenceFor = (state,key) => ({status:'verified',source:'確認資料',date:'2026-09-30',
  verifiedValue:model.evidenceValue(state,key)});
const essentialKeys=['monthlyLife','monthlyHousing','annualMedical','annualDream','oneTimeEvent',
  'familySupport','debtAtRetire','careMonthly','careOneTime','personalAssetsNow',
  'retirementReturn','inflationRate','preRetireReturn'];
const fullEvidence = state => Object.fromEntries(essentialKeys.map(key=>[key,evidenceFor(state,key)]));

test('T01 20 annual periods and 2400 initial capital', () => {
  const r = calc();
  assert.equal(r.cashflows.length, 20);
  near(r.cashflows.reduce((n, x) => n + x.spending, 0), 2400);
  near(r.requiredCapital, 2400);
});
test('T02 personal saving effect counts household gap only once', () => {
  const before = base({currentAge: 55});
  const after = {...before, monthlySaving: 10};
  near(model.calculate(after).personalAtRetire, 1200);
  near(model.calculate(after).householdGap, 1200);
  near(model.compare(before, after).householdImprovement, 1200);
});
test('T03 spouse pension follows spouse age', () => {
  const r = calc({currentAge: 50, lifeAge: 70, hasSpouse: 1, spouseAge: 48, pensionSpouse: 90});
  assert.deepEqual(r.cashflows.map(x => x.spousePension), [0, 0, 90, 90, 90]);
});
test('T04 younger or absent spouse has no pension in the window', () => {
  for (const o of [{hasSpouse: 1, spouseAge: 28}, {hasSpouse: 0, spouseAge: 48}])
    near(calc({currentAge: 50, lifeAge: 70, pensionSpouse: 90, ...o}).cashflows.reduce((n,x)=>n+x.spousePension,0), 0);
});
test('T05 care outside period is visible and bars green', () => {
  const r = calc({lifeAge: 78, careMonthly: 10, careMonths: 60, careOneTime: 100});
  near(r.careInside, 0); near(r.careOutside, 700);
  assert.notEqual(r.assessment.key, 'adequate');
});
test('T06 first care year 220 and outside 480', () => {
  const r = calc({lifeAge: 79, careMonthly: 10, careMonths: 60, careOneTime: 100});
  near(r.careInside, 220); near(r.careOutside, 480);
  near(r.cashflows.at(-1).care, 220);
});
test('T07 care monthly allocation across five years', () => {
  const r = calc({lifeAge: 83, careMonthly: 10, careMonths: 60, careOneTime: 100});
  near(r.careInside, 700); near(r.careOutside, 0);
  assert.deepEqual(r.cashflows.slice(-5).map(x=>x.care), [220,120,120,120,120]);
});
test('T08 household conditional coverage is not confirmed company funding', () => {
  const s=base({plannedRetirementPay:2400,confirmedPayable:0});
  const r = model.calculate({...s,evidence:{confirmedPayable:evidenceFor(s,'confirmedPayable')}});
  near(r.householdGap, 0); near(r.companyGap, 2400);
  assert.notEqual(r.assessment.key, 'adequate');
});
test('T09 no company warning when no retirement pay is planned', () => {
  const r = calc({personalAssetsNow: 2400});
  near(r.householdGap, 0); near(r.companyGap, 0);
  assert.ok(!r.assessment.reasons.some(x=>x.includes('法人原資')));
  const s=base({personalAssetsNow:2400});
  const verified = model.calculate({...s,evidence:fullEvidence(s)});
  assert.equal(verified.assessment.key,'adequate');
});
test('T10 positive income is carried forward', () => {
  const r = calc({lifeAge: 67, pensionSelf: 240, pensionStartAge: 65, workIncome: 0,
    annuityAnnual: 0, otherIncome: 0, pensionSelfYears: 1});
  near(r.requiredCapital, 0);
  assert.deepEqual(r.planBalances.map(x=>x.endBalance), [120,0]);
});
test('T11 negative return capital matches every balance', () => {
  const r = calc({lifeAge: 67, retirementReturn: -1});
  near(r.requiredCapital,241.212121,0.001);
  assert.ok(r.fullBalances.every(x=>x.endBalance >= -0.0001));
  const low = model.simulate(r.cashflows, r.requiredCapital - 0.01, r.state.retireRate, r.oneTimeAtRetire);
  assert.ok(low.some(x=>x.endBalance < -0.0001));
});
test('T12 positive return, inflation and monotonic capital', () => {
  const r = calc({lifeAge: 70, retirementReturn: 2, inflationRate: 1});
  assert.ok(r.fullBalances.every(x=>x.endBalance >= -0.0001));
  const more = model.simulate(r.cashflows, r.requiredCapital + 10, r.state.retireRate, r.oneTimeAtRetire);
  assert.ok(more.every((x,i)=>x.endBalance >= r.fullBalances[i].endBalance));
});
test('T13 current-price and retirement-price bases', () => {
  const current = calc({currentAge:55, inflationRate:2, priceBasis:'current'});
  const retirement = calc({currentAge:55, inflationRate:2, priceBasis:'retirement'});
  near(current.cashflows[0].basicSpending, 120 * 1.02 ** 10);
  near(retirement.cashflows[0].basicSpending, 120);
});
test('T14 invalid ages, rates, blank and nonnumeric fields', () => {
  assert.equal(calc({currentAge:65}).state.yearsToRetire, 0);
  for (const o of [{lifeAge:65}, {currentAge:66}, {retirementReturn:-100},
    {preRetireReturn:-100}, {monthlyLife:''}, {monthlyLife:'abc'}])
    assert.equal(calc(o).assessment.key, 'error');
  const impossible=calc({retirementReturn:-99.9999,lifeAge:120});
  assert.equal(impossible.assessment.key,'error');
  assert.ok(impossible.errors.every(x=>!x.includes('Infinity')));
});
test('T15 checks cannot certify assumptions or erase shortage', () => {
  const checks = {checkNenkinSelf:true,checkNenkinSpouse:true,checkRetirementRule:true,
    checkMeritLimit:true,checkGuaranteeDebt:true,checkGuaranteeRelease:true,checkInsuranceCash:true};
  assert.equal(calc({...checks,pensionSelf:160}).assessment.key, 'assumed');
  const s=base({...checks,monthlyLife:20});
  const short = model.calculate({...s,evidence:{
    monthlyLife:evidenceFor(s,'monthlyLife'),personalAssetsNow:evidenceFor(s,'personalAssetsNow')}});
  assert.equal(short.assessment.key, 'shortage');
});
test('T16 legacy migration, roundtrip and failure preserve original', () => {
  const raw = JSON.stringify({currentAge:55, careMonthly:8.3, pensionSpouse:90});
  const migrated = model.migrate(raw);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.legacyOriginal, raw);
  assert.equal(migrated.state.currentAge, 55);
  assert.equal(migrated.state.evidence.spousePensionStartAge.status, 'assumed');
  assert.deepEqual(model.migrate(JSON.stringify(migrated)), migrated);
  assert.equal(model.calculate(base({...migrated.state,retireAge:65,lifeAge:85,monthlyLife:0,
    careMonths:migrated.state.careMonths})).assessment.key,'assumed');
  const oldSummary = JSON.stringify({title:'論点整理サマリー',vision:'旅行したい',result:{requiredCapital:'2,400万円'}});
  const summaryMigration = model.migrate(oldSummary);
  assert.equal(summaryMigration.legacyOriginal, oldSummary);
  assert.match(summaryMigration.state.migrationWarning, /入力値が保存されていません/);
  assert.equal(model.calculate(base(summaryMigration.state)).assessment.key,'error');
  assert.equal(summaryMigration.state.careMonths,undefined);
  assert.deepEqual(model.migrate(JSON.stringify(summaryMigration)),summaryMigration);
  assert.throws(()=>model.migrate('{bad'));
  assert.throws(()=>model.migrate('{"version":2,"state":{}}'));
});
test('T17 report surfaces use the same result and warnings', () => {
  const r = calc({lifeAge:78,careMonthly:10,careMonths:60,careOneTime:100});
  const report = model.report(r);
  for (const view of ['summary','chart','comparison','print','export']) {
    assert.equal(report[view].requiredCapital, r.requiredCapital);
    assert.equal(report[view].careOutside, 700);
    assert.equal(report[view].assessment.key, r.assessment.key);
    assert.equal(report[view].years, 13);
  }
});
test('T18 partial care year and explicit early pension only', () => {
  const care = calc({lifeAge:80,careMonthly:10,careMonths:18,careOneTime:100});
  assert.deepEqual(care.cashflows.slice(-2).map(x=>x.care), [220,60]);
  near(care.careInside,280);
  const early = calc({lifeAge:67,pensionStartAge:60,pensionSelf:100,
    evidence:{earlyPensionSelf:evidenceFor(base({lifeAge:67,pensionStartAge:60,pensionSelf:100}),'earlyPensionSelf')}});
  assert.deepEqual(early.cashflows.map(x=>x.selfPension),[100,100]);
  assert.ok(!early.assessment.reasons.some(x=>x.includes('65歳前受給額')));
  const unconfirmed=calc({lifeAge:67,pensionStartAge:60,pensionSelf:100});
  assert.ok(unconfirmed.assessment.reasons.some(x=>x.includes('65歳前受給額')));
});
test('verified amount is invalidated when a dependent input changes', () => {
  const s=base({personalAssetsNow:5000});
  const evidence=fullEvidence(s);
  assert.equal(model.calculate({...s,evidence}).assessment.key,'adequate');
  assert.equal(model.calculate({...s,monthlyLife:11,evidence}).assessment.key,'assumed');
  assert.equal(model.calculate({...s,priceBasis:'current',evidence}).assessment.key,'assumed');
});
test('unverified income and return assumptions cannot become green', () => {
  const s=base({otherIncome:1000});
  const evidence=fullEvidence(s);
  assert.equal(model.calculate({...s,evidence}).assessment.key,'assumed');
  const highReturn=base({personalAssetsNow:10000,retirementReturn:100});
  const highReturnEvidence=fullEvidence(highReturn);
  delete highReturnEvidence.retirementReturn;
  assert.equal(model.calculate({...highReturn,evidence:highReturnEvidence}).assessment.key,'assumed');
});
test('later retirement comparison uses the original retirement age as evaluation point', () => {
  const before=base({currentAge:55,preRetireReturn:2});
  const after={...before,retireAge:67};
  const comparison=model.compare(before,after);
  assert.equal(comparison.evaluationAge,65);
  near(comparison.householdImprovement,
    comparison.before.householdGap-comparison.after.householdGap/1.02**2);
});

test('annuity duration is a whole nonnegative year count', () => {
  for (const years of [0,1,2]) {
    const r=calc({lifeAge:68,annuityAnnual:100,annuityYears:years});
    assert.deepEqual(r.cashflows.map(flow=>flow.annuity),[0,1,2].map(index=>index<years ? 100:0));
  }
  for (const years of [0.5,1.5,-1,NaN,Infinity,'1']) {
    const r=calc({annuityAnnual:100,annuityYears:years});
    assert.equal(r.assessment.key,'error');
    assert.deepEqual(r.cashflows,[]);
    assert.ok(r.errors.some(error=>error.includes('年金保険の期間')));
  }
});

test('exact zero need has neutral coverage, no shortage and no signed-zero output', () => {
  for (const overrides of [
    {expenseMode:'total',monthlyExpenseTotal:0,monthlyLife:0},
    {expenseMode:'total',monthlyExpenseTotal:0,monthlyLife:0,personalAssetsNow:100,pensionSelf:10},
    {expenseMode:'total',monthlyExpenseTotal:0.1,pensionSelf:1.2},
    {expenseMode:'total',monthlyExpenseTotal:-0,monthlyLife:-0,retirementReturn:-1}
  ]) {
    const s=base(overrides);
    const r=model.calculate({...s,evidence:{...fullEvidence(s),monthlyExpenseTotal:evidenceFor(s,'monthlyExpenseTotal'),
      pensionSelf:evidenceFor(s,'pensionSelf')}});
    assert.equal(r.requiredCapital,0);
    assert.equal(r.householdGap,0);
    assert.equal(r.requiredNetFromCompany,0);
    assert.equal(r.coverageRatio,1);
    assert.equal(r.planRunout,undefined);
    assert.notEqual(r.assessment.key,'shortage');
    for (const item of [r,...r.fullBalances,...r.planBalances])
      for (const value of Object.values(item))
        if (typeof value==='number') assert.equal(Object.is(value,-0),false);
  }
});

test('capital search preserves integer boundaries and genuine tiny positive needs', () => {
  for (const [monthly,total] of [[0.3,72],[0.1,24]]) {
    const r=calc({expenseMode:'total',monthlyExpenseTotal:monthly});
    assert.equal(r.requiredCapital,total);
    assert.equal(Math.ceil(r.requiredCapital),total);
    assert.ok(r.fullBalances.every(flow=>flow.afterCashflow>=0 && flow.endBalance>=0));
    assert.equal(r.fullBalances.at(-1).endBalance,0);
  }
  const above=calc({expenseMode:'total',monthlyExpenseTotal:(72+1e-8)/240});
  assert.ok(above.requiredCapital>72);
  near(above.requiredCapital,72+1e-8,1e-11);
  assert.equal(Math.ceil(above.requiredCapital),73);
  for (const monthly of [1e-9,Number.MIN_VALUE]) {
    const tiny=calc({expenseMode:'total',monthlyExpenseTotal:monthly});
    assert.ok(tiny.requiredCapital>0);
    assert.equal(Math.ceil(tiny.requiredCapital),1);
    if (monthly===1e-9) near(tiny.requiredCapital,2.4e-7,1e-19);
  }
  const oneTime=calc({expenseMode:'total',monthlyExpenseTotal:0,pensionSelf:10,oneTimeEvent:72});
  assert.equal(oneTime.requiredCapital,72);
  assert.equal(Math.ceil(oneTime.requiredCapital),72);
});

test('capital precision follows machine scale at high positive and negative returns', () => {
  for (const retirementReturn of [-99.9,-99,100]) {
    const r=calc({lifeAge:67,expenseMode:'total',monthlyExpenseTotal:0.3,retirementReturn});
    const expected=r.annualBasicSpend*(1+1/(1+r.state.retireRate));
    near(r.requiredCapital,expected,Math.abs(expected)*Number.EPSILON*32);
    assert.ok(r.fullBalances.every(flow=>Number.isFinite(flow.endBalance) && flow.endBalance>=0));
    assert.ok(model.simulate(r.cashflows,r.requiredCapital-1e-7,r.state.retireRate,r.oneTimeAtRetire)
      .some(flow=>flow.afterCashflow<0 || flow.endBalance<0));
  }
});

test('precision guard preserves maximum-scale fractional need and its shortage year', () => {
  const spending=12e9*120;
  for (const oneTimeEvent of [0.001,0.01,0.1]) {
    const r=calc({currentAge:0,retireAge:0,lifeAge:120,expenseMode:'total',monthlyExpenseTotal:1e9,oneTimeEvent});
    assert.equal(r.requiredCapital,spending+oneTimeEvent);
    assert.ok(r.requiredCapital>spending);
    assert.equal(Math.ceil(r.requiredCapital),spending+1);
  }
  const basicTotal=12e9*109;
  const r=calc({currentAge:0,retireAge:11,lifeAge:120,expenseMode:'total',monthlyExpenseTotal:1e9,
    oneTimeEvent:0.1,preRetireReturn:100,personalAssetsNow:basicTotal/2**11});
  assert.equal(r.personalAtRetire,basicTotal);
  assert.equal(r.requiredCapital,basicTotal+0.1);
  assert.equal(r.householdGap,r.requiredCapital-r.personalAtRetire);
  assert.ok(r.householdGap>0);
  assert.equal(r.planRunout.age,119);
  assert.equal(r.planBalances.at(-1).endBalance,-r.householdGap);
  assert.equal(r.assessment.key,'shortage');
  assert.ok(r.fullBalances.every(flow=>flow.afterCashflow>=0 && flow.endBalance>=0));
});

test('strict zero bound distinguishes a real deficit between large income and expense operands', () => {
  const r=calc({expenseMode:'total',monthlyExpenseTotal:83333333.33333334,pensionSelf:1e9});
  assert.ok(r.annualBasicSpend>1e9);
  const deficit=r.annualBasicSpend-1e9;
  assert.equal(r.requiredCapital,deficit*20);
  assert.ok(r.requiredCapital>0);
  assert.ok(r.planBalances.at(-1).endBalance<0);
  assert.ok(r.planRunout);
  assert.equal(r.assessment.key,'shortage');
});

test('nonzero-return bound retains a small future need alongside large balanced flows', () => {
  const r=calc({currentAge:0,retireAge:0,lifeAge:120,monthlyLife:0,annualMedical:1e9,
    otherIncome:1e9,careOneTime:0.1,careStartAge:119,retirementReturn:2});
  assert.equal(r.errors.length,0);
  assert.ok(r.cashflows.slice(0,-1).every(flow=>flow.deficit===0));
  const expected=r.cashflows.at(-1).deficit/1.02**119;
  near(r.requiredCapital,expected,Math.abs(expected)*Number.EPSILON*64);
  assert.ok(r.requiredCapital>0);
  assert.equal(r.planRunout.age,119);
  assert.ok(r.fullBalances.every(flow=>flow.afterCashflow>=0 && flow.endBalance>=0));
});

test('annual basic expense arithmetic retains decimal, exponent and subnormal input precision', () => {
  const decimal=calc({expenseMode:'breakdown',monthlyLife:0.1,monthlyHousing:0.2,annualMedical:0,annualDream:0});
  assert.equal(decimal.annualBasicSpend,3.6);
  assert.equal(decimal.requiredCapital,72);
  assert.equal(decimal.state.monthlyLife,0.1);
  assert.equal(decimal.state.monthlyHousing,0.2);
  const exponent=calc({expenseMode:'total',monthlyExpenseTotal:1e-9});
  assert.equal(exponent.annualBasicSpend,1.2e-8);
  assert.equal(exponent.state.monthlyExpenseTotal,1e-9);
  const subnormal=calc({expenseMode:'total',monthlyExpenseTotal:Number.MIN_VALUE});
  assert.equal(subnormal.annualBasicSpend,Number.MIN_VALUE*12);
  assert.ok(subnormal.requiredCapital>0);
});

test('missing-only inferred decimal total preserves legacy expense-mode roundtrip', () => {
  const original=base({monthlyLife:0.1,monthlyHousing:0.2});
  const normalized=model.normalizeExpenseState(original);
  assert.equal(normalized.monthlyExpenseTotal,0.3);
  assert.equal(model.calculate(normalized).requiredCapital,72);
  const total={...normalized,expenseMode:'total'};
  assert.equal(model.calculate(total).requiredCapital,72);
  assert.equal(model.calculate({...total,expenseMode:'breakdown'}).requiredCapital,72);
  assert.equal(original.monthlyExpenseTotal,undefined);
  const explicit=0.30000000000000004;
  assert.equal(model.normalizeExpenseState({...original,monthlyExpenseTotal:explicit}).monthlyExpenseTotal,explicit);
  assert.equal(model.normalizeExpenseState({...original,expenseMode:'total'}).monthlyExpenseTotal,undefined);
});

test('total and breakdown modes use one active expense amount and preserve inactive values', () => {
  const s=base({monthlyLife:10,monthlyHousing:2,annualMedical:24,annualDream:96});
  const normalized=model.normalizeExpenseState(s);
  assert.equal(normalized.expenseMode,'breakdown');
  assert.equal(normalized.monthlyExpenseTotal,22);
  assert.equal(s.expenseMode,undefined);
  assert.equal(s.monthlyExpenseTotal,undefined);
  const breakdown=model.calculate({...s,expenseMode:'breakdown',monthlyExpenseTotal:999});
  const total=model.calculate({...s,expenseMode:'total',monthlyExpenseTotal:22});
  assert.equal(breakdown.annualBasicSpend,264);
  assert.equal(total.annualBasicSpend,264);
  assert.equal(breakdown.requiredCapital,total.requiredCapital);
  assert.equal(breakdown.state.monthlyExpenseTotal,999);
  assert.equal(total.state.annualDream,96);
  assert.deepEqual(model.activeExpenseKeys(total.state),['monthlyExpenseTotal']);
  const incomplete={...s}; delete incomplete.annualDream;
  assert.equal(model.normalizeExpenseState(incomplete).monthlyExpenseTotal,undefined);
  assert.equal(model.calculate(incomplete).assessment.key,'error');
  assert.equal(model.calculate({...s,expenseMode:'total'}).assessment.key,'error');
});

test('expense evidence certifies only the active mode and invalidates on a mode change', () => {
  const s=base({expenseMode:'total',monthlyExpenseTotal:10,personalAssetsNow:10000});
  const evidence=fullEvidence(s);
  for (const key of ['monthlyLife','monthlyHousing','annualMedical','annualDream']) delete evidence[key];
  evidence.monthlyExpenseTotal=evidenceFor(s,'monthlyExpenseTotal');
  assert.equal(model.calculate({...s,evidence}).assessment.key,'adequate');
  assert.equal(model.calculate({...s,monthlyExpenseTotal:11,evidence}).assessment.key,'assumed');
  assert.equal(model.calculate({...s,expenseMode:'breakdown',evidence}).assessment.key,'assumed');
});

test('v2 requires every model field before any defaults can be applied', () => {
  const state=base({expenseMode:'total',monthlyExpenseTotal:10});
  const envelope={version:2,state,sources:{custom:'retained'}};
  assert.deepEqual(model.migrate(JSON.stringify(envelope)),envelope);
  for (const key of Object.keys(state).filter(key=>!['expenseMode','evidence'].includes(key))) {
    const incomplete=structuredClone(envelope);
    delete incomplete.state[key];
    assert.throws(()=>model.migrate(JSON.stringify(incomplete)),undefined,`missing ${key}`);
  }
  const oldV2={version:2,state:base({monthlyLife:12.3456789}),sources:{custom:'retained'}};
  const loaded=model.migrate(JSON.stringify(oldV2));
  assert.deepEqual(loaded,oldV2);
  assert.equal(loaded.state.monthlyExpenseTotal,undefined);
  assert.equal(model.calculate(loaded.state).annualBasicSpend,12.3456789*12);
  assert.equal(model.calculate(loaded.state).state.expenseMode,'breakdown');
});

test('complete Rev.5 reset-produced v2 without evidence preserves numbers as unverified', () => {
  // Snapshot of the predecessor's fields/resetState shape: no expense-mode or
  // evidence properties were written by that reset operation.
  const state=base({
    vision:'夫婦で健康に過ごし、年に数回は旅行へ行ける状態を維持したい。会社に過度に依存せず、退職後の生活費を見える化しておきたい。',
    currentAge:50,retireAge:65,lifeAge:88,hasSpouse:1,spouseAge:48,
    monthlyLife:45,annualMedical:35,annualDream:240,oneTimeEvent:500,familySupport:300,
    careMonthly:9,careMonths:55,careOneTime:47.2,pensionSelf:160,pensionSelfChecked:0,
    pensionSpouse:90,pensionSpouseChecked:0,annuityAnnual:120,annuityYears:10,
    workIncome:120,workIncomeType:0,workUntilAge:70,otherIncome:60,
    retirementReturn:1,inflationRate:2,personalAssetsNow:1500,monthlySaving:20,preRetireReturn:2,
    plannedRetirementPay:2500,retirementNetRatio:85,finalMonthlyComp:120,officerYears:25,meritMultiplier:3,
    corporateReserveNow:800,corporateAnnualReserve:120,insuranceCashAtRetire:1500,
    guaranteeDebt:0,guaranteeReleaseStatus:0,optionSpendReview:false,optionRetireLater:false,
    optionWorkIncome:false,optionPersonalSaving:false,optionCorporateReserve:false,optionInsuranceReserve:false,
    selectedDirection:'',checkNenkinSelf:false,checkNenkinSpouse:false,checkRetirementRule:false,
    checkMeritLimit:false,checkGuaranteeDebt:false,checkGuaranteeRelease:false,checkInsuranceCash:false,
    migrationReviewed:false
  });
  delete state.evidence;
  const envelope={version:2,state,sources:structuredClone(model.SOURCES)};
  const raw=JSON.stringify(envelope);
  const migrated=model.migrate(raw);
  assert.equal(migrated.legacyV2Original,raw);
  assert.deepEqual(migrated.sources,envelope.sources);
  for (const [key,value] of Object.entries(state)) assert.deepEqual(migrated.state[key],value);
  assert.deepEqual(migrated.state.evidence,{});
  assert.match(migrated.state.migrationWarning,/旧v2.*根拠情報がありません.*未確認/);
  assert.equal(migrated.state.migrationReviewed,false);
  assert.equal(migrated.state.expenseMode,undefined);
  assert.equal(migrated.state.monthlyExpenseTotal,undefined);
  for (const key of Object.keys(model.EVIDENCE_LABELS)) assert.equal(model.verified(migrated.state,key),false);
  const result=model.calculate(migrated.state);
  assert.equal(result.errors.length,0);
  assert.equal(result.requiredCapital,model.calculate({...state,evidence:{}}).requiredCapital);
  assert.notEqual(result.assessment.key,'adequate');
  assert.ok(result.assessment.reasons.includes(migrated.state.migrationWarning));
  assert.deepEqual(model.migrate(JSON.stringify(migrated)),migrated);
  assert.equal(JSON.stringify(envelope),raw);
  for (const key of ['personalAssetsNow','pensionSelf','confirmedPayable','hasSpouse','priceBasis']) {
    const incomplete=structuredClone(envelope); delete incomplete.state[key];
    assert.throws(()=>model.migrate(JSON.stringify(incomplete)),undefined,`missing ${key} without evidence`);
  }
  for (const patch of [{monthlyLife:'45'},{personalAssetsNow:null},{retirementReturn:-100},{evidence:null},{evidence:[]}])
    assert.throws(()=>model.migrate(JSON.stringify({...envelope,state:{...state,...patch}})));
});

test('v2 rejects nonfinite, out-of-range, wrong-type and malformed evidence values', () => {
  const invalid=[
    {monthlyLife:null},{monthlyLife:Infinity},{monthlyLife:NaN},{monthlyLife:'10'},
    {monthlyLife:-1},{monthlyLife:1e9+1},{currentAge:65.5},{lifeAge:65},
    {annuityYears:1.5},{careMonths:1.5},{careMonths:1201},
    {retirementReturn:-100},{inflationRate:101},{pensionSelfNetRatio:0},
    {hasSpouse:'1'},{careSubject:'unknown'},{priceBasis:'unknown'},
    {pensionSelfBasis:'unknown'},{pensionSpouseBasis:'unknown'},
    {expenseMode:'unknown'},{confirmedPayable:'10'},{confirmedPayable:-1},
    {confirmedPayable:1e9+1},{evidence:null},{evidence:[]},{evidence:3},
    {evidence:true},{evidence:'bad'},{evidence:{monthlyLife:7}},
    {evidence:{monthlyLife:[]}},{evidence:{monthlyLife:{status:'unknown'}}},
    {evidence:{monthlyLife:{source:3}}},{evidence:{monthlyLife:{verifiedValue:3}}},
    {pensionSelfYears:1.5}
  ];
  for (const patch of invalid) {
    const envelope={version:2,state:base(patch)};
    const raw=JSON.stringify(envelope);
    assert.throws(()=>model.migrate(raw),undefined,JSON.stringify(patch));
    assert.equal(JSON.stringify(envelope),raw);
  }
  const metadata={version:2,state:base({evidence:{customMetadata:{owner:'kept'},monthlyLife:{status:'assumed'}}})};
  assert.deepEqual(model.migrate(JSON.stringify(metadata)),metadata);
});

test('legacyOriginal only exempts an exact legitimate migration from v2 completeness', () => {
  const raw=' {"currentAge":55,"careMonthly":8.3,"pensionSpouse":90} ';
  const legitimate=model.migrate(raw);
  assert.equal(legitimate.legacyOriginal,raw);
  assert.deepEqual(model.migrate(JSON.stringify(legitimate)),legitimate);
  for (const legacyOriginal of ['{}','not JSON',raw,JSON.stringify({version:2,state:{}})])
    assert.throws(()=>model.migrate(JSON.stringify({version:2,state:{},legacyOriginal})));
  const altered=structuredClone(legitimate);
  altered.state.currentAge=56;
  assert.throws(()=>model.migrate(JSON.stringify(altered)));
  const bypass={version:2,state:base(),legacyOriginal:raw};
  delete bypass.state.pensionSelf;
  assert.throws(()=>model.migrate(JSON.stringify(bypass)));
  const invalidKnownEvidence={version:2,state:base({evidence:{monthlyLife:7}}),legacyOriginal:raw};
  assert.throws(()=>model.migrate(JSON.stringify(invalidKnownEvidence)));
});
