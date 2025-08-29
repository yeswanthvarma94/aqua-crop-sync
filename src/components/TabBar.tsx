import { NavLink, useLocation } from "react-router-dom";
import { Home, Fish, Pill, Wallet, Settings as Gear } from "lucide-react";
import { useAuth } from "@/state/AuthContext";
import { useTranslation } from "react-i18next";
const itemBase = "flex flex-col items-center justify-center gap-1 text-xs";
const itemActive = "text-primary";
const itemInactive = "text-muted-foreground";

const TabBar = () => {
  useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  
  // Hide TabBar on auth pages
  if (location.pathname === "/auth" || location.pathname === "/signup" || location.pathname === "/test-auth") {
    return null;
  }
  
  const items = [
    { to: "/", label: t("nav.home"), icon: Home },
    { to: "/feeding", label: t("nav.feeding"), icon: Fish },
    { to: "/materials", label: t("nav.materials"), icon: Pill },
    { to: "/expenses", label: t("nav.expenses"), icon: Wallet },
    { to: "/settings", label: t("nav.settings"), icon: Gear },
  ];
  const gridCols = "grid-cols-5";
  return (
    <nav className="fixed bottom-0 inset-x-0 glass-header border-t">
      <ul className={`grid ${gridCols} max-w-screen-md mx-auto py-3`}>
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink 
              to={to} 
              end 
              className={({ isActive }) => 
                `${itemBase} ${isActive ? itemActive : itemInactive} transition-all duration-200 hover:scale-105 px-2 py-1 rounded-lg ${isActive ? 'bg-primary/10' : 'hover:bg-secondary/50'}`
              }
            >
              <Icon size={20} />
              <span className="font-medium">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TabBar;
