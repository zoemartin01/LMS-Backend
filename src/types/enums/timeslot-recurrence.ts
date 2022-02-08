/**
 * An enum representing the recurrence of an appointment series.
 *
 * @typedef {daily | weekly | monthly | yearly} TimeslotRecurrence
 * @kind enum
 * @enumerators {daily} The appointment happens daily.
 * @enumerators {weekly} The appointment happens weekly.
 * @enumerators {monthly} The appointment happens monthly.
 * @enumerators {yearly} The appointment happens yearly.
 */
export enum TimeSlotRecurrence {
  single = 1,
  daily = 2,
  weekly = 3,
  monthly = 4,
  yearly = 5,
}
