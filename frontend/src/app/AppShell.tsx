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
          <img className="header-logo" src="/assets/BPHLY_BIG.D.svg" alt="BPI logo" />
          <div className="header-title">
            <h1>Credit Trace Platform</h1>
            <p className="muted-text">Workflow Dashboard</p>
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
          <span className="user-name">Suman Paul</span>
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
