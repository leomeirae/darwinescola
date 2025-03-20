export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Test Page Working</h1>
        <p className="mb-4">This is a simple test page to verify routing.</p>
        <a 
          href="/"
          className="text-blue-500 hover:underline"
        >
          Go back home
        </a>
      </div>
    </div>
  );
} 