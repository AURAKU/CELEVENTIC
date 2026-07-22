"use client";

import { createContext, useContext } from "react";

/**
 * When true, invitation chrome must not render nested <a>/<Link> elements.
 * Catalogue cards and landing tiles often wrap the preview in a parent link;
 * nested anchors cause React hydration failures.
 */
const InvitationStaticPreviewContext = createContext(false);

export function InvitationStaticPreviewProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  return (
    <InvitationStaticPreviewContext.Provider value={enabled}>
      {children}
    </InvitationStaticPreviewContext.Provider>
  );
}

export function useInvitationStaticPreview() {
  return useContext(InvitationStaticPreviewContext);
}
