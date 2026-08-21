// Minimal deterministic rule engine for the standalone HTML dashboard.
// Legal citations are deliberately NOT generated here; they must come from verified law data.
function matches(facts, condition) {
  return Object.entries(condition).every(([key, expected]) => {
    if (key.endsWith('Min')) return Number(facts[key.replace(/Min$/, '')] ?? 0) >= Number(expected);
    return facts[key] === expected;
  });
}
function evaluateRules(facts, rules, procedures) {
  const ids = new Set();
  const explanations = {};
  for (const rule of rules) {
    if (!matches(facts, rule.when)) continue;
    for (const id of rule.procedureIds) {
      ids.add(id);
      explanations[id] ??= [];
      explanations[id].push({ ruleId: rule.id, reason: rule.description });
    }
  }
  return procedures.filter(p => ids.has(p.id)).map(p => ({ ...p, explanations: explanations[p.id] || [] }));
}
if (typeof module !== 'undefined') module.exports = { matches, evaluateRules };
