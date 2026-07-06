"use client";

import { createContext, useContext } from "react";

const InvitationMediaContext = createContext({ interactive: false });

export function InvitationMediaProvider({
  interactive = false,
  children,
}: {
  interactive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <InvitationMediaContext.Provider value={{ interactive }}>
      {children}
    </InvitationMediaContext.Provider>
  );
}

export function useInvitationMediaInteractive() {
  return useContext(InvitationMediaContext).interactive;
}
