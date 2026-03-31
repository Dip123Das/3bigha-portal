export default function TestDynamic({ params }: { params: { id: string } }) {
  return (
    <main style={{ padding: 24 }}>
      <h1>Dynamic route working ✅</h1>
      <pre>{JSON.stringify(params, null, 2)}</pre>
    </main>
  );
}
