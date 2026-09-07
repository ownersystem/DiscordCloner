const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const destDir = path.join(__dirname, "..", "wasm");
const destPath = path.join(destDir, "sql-wasm.wasm");

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(srcPath, destPath);
console.log(`Copied sql-wasm.wasm to ${destPath}`);
