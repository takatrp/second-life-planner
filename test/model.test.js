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
