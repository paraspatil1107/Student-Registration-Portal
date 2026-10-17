// Escapes user input so it can be used as a literal inside a RegExp.
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { escapeRegex };
