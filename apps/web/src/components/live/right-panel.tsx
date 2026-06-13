"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RaceControlFeed } from "./race-control-feed";
import { TeamRadioFeed } from "./team-radio-feed";
import { useRaceControlStore, useTeamRadioStore } from "@pitwall/stores";

export function RightPanel() {
  const rcmCount = useRaceControlStore((s) => s.messages.length);
  const radioCount = useTeamRadioStore((s) => s.messages.length);

  return (
    <Tabs defaultValue="race-control" className="h-full flex flex-col">
      <TabsList className="bg-bg-surface border-b border-border-default rounded-none h-8 shrink-0 flex w-full">
        <TabsTrigger value="race-control" className="flex-1 text-[10px] data-[state=active]:bg-bg-elevated rounded-none h-full">
          RACE CTRL ({rcmCount})
        </TabsTrigger>
        <TabsTrigger value="team-radio" className="flex-1 text-[10px] data-[state=active]:bg-bg-elevated rounded-none h-full border-l border-border-default">
          RADIO ({radioCount})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="race-control" className="flex-1 overflow-hidden m-0">
        <RaceControlFeed />
      </TabsContent>
      <TabsContent value="team-radio" className="flex-1 overflow-hidden m-0">
        <TeamRadioFeed />
      </TabsContent>
    </Tabs>
  );
}
