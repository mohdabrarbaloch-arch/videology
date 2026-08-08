import fs from "fs";
import path from "path";
import https from "https";

const binDir = path.join(process.cwd(), "bin");
const ytDlpPath = path.join(binDir, "yt-dlp");
const ytDlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`HTTP ${status}`));
          return;
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const ws = fs.createWriteStream(dest);
        res.pipe(ws);
        ws.on("finish", () => {
          ws.close();
          if (process.platform !== "win32") {
            fs.chmodSync(dest, 0o755);
          }
          resolve();
        });
        ws.on("error", reject);
      })
      .on("error", reject);
  });
}

async function main() {
  if (fs.existsSync(ytDlpPath) && fs.statSync(ytDlpPath).size > 1_000_000) {
    console.log("yt-dlp already present, skipping download.");
    return;
  }
  console.log("Downloading yt-dlp...");
  await download(ytDlpUrl, ytDlpPath);
  console.log("yt-dlp ready at bin/yt-dlp.");
}

main().catch((err) => {
  console.error("fetch-tools failed:", err.message);
  process.exit(1);
});
