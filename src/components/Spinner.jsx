import { Church } from "lucide-react";
export default function Spinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_#fff7f7,_#f5e6e0_55%,_#e7d3c9)]">
      
      <div className="relative flex items-center justify-center">

        <div className="h-16 w-16 animate-spin rounded-full border-4 border-red-200 border-t-red-700"></div>

        <Church className="absolute h-6 w-6 text-red-700" />

      </div>

      <p className="mt-6 text-lg font-semibold text-slate-700">
        Cargando inventario...
      </p>

    </div>
  );
}