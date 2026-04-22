import { Route, Routes } from "react-router-dom";

import { QueueDashboard } from "../features/queue/QueueDashboard";
import { SalesDashboard } from "../features/sales/SalesDashboard";

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<QueueDashboard />} />
      <Route path="/sales" element={<SalesDashboard />} />
    </Routes>
  );
}
