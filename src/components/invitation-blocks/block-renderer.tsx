"use client";

import { BlockView } from "@/components/invitation-blocks/block-views";
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
        <BlockView key={block.id} block={block} ctx={context} />
      ))}
    </div>
  );
}
