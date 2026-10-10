import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0f14] text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400 mb-4">
          404
        </h1>
        <h2 className="text-2xl font-bold mb-2">Page Not Found / पृष्ठ सापडले नाही</h2>
        <p className="text-gray-400 mb-8 text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all hover:scale-105"
        >
          Return Home / मुख्य पृष्ठावर जा
        </Link>
      </div>
    </div>
  );
}
