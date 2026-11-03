const MAX_SIZE = 500 * 1024;
function detectType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return { mime: 'application/pdf', extension: 'pdf' };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', extension: 'jpg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return { mime: 'image/png', extension: 'png' };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', extension: 'webp' };
  return null;
}
function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function decodeDocument(body) {
  const value = body?.base64;
  if (typeof value !== 'string' || !value.length || value.length > Math.ceil(MAX_SIZE / 3) * 4 || value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) fail('Provide a valid document of 500 KB or smaller.');
  const buffer = Buffer.from(value, 'base64');
  if (!buffer.length || buffer.length > MAX_SIZE) fail('The document must be 500 KB or smaller.');
  if (!detectType(buffer)) fail('Only PDF, JPG, PNG and WEBP documents are accepted.');
  return buffer;
}
module.exports = { MAX_SIZE, detectType, decodeDocument, fail };
