import { NavLink } from "react-router-dom";
import { LayoutDashboard, Fish, Pill, Wallet, Settings as Gear } from "lucide-react";

const itemBase = "flex flex-col items-center justify-center gap-1 text-xs";
const itemActive = "text-primary";
const itemInactive = "text-muted-foreground";

const TabBar = () => {
  const items = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/feeding", label: "Feeding", icon: Fish },
    { to: "/materials", label: "Materials", icon: Pill },
    { to: "/expenses", label: "Expenses", icon: Wallet },
    { to: "/settings", label: "Settings", icon: Gear },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
      <ul className="grid grid-cols-5 max-w-screen-md mx-auto py-2">
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
