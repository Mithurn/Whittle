"use client";

import { Fragment } from "react";
import { CampfireNode } from "./CampfireNode";
import { PathConnector } from "./PathConnector";
import { getRoadmapZones } from "@/store/plan-store";
import { getRoadmapNodePosition } from "@/lib/use-roadmap-node-position";
import type { RoadmapNode } from "@/store/plan-store";
import type { HobbyPlan } from "@/types/domain";

interface RoadmapPathProps {
  plan: HobbyPlan;
  isMobile: boolean;
  onNodeClick: (techniqueId: string) => void;
}

interface FlatEntry {
  node: RoadmapNode;
  zoneName: string | null;
  zoneProgress: { completed: number; total: number } | null;
  /** Position within its own zone, not the whole plan — resets to 0 at
   * every zone start, so every zone's first node centers under its header. */
  positionIndex: number;
}

// The path is one continuous journey from first node to last — zones are a
// visual-only grouping, not a break in the trail. The
// zig-zag position resets per zone (positionIndex, not a running global
// index) so every zone opens centered directly under its header, matching
// the reference layout — the connector between the last node of one zone
// and the first node of the next still renders, spanning whatever offset
// jump that reset creates, so the trail itself never actually breaks. Each
// zone's header floats as an absolute label near its first node instead of
// consuming layout height, so that connector draws straight through
// underneath it, uninterrupted.
export function RoadmapPath({ plan, isMobile, onNodeClick }: RoadmapPathProps) {
  const zones = getRoadmapZones(plan);
  const nodeSize = isMobile ? 48 : 56;
  const halfNode = nodeSize / 2;

  const flatEntries: FlatEntry[] = zones.flatMap((zone) =>
    zone.nodes.map((node, i) => ({
      node,
      zoneName: i === 0 ? zone.name : null,
      zoneProgress: i === 0 ? zone.zoneProgress : null,
      positionIndex: i,
    }))
  );

  return (
    <div className="flex w-full flex-col items-center pt-36 pb-32 md:pt-44">
      {flatEntries.map((entry, index) => {
        const { xOffset } = getRoadmapNodePosition(entry.positionIndex, isMobile);
        const next = flatEntries[index + 1];
        const nextOffset = next ? getRoadmapNodePosition(next.positionIndex, isMobile).xOffset : null;

        return (
          <Fragment key={entry.node.technique.id}>
            {/* Zone header: a Wondering-style section card, centered on the
                path's x=0 axis (not the zigzagging node's own offset) — a
                zero-height flow marker so it never displaces layout, with
                the card itself absolutely positioned just above this point.
                z-30 sits above the connector (z-10), so the card reads as a
                clean divider sitting on the trail — the connector keeps
                running underneath it (same continuous SVG, just visually
                covered where the opaque card sits on top), not broken. */}
            {entry.zoneName && entry.zoneProgress && (
              <div className="relative z-30 h-0 w-full">
                <div className="absolute bottom-10 md:bottom-16 left-1/2 w-full max-w-[260px] -translate-x-1/2 rounded-2xl border border-border bg-surface-1 px-6 py-4 text-center">
                  <h2 className="font-heading text-lg md:text-xl font-bold text-text-primary">{entry.zoneName}</h2>
                  <p className="mt-1 font-sans text-xs text-text-muted">
                    {entry.zoneProgress.completed}/{entry.zoneProgress.total} mastered
                  </p>
                </div>
              </div>
            )}

            {/* Node: the primary layout unit — label is absolute so it
                never affects the vertical rhythm the connector math
                depends on. z-20 per the layering scheme. */}
            <div
              className="relative z-20"
              style={{ transform: `translateX(${xOffset}px)`, width: nodeSize, height: nodeSize }}
            >
              <CampfireNode node={entry.node} onClick={onNodeClick} />
              {/* line-clamp-2: caps how much vertical rhythm one long AI
                  title can eat out of the path — the full name is still
                  readable in TechniqueModal once the node is tapped. */}
              <span className="absolute left-1/2 top-full mt-3 line-clamp-2 max-w-[140px] -translate-x-1/2 text-center font-sans text-xs text-text-muted md:max-w-[180px]">
                {entry.node.technique.name}
              </span>
            </div>

            {/* Connector: negative top/bottom margins (half a node) tuck it
                behind the node centers above and below; z-10 keeps it
                behind the z-20 nodes — background < connector < node. Spans
                zone boundaries too, keeping the trail unbroken. */}
            {next && nextOffset !== null && (
              <div
                data-testid="path-connector"
                className="relative z-10"
                style={{ marginTop: -halfNode, marginBottom: -halfNode }}
              >
                <PathConnector
                  fromOffset={xOffset}
                  toOffset={nextOffset}
                  fromState={entry.node.state}
                  toState={next.node.state}
                  isMobile={isMobile}
                  // Zone-boundary connectors need extra room — this one gap
                  // has to fit both the outgoing node's label and the
                  // incoming zone's header card, which a standard node-to-
                  // node gap doesn't have space for (that's what caused the
                  // overlap before).
                  height={next.zoneName ? (isMobile ? 240 : 320) : undefined}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
