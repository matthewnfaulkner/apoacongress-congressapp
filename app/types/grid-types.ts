import type { TabsItem } from "@nuxt/ui";
export enum GridItemTypes {
  Session,
  Break,
  Header,
  Empty,
}

export interface scheduleGridItem {
  x: string | number;
  y: string | number;
  h: string | number;
  w: string | number;
  i: string | number;
  static: boolean;
  type: GridItemTypes;
  label: string | null;
  isResizable?: boolean;
  isDraggable?: boolean;
  color?: string | null;
}

export interface scheduleTabItem extends TabsItem {
  timeSlots?: CongressDaySlot[];
  emptyTimeSlots?: CongressDaySlot[];
  startTime?: string | null;
  endTime?: string | null;
  timeSubDivision?: string | number | null;
  numCols?: number;
  colHeaders?: scheduleGridItem[];
  timeScale?: number,
  sessions?: sessionGridItem[],
  published: boolean,
  breaks?: scheduleGridItem[]
}

export interface sessionGridItem extends scheduleGridItem {
  events: CongressEvent[];
  session?: CongressSession;
}
