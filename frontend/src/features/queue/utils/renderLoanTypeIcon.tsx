import { Bike, Car, Home } from "lucide-react";

import type { LoanType } from "../../../api/types";

/** Full display name for native tooltip (hover) and screen readers */
const FULL_LOAN_TYPE_NAME: Record<LoanType, string> = {
  Auto: "Automobile loan",
  "2W": "Two-wheeler loan",
  Home: "Home loan"
};

export function renderLoanTypeIcon(loanType: LoanType): JSX.Element {
  const fullName = FULL_LOAN_TYPE_NAME[loanType];
  const Icon = loanType === "Auto" ? Car : loanType === "2W" ? Bike : Home;

  return (
    <span className="loan-type-icon-cell" title={fullName}>
      <Icon className="loan-type-icon" size={18} strokeWidth={2} aria-hidden />
      <span className="sr-only">{fullName}</span>
    </span>
  );
}
