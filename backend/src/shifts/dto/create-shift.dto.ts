export class CreateShiftDto {
  date: string; // Datum, pro které směny generujeme (např. "2026-02-10")
  shiftTypeId: number; // ID šablony (Ranní/Odpolední...)
  locationId: number; // ID pobočky/místa
  count: number; // Kolik "krabiček" (slotů) chceme vytvořit
}
