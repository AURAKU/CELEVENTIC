"use client";

import { BlockView } from "@/components/invitation-blocks/block-views";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import type { InvitationBlockDto, BlockRenderContext } from "@/lib/invitation-blocks/block-types";

interface BlockRendererProps {
  blocks: InvitationBlockDto[];
  context: BlockRenderContext;
  previewOnly?: boolean;
}

export function BlockRenderer({ blocks, context, previewOnly }: BlockRendererProps) {
  const visible = previewOnly
    ? blocks
    : blocks.filter((b) => b.isVisible);

  if (!visible.length) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      {visible.map((block) => (
        // Isolate each block — a malformed asset or media state in one block (e.g. a
        // still-processing/failed video) must never take down the rest of the invitation.
        <ClientErrorBoundary key={block.id} fallback={null}>
          <BlockView block={block} ctx={context} />
        </ClientErrorBoundary>
      ))}
    </div>
  );
}
