const fs = require("fs");
const path = require("path");
const PELibrary = require("pe-library");
const ResEdit = require("resedit");

const exePath = path.join(__dirname, "..", "dist-exe", "DiscordCloner.exe");
const iconPath = path.join(__dirname, "..", "discordcloner.ico");
const pkgVersion = require("../package.json").version;

if (!fs.existsSync(exePath)) {
  console.error(`Not found: ${exePath}`);
  process.exit(1);
}
if (!fs.existsSync(iconPath)) {
  console.error(`Not found: ${iconPath}`);
  process.exit(1);
}

const exeData = fs.readFileSync(exePath);
const exe = PELibrary.NtExecutable.from(exeData);
const res = PELibrary.NtExecutableResource.from(exe);

const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(iconPath));

ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
  res.entries,
  1,
  1033,
  iconFile.icons.map((item) => item.data)
);

const versionStringTable = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0]
  ? ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0]
  : ResEdit.Resource.VersionInfo.createEmpty();

versionStringTable.setStringValues(
  { lang: 1033, codepage: 1200 },
  {
    FileDescription: "DiscordCloner",
    ProductName: "DiscordCloner",
    OriginalFilename: "DiscordCloner.exe",
    InternalName: "DiscordCloner",
    CompanyName: "ownersystem",
    LegalCopyright: "ownersystem",
  }
);
versionStringTable.setFileVersion(...pkgVersion.split(".").map(Number).concat([0, 0, 0, 0]).slice(0, 4));
versionStringTable.setProductVersion(...pkgVersion.split(".").map(Number).concat([0, 0, 0, 0]).slice(0, 4));
versionStringTable.outputToResourceEntries(res.entries);

res.outputResource(exe);
const newBinary = exe.generate();
fs.writeFileSync(exePath, Buffer.from(newBinary));

console.log(`Icon and version info embedded into ${exePath}`);
