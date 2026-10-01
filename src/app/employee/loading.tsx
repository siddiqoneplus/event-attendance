import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center animate-pulse">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
      <p className="text-slate-500 font-medium">Loading data...</p>
    </div>
  );
}
