const crypto = require('crypto');

function normalizeLawRecord(raw) {
  // Adapter intentionally keeps the upstream response opaque until its exact schema is verified.
  return {
    source: '국가법령정보센터',
    status: 'REVIEW_REQUIRED',
    verified: false,
    retrievedAt: new Date().toISOString(),
    fingerprint: crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex'),
    raw
  };
}

function verificationState(record, expected) {
  if (!record || !expected) return 'SOURCE_REQUIRED';
  if (record.lawName !== expected.lawName) return 'REVIEW_REQUIRED';
  if (expected.article && record.article !== expected.article) return 'REVIEW_REQUIRED';
  if (record.effectiveDate && expected.effectiveDate && record.effectiveDate !== expected.effectiveDate) return 'REVIEW_REQUIRED';
  return 'VERIFIED';
}

module.exports = { normalizeLawRecord, verificationState };
