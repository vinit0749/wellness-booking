import { useState } from "react";
import { CalendarDays, LayoutDashboard } from "lucide-react";
import ClientHome from "./pages/ClientHome";
import NutritionistDashboard from "./pages/NutritionistDashboard";

function App() {
  const [view, setView] = useState("client");

  return (
    <div>
      <nav
        aria-label="Choose workspace"
        className="flex items-center justify-center border-b border-[#e9e9e1] bg-[#f4f3ee] px-4 py-2.5"
      >
        <div className="flex w-full max-w-xs items-center gap-1 rounded-full border border-[#e7e8df] bg-white/80 p-1 shadow-[0_2px_8px_rgba(35,55,38,0.035)]">
          <button
            type="button"
            aria-pressed={view === "client"}
            onClick={() => setView("client")}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#456b52] ${
              view === "client"
                ? "bg-[#456b52] text-white shadow-sm"
                : "text-[#657266] hover:bg-[#edf2e9]"
            }`}
          >
            <CalendarDays size={16} />
            Client booking
          </button>

          <button
            type="button"
            aria-pressed={view === "nutritionist"}
            onClick={() => setView("nutritionist")}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#456b52] ${
              view === "nutritionist"
                ? "bg-[#456b52] text-white shadow-sm"
                : "text-[#657266] hover:bg-[#edf2e9]"
            }`}
          >
            <LayoutDashboard size={16} />
            Nutritionist
          </button>
        </div>
      </nav>

      {view === "client" ? <ClientHome /> : <NutritionistDashboard />}
    </div>
  );
}

export default App;
