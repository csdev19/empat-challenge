import { Link } from "@tanstack/react-router";

import { useSession } from "@/hooks/use-session";
import UserMenu from "./user-menu";

export default function Header() {
  const { session } = useSession();
  const isAuthenticated = !!session;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <nav className="flex items-center gap-4 text-lg">
          <Link to="/" className="font-semibold">
            Hiring Tool
          </Link>
          {isAuthenticated && (
            <Link
              to="/hiring-processes"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
