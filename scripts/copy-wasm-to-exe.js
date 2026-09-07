const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "..", "wasm", "sql-wasm.wasm");
const destPath = path.join(__dirname, "..", "dist-exe", "sql-wasm.wasm");

fs.copyFileSync(srcPath, destPath);
console.log(`Copied sql-wasm.wasm next to the executable: ${destPath}`);
