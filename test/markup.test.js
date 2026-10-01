const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const model = require('../model.js');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

test('markup has every referenced ID and unique form fields', () => {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  const used = [...script.matchAll(/getElementById\("([^"]+)"\)/g)].map(match => match[1]);
  const fields = [...html.matchAll(/data-field="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate ID');
  assert.equal(new Set(fields).size, fields.length, 'duplicate data-field');
  assert.deepEqual([...new Set(used.filter(id => !ids.includes(id)))], []);
  const context = vm.createContext({document:{addEventListener(){}},PlannerModel:model,structuredClone});
  vm.runInContext(script, context);
  const defaults = vm.runInContext('fields', context);
  assert.deepEqual(Object.keys(defaults).filter(key=>!fields.includes(key)), []);
  assert.deepEqual(model.calculate({...defaults,evidence:{}}).errors, []);
  assert.ok(html.indexOf('src="model.js"') < html.indexOf('src="app.js"'));
});

test('printable summary carries the same period, status and outside costs', () => {
  const context = vm.createContext({document:{addEventListener(){}},PlannerModel:model,structuredClone});
  vm.runInContext(script,context);
  const format=vm.runInContext('formatIssueSummaryText',context);
  const money=vm.runInContext('yenNeed',context);
  const text=format({status:'仮定・未確認あり',hasUncheckedItems:true,vision:'旅行',
    period:'65歳から78歳になるまで',basis:'退職時点の名目額',
    result:{requiredCapital:'1,560万円',personalAtRetire:'0万円',requiredRetirementPay:'1,560万円',
      annualPreparation:'100万円/年',householdGap:'1,560万円',companyGap:'未確認',careOutside:'700万円'},
    assumptions:['期間外介護費用を含まず'],sources:{care:{title:'旧出典',year:'不明'}},
    shortageCause:'世帯の生活資金が不足',consideredOptions:['未選択'],selectedDirection:'未入力',
    uncheckedItems:['年金額'],homework:['確認する']});
  for (const value of ['65歳から78歳になるまで','仮定・未確認あり','700万円','期間外介護費用を含まず'])
    assert.ok(text.includes(value));
  assert.equal(money(241.212121),'242万円');
});
