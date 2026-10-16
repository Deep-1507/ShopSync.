
"use client";

import { usePathname } from "next/navigation";
import EnterpriseShell from "../../components/enterprise/EnterpriseShell";

export default function EnterpriseLayout({ children }) {
  const pathname = usePathname();

  if (pathname === "/enterprise/auth") {
    return children;
  }

  return <EnterpriseShell>{children}</EnterpriseShell>;
}
