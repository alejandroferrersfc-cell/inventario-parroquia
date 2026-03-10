import { Church } from "lucide-react";

export default function Spinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_#fff7f7,_#f5e6e0_55%,_#e7d3c9)]">

      <div className="relative flex items-center justify-center">

        {/* círculo exterior */}
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-red-200 border-t-red-700"></div>

        {/* círculo interior */}
        <div className="absolute h-14 w-14 rounded-full bg-white shadow-md flex items-center justify-center animate-pulse">

          <Church className="h-7 w-7 text-red-700" />

        </div>

      </div>

      <p className="mt-6 text-lg font-semibold text-slate-700">
        Cargando inventario...
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Preparando datos de la parroquia
      </p>

    </div>
  );
}