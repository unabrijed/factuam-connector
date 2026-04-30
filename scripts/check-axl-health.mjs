const baseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const url = `${baseUrl.replace(/\/$/, "")}/api/internal/axl/workers`;

const response = await fetch(url);
if (!response.ok) {
  console.error(`[check:axl] request failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const payload = await response.json();
console.log(JSON.stringify(payload, null, 2));
process.exit(payload.ok ? 0 : 1);
