const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "..", "wasm", "sql-wasm.wasm");
const destPath = path.join(__dirname, "..", "dist-bundle", "sql-wasm.wasm");

fs.copyFileSync(srcPath, destPath);
console.log(`Staged sql-wasm.wasm for embedding: ${destPath}`);
