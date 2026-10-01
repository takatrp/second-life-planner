const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const model=require('../model.js');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
function harness() {
  const ids=new Map(), evidence=new Map(), storage=new Map();
  const get=id=>{if(!ids.has(id))ids.set(id,{hidden:false,textContent:'',value:'',children:[],replaceChildren(...items){this.children=items;},classList:{add(){},remove(){},toggle(){}},getContext(){return {clearRect(){}};}});return ids.get(id);};
  const document={addEventListener(){},getElementById:get,
    querySelector(selector){
      if(selector==='.migration-check')return get('migrationCheck');
      if(selector==='.result-column')return get('meetingResults');
      const key=selector.match(/data-evidence="([^"]+)"/);return key?evidence.get(key[1]):null;
    },
    querySelectorAll(selector){return selector==='[data-evidence]'?[...evidence.values()]:[];}};
  const context=vm.createContext({document,PlannerModel:model,structuredClone,Blob,URL,setTimeout(){},localStorage:{
    setItem(k,v){storage.set(k,v);},getItem(k){return storage.get(k)||null;}
  }});
  vm.runInContext(source,context);
  const defaults=vm.runInContext('fields',context);
  const elements={};
  for(const [key,value] of Object.entries(defaults)) {
    const tag=['vision','selectedDirection'].includes(key)?'TEXTAREA':
      typeof value==='string'||['hasSpouse','pensionSelfChecked','pensionSpouseChecked','workIncomeType','guaranteeReleaseStatus'].includes(key)?'SELECT':'INPUT';
    elements[key]={tagName:tag,type:typeof value==='boolean'?'checkbox':'number',checked:!!value};
    let currentValue=value===null?'':String(value);
    Object.defineProperty(elements[key],'value',{get(){return currentValue;},set(next){currentValue=String(next);},enumerable:true});
  }
  for(const key of Object.keys(model.EVIDENCE_LABELS))for(const part of ['status','source','date','note','verifiedValue']) {
    evidence.set(`${key}:${part}`,{dataset:{evidence:`${key}:${part}`},value:part==='status'?'assumed':''});
  }
  context.elements=elements;
  vm.runInContext('Object.assign(els,elements); const realUpdate=update; update=()=>{}; flashButton=()=>{};',context);
  return {context,elements,storage,get,run:code=>vm.runInContext(code,context)};
}

test('basic flow has 12 essential fields and all details start folded',()=>{
  const basic=html.slice(html.indexOf('id="basicInputs"'),html.indexOf('id="meetingResults"'));
  assert.equal([...basic.matchAll(/data-field=/g)].length,12);
  const folds=[...html.matchAll(/<details\b([^>]*)>/g)];
  assert.ok(folds.length>=6);
  assert.ok(folds.every(match=>!/(?:^|\s)open(?:\s|=|$)/.test(match[1])));
  for(const text of ['初めて不足','追加で必要な生活資金','額面','合算しません'])assert.ok(html.includes(text));
});

test('read/write retain unknown saved data and inactive expense values',()=>{
  const h=harness();
  h.run('currentPlan.state.customMemo="retain me"; (currentPlan.state.evidence ||= {}).custom={status:"assumed",source:"old"};');
  h.elements.expenseMode.value='breakdown';h.elements.monthlyExpenseTotal.value='999';
  h.run('rememberedExpenseTotal=80;');
  const state=h.run('readState()');
  assert.equal(state.customMemo,'retain me');assert.equal(state.evidence.custom.source,'old');
  assert.equal(state.monthlyExpenseTotal,80);
  assert.equal(model.calculate(state).annualBasicSpend,815);
  h.context.state=state;h.run('writeState(state)');
  assert.equal(h.elements.expenseMode.value,'breakdown');assert.equal(Number(h.elements.monthlyExpenseTotal.value),80);
});

test('mode switch preserves both inputs without double counting',()=>{
  const h=harness();
  h.elements.monthlyExpenseTotal.value='80';
  h.run('readState()');
  h.elements.expenseMode.value='breakdown';h.context.event={target:h.elements.expenseMode};
  h.run('onFieldChange(event)');
  assert.equal(model.calculate(h.run('readState()')).annualBasicSpend,815);
  h.elements.monthlyExpenseTotal.value='67.9166666667';
  h.elements.expenseMode.value='total';h.run('onFieldChange(event)');
  assert.equal(Number(h.elements.monthlyExpenseTotal.value),80);
  assert.equal(model.calculate(h.run('readState()')).annualBasicSpend,960);
  assert.equal(Number(h.elements.annualDream.value),240);
});

