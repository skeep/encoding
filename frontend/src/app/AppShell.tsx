import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type AppShellProps = {
  children: ReactNode;
  headerCenter?: ReactNode;
};

export function AppShell(props: AppShellProps): JSX.Element {
  const { children, headerCenter } = props;
  return (
    <div className="dashboard-root">
      <header className="top-nav">
        <div className="top-nav-left">
          <div className="header-app-mark" aria-hidden="true">
            EP
          </div>
          <div className="header-title">
            <h1>Encoding Platform</h1>
            <p className="muted-text">Sales and encoding command center</p>
          </div>
        </div>
        <div className="top-nav-center app-nav-and-search">
          <nav className="app-nav" aria-label="Main">
            <NavLink
              to="/"
              className={({ isActive }) => `app-nav-link ${isActive ? "active" : ""}`}
              end
            >
              Workflow
            </NavLink>
            <NavLink
              to="/sales"
              className={({ isActive }) => `app-nav-link ${isActive ? "active" : ""}`}
            >
              Sales
            </NavLink>
          </nav>
          {headerCenter}
        </div>
        <div className="top-nav-right">
          <span className="user-name">Encoding User 1</span>
          <button type="button">Logout</button>
        </div>
      </header>
      {children}
      <footer className="app-footer">
        <span className="footer-version">Release v0.1.0</span>
      </footer>
    </div>
  );
}
