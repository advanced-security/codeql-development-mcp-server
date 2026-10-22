// npm-check-updates config used by `npm run upgrade:node`.
//
// `--peer` cannot read peer dependency metadata for most packages, so it does
// not stop upgrades that break peer ranges. Pin packages whose next major is
// rejected by a dependent's peer range here, and remove the pin once the
// dependent supports it.
const holdMajor = new Set([
  // typescript-eslint 8.x declares peer typescript ">=4.8.4 <6.1.0".
  'typescript',
]);

module.exports = {
  target: (name) => (holdMajor.has(name) ? 'minor' : 'latest'),
};
