export async function GET() {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/icons/icon-192.png"/>
      <TileColor>#166534</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
