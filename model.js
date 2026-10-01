(function (root) {
  'use strict';
  const VERSION = 2;
  const TOLERANCE = 0.000001; // 万円。表示丸めには使わない。
  const SOURCES = {
    livingReference: {
      title:'生命保険文化センター「生活保障に関する調査」',year:'2025年度',
      population:'夫婦2人の老後生活費についての意識調査',
      minimumMonthly:23.9,comfortableMonthly:39.1,unit:'万円/月',
      url:'https://www.jili.or.jp/lifeplan/lifesecurity/1141.html',checkedAt:'2026-09-30',
      note:'45万円/月の初期値は調査平均ではなく相談用の仮定'
    },
    pensionReference: {
      title:'日本年金機構「令和8年4月分からの年金額等について」',year:'令和8年度',
      population:'老齢基礎年金満額および標準的な夫婦の例',
      basicMonthlyYen:70608,coupleMonthlyYen:237279,unit:'円/月',
      url:'https://www.nenkin.go.jp/oshirase/taisetu/kojin/2026/202604/0401.html',
      checkedAt:'2026-09-30',note:'本人160万円/年、配偶者90万円/年は個別の受給見込ではなく仮定'
    },
    care: {
      title: '生命保険文化センター「生命保険に関する全国実態調査」',
      year: '2024年度', population: '過去3年間に介護経験がある2人以上世帯',
      monthly: 9.0, oneTime: 47.2, months: 55,
      unit: '万円/月・万円/回・月',
      url: 'https://www.jili.or.jp/lifeplan/lifesecurity/1116.html',
      checkedAt: '2026-09-30'
    }
  };
  const EVIDENCE_LABELS = {
    monthlyExpenseTotal:'老後の月額支出合計',monthlyLife:'基本生活費',monthlyHousing:'住居費',annualMedical:'医療・健康維持費',
    annualDream:'趣味・旅行費',oneTimeEvent:'退職時イベント費',familySupport:'家族支援費',
    debtAtRetire:'退職時の借入残',personalAssetsNow:'個人金融資産',
    monthlySaving:'個人の積立',preRetireReturn:'現役中の運用利回り',
    retirementReturn:'老後運用利回り',inflationRate:'老後支出インフレ率',
    pensionSelf:'本人年金額',pensionSpouse:'配偶者年金額',
    plannedRetirementPay:'予定退職金',confirmedPayable:'法人の支払可能額',
    careStartAge:'介護開始時期',spousePensionStartAge:'配偶者年金開始年齢',
    careMonthly:'介護月額',careOneTime:'介護一時費用',careMonths:'介護期間',
    annuityAnnual:'年金保険の年額',annuityYears:'年金保険の期間',
    workIncome:'退職後の仕事収入',workUntilAge:'仕事収入の終了年齢',
    otherIncome:'不動産・配当等',corporateReserveNow:'法人の既準備額',
    corporateAnnualReserve:'法人の年次積立余力',insuranceCashAtRetire:'保険等の退職時見込額',
    retirementNetRatio:'退職金の手取り率',pensionSelfNetRatio:'本人年金の手取り仮定率',
    pensionSpouseNetRatio:'配偶者年金の手取り仮定率',priceBasis:'金額の価格基準',
    earlyPensionSelf:'本人の繰上げ受給額',earlyPensionSpouse:'配偶者の繰上げ受給額'
  };
  const FIELD_LABELS={...EVIDENCE_LABELS,currentAge:'現在年齢',retireAge:'引退予定年齢',
    lifeAge:'計画終了年齢',pensionStartAge:'本人の公的年金開始年齢',spouseAge:'配偶者年齢',
    annuityYears:'年金保険の期間',expenseMode:'支出の入力方法',
    pensionSelfBasis:'本人年金の金額区分',pensionSpouseBasis:'配偶者年金の金額区分'};

  const numberKeys = [
    'currentAge','retireAge','lifeAge','pensionStartAge','spouseAge','spousePensionStartAge',
    'monthlyExpenseTotal','monthlyLife','monthlyHousing','annualMedical','annualDream','oneTimeEvent','familySupport',
    'careMonthly','careMonths','careOneTime','careStartAge','debtAtRetire','pensionSelf',
    'pensionSpouse','annuityAnnual','annuityYears','workIncome','workUntilAge','otherIncome',
    'retirementReturn','inflationRate','personalAssetsNow','monthlySaving','preRetireReturn',
    'plannedRetirementPay','retirementNetRatio','corporateReserveNow','corporateAnnualReserve',
    'insuranceCashAtRetire','pensionSelfNetRatio','pensionSpouseNetRatio'
  ];
  const nonnegativeKeys = numberKeys.filter(k => !['retirementReturn','inflationRate','preRetireReturn',
    'currentAge','retireAge','lifeAge','pensionStartAge','spouseAge','spousePensionStartAge',
    'careStartAge','workUntilAge'].includes(k));
  const breakdownExpenseKeys = ['monthlyLife','monthlyHousing','annualMedical','annualDream'];
  const hasOwn = (object,key) => Object.prototype.hasOwnProperty.call(object,key);
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const evidenceDependencies = {
    monthlyExpenseTotal:['expenseMode','priceBasis','monthlyExpenseTotal'],
    monthlyLife:['expenseMode','priceBasis','monthlyLife'],monthlyHousing:['expenseMode','priceBasis','monthlyHousing'],
    annualMedical:['expenseMode','priceBasis','annualMedical'],annualDream:['expenseMode','priceBasis','annualDream'],
    oneTimeEvent:['oneTimeEvent','priceBasis'],familySupport:['familySupport','priceBasis'],
    careMonthly:['careMonthly','priceBasis'],careOneTime:['careOneTime','priceBasis'],
    pensionSelf:['pensionSelf','pensionStartAge','pensionSelfBasis'],
    pensionSpouse:['pensionSpouse','spousePensionStartAge','pensionSpouseBasis','spouseAge'],
    plannedRetirementPay:['plannedRetirementPay','retireAge'],
    confirmedPayable:['confirmedPayable','retireAge'],
    careStartAge:['careStartAge','careSubject','careMonths'],
    earlyPensionSelf:['pensionSelf','pensionStartAge','pensionSelfBasis','pensionSelfNetRatio'],
    earlyPensionSpouse:['pensionSpouse','spousePensionStartAge','pensionSpouseBasis','pensionSpouseNetRatio','spouseAge']
  };

  // Compatibility is explicit: plans that predate expenseMode use their original
  // breakdown. A total is derived only from complete values, never default money.
  function normalizeExpenseState(input) {
    const state = {...input};
    for (const key of [...numberKeys,'confirmedPayable'])
      if (Object.is(state[key],-0)) state[key]=0;
    if (!hasOwn(state,'expenseMode')) state.expenseMode='breakdown';
    if (!hasOwn(state,'monthlyExpenseTotal') && state.expenseMode==='breakdown' &&
        breakdownExpenseKeys.every(key=>typeof state[key]==='number' && Number.isFinite(state[key])))
      state.monthlyExpenseTotal=decimalLinearSum([[state.monthlyLife,12],[state.monthlyHousing,12],
        [state.annualMedical,1],[state.annualDream,1]])/12;
    return state;
  }
  function activeExpenseKeys(state) {
    return state.expenseMode==='total' ? ['monthlyExpenseTotal'] : breakdownExpenseKeys;
  }
  function evidenceErrors(evidence) {
    if (!isRecord(evidence)) return ['根拠データの形式が正しくありません'];
    const errors=[];
    for (const [key,item] of Object.entries(evidence)) {
      if (!hasOwn(EVIDENCE_LABELS,key)) continue; // Preserve unrelated metadata.
      if (!isRecord(item) || hasOwn(item,'status') && !['missing','assumed','verified'].includes(item.status) ||
          ['source','date','note','verifiedValue'].some(part=>hasOwn(item,part) && typeof item[part]!=='string'))
        errors.push(`${EVIDENCE_LABELS[key]}の根拠データの形式が正しくありません`);
    }
    return errors;
  }
  function validate(input) {
    if (!isRecord(input)) return ['計画の入力値がありません'];
    input=normalizeExpenseState(input);
    const errors = [];
    if (input.legacySummaryOnly) errors.push('旧サマリーに計画の入力値がないため、数値試算はできません');
    for (const key of numberKeys) {
      if (input[key] === '' || input[key] === null || input[key] === undefined ||
          typeof input[key]!=='number' || !Number.isFinite(input[key])) errors.push(`${FIELD_LABELS[key]}を入力してください`);
      else if (nonnegativeKeys.includes(key) && Number(input[key]) < 0) errors.push(`${FIELD_LABELS[key]}は0以上にしてください`);
    }
    if (input.currentAge > input.retireAge || input.retireAge >= input.lifeAge)
      errors.push('現在年齢≦引退年齢＜計画終了年齢にしてください');
    for (const key of ['currentAge','retireAge','lifeAge','spouseAge','careStartAge',
      'pensionStartAge','spousePensionStartAge','workUntilAge'])
      if (Number(input[key]) < 0 || Number(input[key]) > 120 || Number(input[key]) % 1 !== 0)
        errors.push(`${FIELD_LABELS[key]}は0～120の整数にしてください`);
    if (Number(input.lifeAge)-Number(input.retireAge)>120) errors.push('計画期間が長すぎます');
    for (const key of ['preRetireReturn','retirementReturn','inflationRate'])
      if (Number(input[key]) <= -100) errors.push(`${FIELD_LABELS[key]}は-100％より大きくしてください`);
    if (Number(input.retirementNetRatio) <= 0 || Number(input.retirementNetRatio) > 100)
      errors.push('退職金手取り率は0％超100％以下にしてください');
    for (const key of ['pensionSelfNetRatio','pensionSpouseNetRatio'])
      if (Number(input[key]) <= 0 || Number(input[key]) > 100) errors.push(`${FIELD_LABELS[key]}は0％超100％以下にしてください`);
    if (!['total','breakdown'].includes(input.expenseMode)) errors.push('支出の入力方法を選んでください');
    if (!['current','retirement'].includes(input.priceBasis)) errors.push('金額の価格基準を選んでください');
    if (!['self','spouse'].includes(input.careSubject)) errors.push('介護対象者を選んでください');
    if (input.careSubject==='spouse' && !Number(input.hasSpouse) &&
        (Number(input.careMonthly)>0 || Number(input.careOneTime)>0))
      errors.push('配偶者がいない場合は配偶者の介護費を計上できません');
    for (const key of ['pensionSelfBasis','pensionSpouseBasis'])
      if (!['net','gross'].includes(input[key])) errors.push(`${FIELD_LABELS[key]}を選んでください`);
    if (Number.isFinite(input.annuityYears) && !Number.isInteger(input.annuityYears))
      errors.push('年金保険の期間は整数の年数で入力してください');
    if (Number.isFinite(input.careMonths) && !Number.isInteger(input.careMonths))
      errors.push('介護期間は整数の月数で入力してください');
    if (Number(input.careMonths)>1200) errors.push('介護期間は1200か月以下にしてください');
    for (const key of ['preRetireReturn','retirementReturn','inflationRate'])
      if (Number(input[key])>100) errors.push(`${FIELD_LABELS[key]}は100％以下にしてください`);
    for (const key of nonnegativeKeys)
      if (Number(input[key])>1e9) errors.push(`${FIELD_LABELS[key]}が計算可能な範囲を超えています`);
    if (input.confirmedPayable !== null && input.confirmedPayable !== '' && input.confirmedPayable !== undefined &&
        (typeof input.confirmedPayable!=='number' || !Number.isFinite(input.confirmedPayable) || input.confirmedPayable < 0))
      errors.push('確認済み支払可能額は0以上の金額か未入力にしてください');
    if (Number(input.confirmedPayable)>1e9) errors.push('確認済み支払可能額が計算可能な範囲を超えています');
    if (![0,1,false,true].includes(input.hasSpouse)) errors.push('配偶者の有無を選んでください');
    if (hasOwn(input,'pensionSelfYears') && (!Number.isInteger(input.pensionSelfYears) ||
        input.pensionSelfYears < 0 || input.pensionSelfYears > 120))
      errors.push('本人年金の受給期間は0～120の整数にしてください');
    if (hasOwn(input,'evidence')) errors.push(...evidenceErrors(input.evidence));
    return errors;
  }

  function futureValue(start, annual, rate, years) {
    if (!years) return start;
    const factor = (1 + rate) ** years;
    return start * factor + annual * (Math.abs(rate) < 1e-12 ? years : (factor - 1) / rate);
  }
  function annualPayment(target, rate, years) {
    if (target <= 0) return 0;
    if (!years) return null;
    const factor = (1 + rate) ** years;
    return target / (Math.abs(rate) < 1e-12 ? years : (factor - 1) / rate);
  }
  function evidenceValue(state,key) {
    state=normalizeExpenseState(state);
    return JSON.stringify((evidenceDependencies[key] || [key]).map(name=>state[name]));
  }
  function verified(state, key) {
    const item = state.evidence?.[key];
    return item?.status === 'verified' && typeof item.source==='string' && Boolean(item.source.trim()) &&
      typeof item.date==='string' && Boolean(item.date) &&
      item.verifiedValue === evidenceValue(state,key);
  }
  // This bounds only IEEE-754 arithmetic residue. Its scale comes from the
  // actual operands, with no fixed money tolerance (even tiny real needs remain).
  function roundoffAllowance(...values) {
    return values.reduce((sum,value)=>sum+Math.abs(value)*Number.EPSILON*4,0);
  }
  function capitalThreshold(flows,rate,oneTime) {
    if (rate===0) {
      // Neumaier summation retains small, real add-ons next to large balances.
      let sum=oneTime,correction=0,required=oneTime;
      const add=value=>{
        const next=sum+value;
        correction+=Math.abs(sum)>=Math.abs(value) ? (sum-next)+value : (value-next)+sum;
        sum=next;
      };
      for (const flow of flows) {
        add(flow.spending); add(-flow.income);
        required=Math.max(required,sum+correction);
      }
      return required;
    }
    let required=0;
    for (let index=flows.length-1;index>=0;index--)
      required=Math.max(0,(flows[index].spending-flows[index].income)+required/(1+rate));
    return oneTime+required;
  }
  function decimalLinearSum(terms) {
    // Sum the original base-10 numeric operands exactly, then convert once to
    // Number. Integer multipliers never trim input or saved decimal precision.
    const parts=terms.map(([value,multiplier])=>{
      const [mantissa,exponent='0']=String(value).split('e');
      const [whole,fraction='']=mantissa.split('.');
      return {coefficient:BigInt(whole+fraction)*BigInt(multiplier),exponent:Number(exponent)-fraction.length};
    });
    const exponent=Math.min(...parts.map(part=>part.exponent));
    const coefficient=parts.reduce((sum,part)=>sum+part.coefficient*10n**BigInt(part.exponent-exponent),0n);
    return Number(`${coefficient}e${exponent}`);
  }
  function cleanRoundoff(value, allowance) {
    return value === 0 || Number.isFinite(value) && Math.abs(value) <= allowance ? 0 : value;
  }
  function simulate(flows, capital, rate, oneTime = 0) {
    // Cleanup is permitted only for a genuinely sufficient capital amount.
    // A deficient plan must retain its real shortfall and shortage year.
    const mayClean=capital>=capitalThreshold(flows,rate,oneTime);
    let allowance = roundoffAllowance(capital,oneTime);
    let balance = cleanRoundoff(capital - oneTime,mayClean ? allowance:0);
    return flows.map(flow => {
      const beginningBalance = balance;
      const afterAllowance = allowance + roundoffAllowance(beginningBalance,flow.income,flow.spending);
      const afterCashflow = cleanRoundoff(beginningBalance + flow.income - flow.spending,mayClean ? afterAllowance:0);
      const investmentGain = cleanRoundoff(afterCashflow * rate,0);
      // Multiplication avoids catastrophic cancellation near a -100% return.
      const nextBalance = afterCashflow * (1+rate);
      allowance = afterAllowance * Math.abs(1+rate) + roundoffAllowance(nextBalance);
      balance = cleanRoundoff(nextBalance,mayClean ? allowance:0);
      return {age: flow.age, beginningBalance, income: flow.income, spending: flow.spending,
        afterCashflow, investmentGain, endBalance: balance, balance};
    });
  }
  function sufficient(flows, capital, rate, oneTime) {
    if (capital < oneTime) return false;
    return simulate(flows, capital, rate, oneTime).every(x =>
      Number.isFinite(x.afterCashflow) && Number.isFinite(x.endBalance) &&
      x.afterCashflow >= 0 && x.endBalance >= 0);
  }
  function minimumCapital(flows, rate, oneTime) {
    const threshold=capitalThreshold(flows,rate,oneTime);
    if (!Number.isFinite(threshold)) throw new RangeError('必要資金を計算できません');
    // Zero is a real branch, not a tiny positive bisection remainder.
    if (threshold===0 && sufficient(flows,0,rate,oneTime)) return 0;
    let low = 0;
    let high = Math.max(1,oneTime,threshold);
    let count = 0;
    while (!sufficient(flows, high, rate, oneTime)) {
      high *= 2;
      if (!Number.isFinite(high) || ++count > 1024) throw new RangeError('必要資金を計算できません');
    }
    // Search to adjacent representable numbers, independently of the reporting
    // tolerance. The larger cap also covers positive subnormal requirements.
    for (let i = 0; i < 1075; i++) {
      const mid = low + (high-low)/2;
      if (mid===low || mid===high) break;
      if (sufficient(flows, mid, rate, oneTime)) high = mid;
      else low = mid;
    }
    // Repeated subtraction can leave an exact integer boundary a few ULPs away.
    // Only snap a nonzero integer within an operation-scaled roundoff bound and
    // only after checking that this candidate is sufficient. No input is rounded.
    high=Math.max(high,threshold);
    const integer = Math.round(high);
    const boundaryAllowance = Math.abs(high)*Number.EPSILON*2;
    if (integer > 0 && integer>=threshold && Math.abs(high-integer)<=boundaryAllowance && sufficient(flows,integer,rate,oneTime))
      return integer;
    return high;
  }
  function assess(result) {
    if (result.errors.length) return {key:'error', reasons:result.errors};
    const reasons = [];
    if (result.householdGap > TOLERANCE) reasons.push(`世帯の生活資金が約${Math.ceil(result.householdGap)}万円不足`);
    if (result.companyGap !== null && result.companyGap > TOLERANCE)
      reasons.push(`法人原資が約${Math.ceil(result.companyGap)}万円不足`);
    const shortage = reasons.length > 0;
    if (result.careOutside > TOLERANCE) reasons.push(`計画期間外の介護費用${Math.ceil(result.careOutside)}万円は試算に含めていません`);
    const s = result.state;
    if (s.migrationWarning && !s.migrationReviewed) reasons.push(s.migrationWarning);
    const important = [...activeExpenseKeys(s),'oneTimeEvent',
      'familySupport','debtAtRetire','careMonthly','careOneTime','personalAssetsNow',
      'retirementReturn','inflationRate'];
    if (s.personalAssetsNow>0 || s.monthlySaving>0 || s.plannedRetirementPay>0)
      important.push('preRetireReturn');
    for (const key of ['annuityAnnual','workIncome','otherIncome','monthlySaving','corporateReserveNow',
      'corporateAnnualReserve','insuranceCashAtRetire'])
      if (s[key]>0 && (key!=='corporateReserveNow' && key!=='corporateAnnualReserve' && key!=='insuranceCashAtRetire' || s.plannedRetirementPay>0))
        important.push(key);
    if (s.annuityAnnual>0) important.push('annuityYears');
    if (s.workIncome>0) important.push('workUntilAge');
    if (s.pensionSelf > 0) important.push('pensionSelf');
    if (s.hasSpouse && s.pensionSpouse > 0) important.push('pensionSpouse','spousePensionStartAge');
    if (s.pensionSelf > 0 && s.pensionSelfBasis==='gross') important.push('pensionSelfNetRatio');
    if (s.hasSpouse && s.pensionSpouse > 0 && s.pensionSpouseBasis==='gross') important.push('pensionSpouseNetRatio');
    if (s.plannedRetirementPay > 0) important.push('plannedRetirementPay','confirmedPayable','retirementNetRatio');
    if (s.careMonthly > 0 || s.careOneTime > 0) important.push('careStartAge','careMonths');
    for (const key of important) {
      if (key === 'confirmedPayable' && s.confirmedPayable === null) reasons.push('法人の確認済み支払可能額が未入力');
      else if (!verified(s,key)) reasons.push(`${EVIDENCE_LABELS[key]}の金額・前提に対応する根拠と確認日が未確認`);
    }
    if (s.pensionSelf > 0 && s.pensionStartAge < 65 && !verified(s,'earlyPensionSelf'))
      reasons.push('本人の65歳前受給額に対応する根拠が未確認');
    if (s.hasSpouse && s.pensionSpouse > 0 && s.spousePensionStartAge < 65 && !verified(s,'earlyPensionSpouse'))
      reasons.push('配偶者の65歳前受給額に対応する根拠が未確認');
    return {key: shortage ? 'shortage' : reasons.length ? 'assumed' : 'adequate', reasons};
  }
  function calculate(input) {
    if (input && typeof input==='object' && !Array.isArray(input)) input=normalizeExpenseState(input);
    const errors = validate(input);
    if (errors.length) return {state:input, errors, assessment:{key:'error',reasons:errors}, cashflows:[]};
    const s = {...input, hasSpouse:Number(input.hasSpouse)===1 || input.hasSpouse===true,
      yearsToRetire:input.retireAge-input.currentAge,
      retirementYears:input.lifeAge-input.retireAge,
      preRate:input.preRetireReturn/100, retireRate:input.retirementReturn/100,
      inflationRateDecimal:input.inflationRate/100, netRatio:input.retirementNetRatio/100};
    const careStartSelfAge = s.currentAge + s.careStartAge - (s.careSubject==='spouse' ? s.spouseAge : s.currentAge);
    const careByAge = new Map();
    let careInside = 0, careOutside = 0;
    const priceFactor = age => (1+s.inflationRateDecimal) ** Math.max(0,
      age-(s.priceBasis==='current' ? s.currentAge : s.retireAge));
    if (s.careSubject !== 'spouse' || s.hasSpouse) {
      for (let month=0; month<s.careMonths; month++) {
        const age = careStartSelfAge + Math.floor(month/12);
        const amount = s.careMonthly * priceFactor(age);
        careByAge.set(age,(careByAge.get(age)||0)+amount);
        if (age>=s.retireAge && age<s.lifeAge) careInside+=amount;
        else careOutside+=amount;
      }
      if (s.careMonthly>0 || s.careOneTime>0) {
        const amount = s.careOneTime * priceFactor(careStartSelfAge);
        careByAge.set(careStartSelfAge,(careByAge.get(careStartSelfAge)||0)+amount);
        if (careStartSelfAge>=s.retireAge && careStartSelfAge<s.lifeAge) careInside+=amount;
        else careOutside+=amount;
      }
    }
    const annualBasicSpend=s.expenseMode==='total' ? decimalLinearSum([[s.monthlyExpenseTotal,12]]) :
      decimalLinearSum([[s.monthlyLife,12],[s.monthlyHousing,12],[s.annualMedical,1],[s.annualDream,1]]);
    const oneTimeAtRetire=(s.oneTimeEvent+s.familySupport+s.debtAtRetire) * priceFactor(s.retireAge);
    const cashflows=[];
    for (let age=s.retireAge; age<s.lifeAge; age++) {
      const spouseYearAge=s.spouseAge+(age-s.currentAge);
      const selfPension=age>=s.pensionStartAge && (s.pensionSelfYears===undefined || age<s.pensionStartAge+s.pensionSelfYears)
        ? s.pensionSelf * (s.pensionSelfBasis==='gross' ? s.pensionSelfNetRatio/100 : 1) : 0;
      const spousePension=s.hasSpouse && spouseYearAge>=s.spousePensionStartAge
        ? s.pensionSpouse * (s.pensionSpouseBasis==='gross' ? s.pensionSpouseNetRatio/100 : 1) : 0;
      const annuity=age-s.retireAge<s.annuityYears?s.annuityAnnual:0;
      const work=age<s.workUntilAge?s.workIncome:0;
      const income=selfPension+spousePension+annuity+work+s.otherIncome;
      const basicSpending=annualBasicSpend*priceFactor(age);
      const care=careByAge.get(age)||0;
      const spending=basicSpending+care;
      cashflows.push({age,spouseAge:spouseYearAge,selfPension,spousePension,
        pension:selfPension+spousePension,annuity,work,other:s.otherIncome,
        income,basicSpending,care,spending,deficit:spending-income});
    }
    let requiredCapital;
    try { requiredCapital=minimumCapital(cashflows,s.retireRate,oneTimeAtRetire); }
    catch { const message='この利回り・期間では必要資金を有限の金額で計算できません';
      return {state:s,errors:[message],assessment:{key:'error',reasons:[message]},cashflows:[]}; }
    const personalAtRetire=futureValue(s.personalAssetsNow,s.monthlySaving*12,s.preRate,s.yearsToRetire);
    const requiredNetFromCompany=Math.max(0,requiredCapital-personalAtRetire);
    const requiredGrossRetirementPay=requiredNetFromCompany/s.netRatio;
    const plannedNetRetirementPay=s.plannedRetirementPay*s.netRatio;
    const householdGap=Math.max(0,requiredCapital-personalAtRetire-plannedNetRetirementPay);
    const confirmed=s.confirmedPayable===null || s.confirmedPayable==='' || s.confirmedPayable===undefined
      ? null:Number(s.confirmedPayable);
    const companyGap=s.plannedRetirementPay>0 ? confirmed===null ? null:Math.max(0,s.plannedRetirementPay-confirmed):0;
    const corporatePreparedGross=futureValue(s.corporateReserveNow,s.corporateAnnualReserve,s.preRate,s.yearsToRetire)+s.insuranceCashAtRetire;
    const sourceGapForRequired=Math.max(0,requiredGrossRetirementPay-corporatePreparedGross);
    const annualAdditionalPreparation=annualPayment(sourceGapForRequired,s.preRate,s.yearsToRetire);
    const planBalances=simulate(cashflows,personalAtRetire+plannedNetRetirementPay,s.retireRate,oneTimeAtRetire);
    const fullBalances=simulate(cashflows,requiredCapital,s.retireRate,oneTimeAtRetire);
    const result={state:s,errors:[],cashflows,annualBasicSpend,oneTimeAtRetire,
      careReserve:careInside+careOutside,careAge:careStartSelfAge,careInside,careOutside,
      personalAtRetire,requiredCapital,requiredNetFromCompany,requiredGrossRetirementPay,
      plannedNetRetirementPay,retirementDesignGap:Math.max(0,requiredGrossRetirementPay-s.plannedRetirementPay),
      corporatePreparedGross,sourceGapForRequired,annualAdditionalPreparation,householdGap,companyGap,
      confirmedPayable:confirmed,planBalances,fullBalances,
      planRunout:personalAtRetire+plannedNetRetirementPay+TOLERANCE<oneTimeAtRetire
        ? {age:s.retireAge,phase:'retirementPayment'}:
          planBalances.find(x=>x.afterCashflow < -TOLERANCE || x.endBalance < -TOLERANCE),
      coverageRatio:requiredCapital>0?(personalAtRetire+plannedNetRetirementPay)/requiredCapital:1,
      spendingTotal:cashflows.reduce((n,x)=>n+x.spending,oneTimeAtRetire),
      incomeTotal:cashflows.reduce((n,x)=>n+x.income,0)};
    result.assessment=assess(result);
    return result;
  }
  function compare(before,after) {
    const a=calculate(before),b=calculate(after);
    if (a.errors.length || b.errors.length) return {errors:[...a.errors,...b.errors]};
    const factor=(1+a.state.preRate) ** (b.state.retireAge-a.state.retireAge);
    return {householdImprovement:a.householdGap-b.householdGap/factor,
      companyImprovement:a.companyGap===null || b.companyGap===null ? null:a.companyGap-b.companyGap/factor,
      forecastPreparationImprovement:a.sourceGapForRequired-b.sourceGapForRequired/factor,
      evaluationAge:a.state.retireAge,before:a,after:b};
  }
  function report(r) {
    const common={requiredCapital:r.requiredCapital,householdGap:r.householdGap,
      companyGap:r.companyGap,careOutside:r.careOutside,years:r.state.retirementYears,
      assessment:r.assessment,period:`${r.state.retireAge}歳から${r.state.lifeAge}歳になるまで`,
      reasons:r.assessment.reasons};
    return {summary:common,chart:common,comparison:common,print:common,export:common};
  }
  function sameJsonValue(left,right) {
    if (left===right) return true;
    if (!left || !right || typeof left!=='object' || typeof right!=='object' ||
        Array.isArray(left)!==Array.isArray(right)) return false;
    const keys=Object.keys(left),otherKeys=Object.keys(right);
    return keys.length===otherKeys.length && keys.every(key=>hasOwn(right,key) && sameJsonValue(left[key],right[key]));
  }
  function validateSavedState(state) {
    // Old v2 breakdown plans predate the two expense-mode fields. All other
    // model fields must exist before the UI may merge or mutate a current plan.
    const compatibleBreakdown = !hasOwn(state,'expenseMode') || state.expenseMode==='breakdown';
    for (const key of numberKeys) {
      if (key==='monthlyExpenseTotal' && compatibleBreakdown && !hasOwn(state,key)) continue;
      if (!hasOwn(state,key)) throw new Error(`${FIELD_LABELS[key]}が保存データにありません`);
    }
    for (const key of ['hasSpouse','careSubject','priceBasis','pensionSelfBasis','pensionSpouseBasis','confirmedPayable','evidence'])
      if (!hasOwn(state,key)) throw new Error(`${FIELD_LABELS[key] || key}が保存データにありません`);
    if (!isRecord(state.evidence)) throw new Error('根拠データの形式が正しくありません');
    // Summary-only is a calculation stop flag, never a schema-validation bypass.
    const errors=validate({...state,legacySummaryOnly:false});
    if (errors.length) throw new Error(errors.join('、'));
  }
  function exactLegacyMigration(data) {
    if (typeof data.legacyOriginal!=='string') return false;
    try {
      const original=JSON.parse(data.legacyOriginal);
      if (!isRecord(original) || hasOwn(original,'version') && original.version!==1) return false;
      return sameJsonValue(data,migrateLegacy(original,data.legacyOriginal));
    } catch { return false; }
  }
  function migrate(raw) {
    const data=JSON.parse(raw);
    if (!isRecord(data)) throw new Error('保存形式が正しくありません');
    if (data.version===VERSION) {
      if (!isRecord(data.state)) throw new Error('状態データがありません');
      // Partial historical migrations are supported only if their entire envelope
      // exactly matches a fresh migration of the preserved, original legacy JSON.
      if (!exactLegacyMigration(data)) {
        if (!hasOwn(data.state,'evidence')) {
          // Rev.5 reset saved complete numeric inputs without an evidence object.
          // Validate every other required field before adding only empty evidence.
          validateSavedState({...data.state,evidence:{}});
          const warning='旧v2保存データに根拠情報がありません。保存済みの数値を保持し、未確認の前提として読み込みました。';
          return {...data,state:{...data.state,evidence:{},migrationReviewed:false,
            migrationWarning:[data.state.migrationWarning,warning].filter(value=>typeof value==='string' && value.trim()).join(' ')},
            legacyV2Original:raw};
        }
        validateSavedState(data.state);
      }
      return data;
    }
    return migrateLegacy(data,raw);
  }
  function migrateLegacy(data,raw) {
    if ('version' in data && data.version!==1) throw new Error('未対応の保存形式です');
    const summaryOnly=data.title==='論点整理サマリー' && !data.state;
    if (summaryOnly) return {version:VERSION,
      state:{vision:data.vision || '',selectedDirection:data.selectedDirection || '',
        migrationWarning:'旧サマリーには入力値が保存されていません。原文を参照し、計画を新規入力してください。',
        migrationReviewed:false,legacySummaryOnly:true,evidence:{}},
      sources:{},legacyOriginal:raw,legacySummary:data};
    const old=data.state && data.version===1 ? data.state:data;
    if (!isRecord(old)) throw new Error('旧計画の形式が正しくありません');
    if (!['currentAge','retireAge','monthlyLife'].some(key=>key in old))
      throw new Error('旧計画の入力値が見つかりません');
    const state={...old,spousePensionStartAge:65,careStartAge:78,
      careMonths:Math.round(Number(old.careYears||0)*12),careSubject:'self',priceBasis:'retirement',
      pensionSelfBasis:'net',pensionSpouseBasis:'net',pensionSelfNetRatio:100,pensionSpouseNetRatio:100,
      confirmedPayable:null,
      migrationWarning:'旧データから移行した未確認の前提があります。',
      legacySummaryOnly:false,
      migrationReviewed:false,
      evidence:{...old.evidence}};
    for (const key of ['spousePensionStartAge','careStartAge','careSubject','priceBasis',
      'pensionSelfBasis','pensionSpouseBasis','confirmedPayable','pensionSelf','pensionSpouse'])
      state.evidence[key]={status:'assumed',source:'旧データからの暫定移行',date:'',note:'資料で再確認してください'};
    return {version:VERSION,state,sources:{care:{title:'旧入力値の出典未確認',year:'不明',unit:'万円/月・万円/回',
      checkedAt:'',reference:{...SOURCES.care}}},legacyOriginal:raw};
  }
  const api={VERSION,SOURCES,EVIDENCE_LABELS,TOLERANCE,validate,calculate,simulate,compare,report,migrate,verified,evidenceValue,normalizeExpenseState,activeExpenseKeys};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  root.PlannerModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
