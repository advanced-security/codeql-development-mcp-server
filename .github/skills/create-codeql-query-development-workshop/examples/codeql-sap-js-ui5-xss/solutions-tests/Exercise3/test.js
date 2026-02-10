// Test cases for XSS taint-tracking workshop
// Inspired by SAP UI5 XSS production query patterns

// ============================================================
// POSITIVE CASE 1: Direct XSS via document.location.search → innerHTML
// ============================================================
function positiveDirectInnerHTML() {
  var userInput = document.location.search; // source: URL query string
  var container = document.getElementById("output");
  container.innerHTML = userInput; // sink: innerHTML assignment — XSS!
}

// ============================================================
// POSITIVE CASE 2: XSS via window.location.hash → document.write()
// ============================================================
function positiveDocumentWrite() {
  var hashValue = window.location.hash; // source: URL hash fragment
  document.write(hashValue); // sink: document.write — XSS!
}

// ============================================================
// POSITIVE CASE 3: XSS via URL param parsed → outerHTML
// ============================================================
function positiveOuterHTML() {
  var params = new URLSearchParams(window.location.search);
  var name = params.get("name"); // source: user-controlled URL parameter
  var el = document.getElementById("profile");
  el.outerHTML = "<div>" + name + "</div>"; // sink: outerHTML assignment — XSS!
}

// ============================================================
// NEGATIVE CASE 1: Sanitized value via DOMPurify.sanitize() → innerHTML
// Should NOT be flagged because the input is sanitized
// ============================================================
function negativeSanitized() {
  var userInput = document.location.search; // source
  var clean = DOMPurify.sanitize(userInput); // barrier: sanitization
  var container = document.getElementById("safe-output");
  container.innerHTML = clean; // safe: sanitized input
}

// ============================================================
// NEGATIVE CASE 2: Hardcoded string → innerHTML
// Should NOT be flagged because there is no user-controlled source
// ============================================================
function negativeHardcoded() {
  var container = document.getElementById("static-content");
  container.innerHTML = "<p>Welcome to the application</p>"; // safe: hardcoded
}

// ============================================================
// EDGE CASE: XSS via eval() with URL input
// ============================================================
function edgeCaseEval() {
  var code = window.location.hash.substring(1); // source: URL hash
  eval(code); // sink: eval — code injection / XSS!
}

// ============================================================
// NEGATIVE CASE 3: encodeURIComponent barrier
// Should NOT be flagged because input is encoded
// ============================================================
function negativeEncoded() {
  var userInput = document.location.search;
  var encoded = encodeURIComponent(userInput); // barrier: encoding
  var container = document.getElementById("encoded-output");
  container.innerHTML = encoded; // safe: encoded input
}
