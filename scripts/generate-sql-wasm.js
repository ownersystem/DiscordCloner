const fs = require("fs");
const path = require("path");

const wasmPath = path.join(__dirname, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const outPath = path.join(__dirname, "..", "src", "core", "sqlWasm.generated.ts");

const wasmBuffer = fs.readFileSync(wasmPath);
const base64 = wasmBuffer.toString("base64");

const content = `export const SQL_WASM_BASE64 = "${base64}";\n`;

fs.writeFileSync(outPath, content, "utf8");
console.log(`Generated ${outPath} (${(base64.length / 1024).toFixed(0)} KB base64, ${(wasmBuffer.length / 1024).toFixed(0)} KB raw)`);