test('save and load preserve precision, modes and legacy fields',()=>{
  const h=harness();h.elements.monthlyExpenseTotal.value='33.3333333333';
  h.run('currentPlan.legacyOriginal="old original"; currentPlan.state.customMemo="keep"; saveState();');
  const raw=h.storage.get('second-life-planner-state-v2');
  const saved=JSON.parse(raw);
  assert.equal(saved.state.monthlyExpenseTotal,33.3333333333);assert.equal(saved.legacyOriginal,'old original');
  h.elements.monthlyExpenseTotal.value='90';h.run('loadState()');
  assert.equal(Number(h.elements.monthlyExpenseTotal.value),33.3333333333);
  assert.equal(h.run('readState().customMemo'),'keep');
});

test('invalid imports do not mutate the current plan or fields',async()=>{
  const h=harness();
  const before=h.run('JSON.stringify(readState())'),plan=h.run('JSON.stringify(currentPlan)');
  for(const raw of ['{bad',JSON.stringify({version:2,state:{currentAge:50,retireAge:65,lifeAge:88,monthlyLife:10,priceBasis:'retirement'}})]) {
    h.context.event={target:{files:[{text:async()=>raw}],value:'selected'}};
    await h.run('importPlan(event)');
    assert.equal(h.run('JSON.stringify(readState())'),before);
    assert.equal(h.run('JSON.stringify(currentPlan)'),plan);
    assert.match(h.get('inputErrors').textContent,/現在の計画は変更していません/);
    assert.equal(h.context.event.target.value,'');
  }
});

test('valid old v2 imports retain breakdown cashflows and original amounts',async()=>{
  const h=harness();const state=h.run('readState()');delete state.expenseMode;delete state.monthlyExpenseTotal;
  const previous=model.calculate(state);
  h.context.event={target:{files:[{text:async()=>JSON.stringify({version:2,state,sources:{}})}],value:'selected'}};
  await h.run('importPlan(event)');
  const loaded=h.run('readState()'),next=model.calculate(loaded);
  assert.equal(loaded.expenseMode,'breakdown');assert.equal(loaded.monthlyLife,state.monthlyLife);assert.equal(loaded.annualDream,state.annualDream);
  assert.equal(next.annualBasicSpend,previous.annualBasicSpend);assert.equal(next.requiredCapital,previous.requiredCapital);
});

test('quick living comparison uses the active mode and keeps care unchanged',()=>{
  const h=harness();const state=h.run('readState()');
  h.context.state=state;const total=h.run('comparisonLivingDraft(state,40)');
  assert.equal(model.calculate(total).annualBasicSpend,480);assert.equal(total.annualDream,state.annualDream);assert.equal(total.careMonthly,state.careMonthly);
  state.expenseMode='breakdown';const breakdown=h.run('comparisonLivingDraft(state,40)');
  assert.ok(Math.abs(model.calculate(breakdown).annualBasicSpend-480)<1e-9);assert.equal(breakdown.careMonthly,state.careMonthly);
  assert.equal(state.monthlyExpenseTotal,h.run('fields.monthlyExpenseTotal'));
  const unchanged=h.run('comparisonLivingDraft(state,PlannerModel.calculate(state).annualBasicSpend/12)');
  assert.equal(unchanged.monthlyLife,state.monthlyLife);assert.equal(unchanged.annualDream,state.annualDream);
});

test('zero donut is neutral with zero text; all required-money displays ceil consistently',()=>{
  const h=harness(),text=[],fills=[];
  h.context.canvas={width:420,height:260,getContext(){return new Proxy({fillText(value){text.push(value);},fill(){fills.push(this.fillStyle);}}, {get(target,key){return target[key]||(()=>{});},set(target,key,value){target[key]=value;return true;}});}};
  h.run('drawDonut(canvas,[],true)');
  assert.ok(text.includes('0万円'));assert.ok(text.includes('追加の初期資金は不要'));assert.ok(!fills.includes('#b43d37'));
  assert.equal(h.run('yenNeed(241.212121)'),'242万円');assert.equal(h.run('yenNeed(0)'),'0万円');assert.equal(h.run('yenNeed(0.0001)'),'1万円');assert.equal(h.run('yen(-0.0000005)'),'0万円');
  for(const value of [-0.49,-0.1,-0.0001,-0])assert.equal(h.run(`yen(${value})`),'0万円');
  assert.ok(source.includes('scenario.name}</span><strong>${result.errors.length?"条件を確認":yenNeed(result.requiredGrossRetirementPay)'));
});


