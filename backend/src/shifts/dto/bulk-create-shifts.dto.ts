export class BulkShiftItem {
  date: string;
  shiftTypeId: number;
  count: number;
}

export class BulkCreateShiftsDto {
  scheduleGroupId: string;
  locationId: number;
  items: BulkShiftItem[];
}
