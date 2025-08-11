import { NavLink } from "react-router-dom";
import { LayoutDashboard, Fish, Pill, Wallet, Settings as Gear } from "lucide-react";
import { useAuth } from "@/state/AuthContext";
const itemBase = "flex flex-col items-center justify-center gap-1 text-xs";
const itemActive = "text-primary";
const itemInactive = "text-muted-foreground";

const TabBar = () => {
  useAuth();
  const items = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/feeding", label: "Feeding", icon: Fish },
    { to: "/materials", label: "Materials", icon: Pill },
    { to: "/expenses", label: "Expenses", icon: Wallet },
    { to: "/settings", label: "Settings", icon: Gear },
  ];
  const gridCols = "grid-cols-5";
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
      <ul className={`grid ${gridCols} max-w-screen-md mx-auto py-2`}>
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="">
            <NavLink to={to} end className={({ isActive }) => `${itemBase} ${isActive ? itemActive : itemInactive}`}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TabBar;