test('valid to invalid and legacy states clear all calculated and printable results',()=>{
  const h=harness();
  h.run('syncInputContext=()=>{}; renderSummary=()=>{document.getElementById("firstShortage").textContent="valid result";document.getElementById("additionalCapital").textContent="100万円";}; renderFundingChart=renderBalanceChart=renderAccuracyStatus=renderShortageChoices=renderBasis=renderProposalChecklist=renderScenarios=renderIssueSummary=renderQuickComparisons=()=>{}; renderMeetingPrint=()=>{document.getElementById("printMeetingSummary").textContent="valid print";};');
  h.run('realUpdate()');assert.equal(h.get('firstShortage').textContent,'valid result');
  h.elements.retireAge.value='';h.run('realUpdate()');
  assert.equal(h.get('firstShortage').textContent,'-');assert.equal(h.get('additionalCapital').textContent,'-');
  assert.equal(h.get('shortageCauseText').textContent,'-');assert.equal(h.get('optionSpendReviewEffect').textContent,'入力内容を確認してください');
  assert.equal(h.get('calculationDetails').hidden,true);assert.match(h.get('printMeetingSummary').textContent,/未完了/);
  h.elements.retireAge.value='65';h.run('realUpdate()');
  assert.equal(h.get('calculationDetails').hidden,false);assert.equal(h.get('firstShortage').textContent,'valid result');
  h.run('currentPlan.state.legacySummaryOnly=true; realUpdate()');
  assert.equal(h.get('firstShortage').textContent,'-');assert.match(h.get('printMeetingSummary').textContent,/旧サマリー/);
});

test('absent spouse care remains preserved and requires explicit correction',()=>{
  const h=harness();h.elements.careSubject.value='spouse';h.elements.hasSpouse.value='0';
  const s=h.run('readState()'),r=model.calculate(s);
  assert.equal(s.careSubject,'spouse');assert.equal(s.careMonthly,9);
  assert.ok(r.errors.some(x=>x.includes('配偶者がいない')));
});


test('base-only v2 optional references stay unknown instead of sample amounts',async()=>{
  const h=harness();const state=h.run('readState()');
  for(const key of ['finalMonthlyComp','officerYears','meritMultiplier','guaranteeDebt'])delete state[key];
  h.context.event={target:{files:[{text:async()=>JSON.stringify({version:2,state,sources:{}})}],value:'selected'}};
  await h.run('importPlan(event)');
  const loaded=h.run('readState()');
  for(const key of ['finalMonthlyComp','officerYears','meritMultiplier','guaranteeDebt'])assert.equal(loaded[key],'');
  assert.equal(model.calculate(loaded).annualBasicSpend,model.calculate(state).annualBasicSpend);
  h.run('saveState(); loadState();');assert.equal(h.run('readState().guaranteeDebt'),'');
  h.context.result=model.calculate(loaded);
  assert.ok(h.run('buildValidationChecks(result)').some(item=>item.text.includes('保証残は未入力')));
});

test('malformed optional reference numbers reject before import mutation',async()=>{
  const h=harness(),before=h.run('JSON.stringify(currentPlan)'),state=h.run('readState()');
  for(const value of [null,'0',[],{},-1,1e9+1]) {
    state.guaranteeDebt=value;
    h.context.event={target:{files:[{text:async()=>JSON.stringify({version:2,state})}],value:'selected'}};
    await h.run('importPlan(event)');assert.equal(h.run('JSON.stringify(currentPlan)'),before);
    assert.match(h.get('inputErrors').textContent,/現在の計画は変更していません/);
  }
});


test('invalid optional references cannot produce a plan that its own loader rejects',()=>{
  const h=harness();h.run('saveState()');const saved=h.storage.get('second-life-planner-state-v2');
  h.run('downloadJson=()=>{throw new Error("unexpected export");};');
  for(const key of ['finalMonthlyComp','officerYears','meritMultiplier','guaranteeDebt']) {
    for(const value of [-1,1e9+1]) {
      h.elements[key].value=String(value);h.run('saveState(); exportPlan();');
      assert.equal(h.storage.get('second-life-planner-state-v2'),saved);
      assert.match(h.get('inputErrors').textContent,/出力できませんでした/);
      h.run('loadState()');assert.equal(h.elements[key].value,String(JSON.parse(saved).state[key]));
    }
  }
  for(const key of ['finalMonthlyComp','officerYears','meritMultiplier','guaranteeDebt'])h.elements[key].value='';
  h.run('saveState(); loadState();');assert.equal(h.run('readState().guaranteeDebt'),'');
});


test('reset creates a complete evidence envelope and reloads successfully',()=>{
  const h=harness();h.run('currentPlan.legacyV2Original="original v2"; resetState();');
  const saved=JSON.parse(h.storage.get('second-life-planner-state-v2'));
  assert.deepEqual(saved.state.evidence,{});assert.equal(saved.legacyV2Original,'original v2');
  assert.doesNotThrow(()=>model.migrate(JSON.stringify(saved)));
  h.run('loadState()');assert.equal(h.run('loadError'),'');
});
