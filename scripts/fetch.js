import fs from "fs/promises";
import fetch from "node-fetch";

const API_KEY = process.env.YT_API_KEY;
if (!API_KEY) {
  console.error("Missing YT_API_KEY env var");
  process.exit(1);
}

const cfgRaw = await fs.readFile("channels.json", "utf8");
const cfg = JSON.parse(cfgRaw);
const maxResults = cfg.maxResults || 5;

const items = [];

for (const channelId of cfg.channels) {
  const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=${maxResults}&type=video`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed fetch for ${channelId}: ${res.status} ${res.statusText}`);
    continue;
  }
  const data = await res.json();
  if (!data.items) continue;

  for (const it of data.items) {
    const snippet = it.snippet || {};
    items.push({
      channelId,
      channelTitle: snippet.channelTitle || "",
      videoId: it.id?.videoId || "",
      title: snippet.title || "",
      description: snippet.description || "",
      publishedAt: snippet.publishedAt || "",
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || ""
    });
  }
}

items.sort((a,b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

let xml = `<?xml version="1.0" encoding="utf-8"?>\n<videos>\n`;
for (const it of items) {
  xml += `  <video>\n`;
  xml += `    <channelId>${escapeXml(it.channelId)}</channelId>\n`;
  xml += `    <channelTitle>${escapeXml(it.channelTitle)}</channelTitle>\n`;
  xml += `    <videoId>${escapeXml(it.videoId)}</videoId>\n`;
  xml += `    <title>${escapeXml(it.title)}</title>\n`;
  xml += `    <description>${escapeXml(it.description)}</description>\n`;
  xml += `    <publishedAt>${escapeXml(it.publishedAt)}</publishedAt>\n`;
  xml += `    <thumbnail>${escapeXml(it.thumbnail)}</thumbnail>\n`;
  xml += `  </video>\n`;
}
xml += `</videos>\n`;

await fs.writeFile("videos.xml", xml, "utf8");
console.log("videos.xml written with", items.length, "items");

function escapeXml(str) {
  if (!str) return "";
  return str.replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\"", "&quot;")
            .replaceAll("'", "&apos;");
}
