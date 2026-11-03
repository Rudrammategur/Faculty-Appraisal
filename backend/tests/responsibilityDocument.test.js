const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detectType, decodeDocument, MAX_SIZE } = require('../src/services/responsibilityDocument');
const encode = buffer => ({ base64: buffer.toString('base64') });
test('accepts supported signatures and preserves binary bytes', () => {
  for (const [hex, mime] of [['255044462d312e37','application/pdf'], ['ffd8ffe00000','image/jpeg'], ['89504e470d0a1a0a','image/png'], ['524946460400000057454250','image/webp']]) {
    const buffer = Buffer.from(hex, 'hex');
    assert.equal(detectType(buffer).mime, mime);
    assert.deepEqual(decodeDocument(encode(buffer)), buffer);
  }
});
test('rejects renamed unsupported data and malformed base64', () => {
  for (const body of [{}, { base64: '' }, { base64: '!!!!' }, encode(Buffer.from('<script>bad</script>'))]) {
    assert.throws(() => decodeDocument(body), error => error.statusCode === 400);
  }
});
test('accepts exactly 500 KB and rejects larger files', () => {
  const buffer = Buffer.alloc(MAX_SIZE); buffer.write('%PDF-');
  assert.equal(decodeDocument(encode(buffer)).length, MAX_SIZE);
  assert.throws(() => decodeDocument(encode(Buffer.concat([buffer, Buffer.from('x')]))));
});
