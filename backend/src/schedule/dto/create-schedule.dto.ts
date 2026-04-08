export class CreateScheduleGroupDto {
  name: string;
  dateFrom: string;
  dateTo: string;
  locationId: number;
  year: number;
  month: number;
  calendarDays: string[];
}
