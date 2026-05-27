export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-green-700">
          3bigha Offline
        </h1>

        <p className="mt-4 text-gray-600">
          Internet connection unavailable. Please reconnect and try again.
        </p>
      </div>
    </main>
  );
}
