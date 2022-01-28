/**
 * An enum representing the type of a timeslot.
 *
 * @typedef {booked | available | unavailable} TimeslotType
 * @kind enum
 * @enumerators {booked} The timeslot is an appointment timeslot
 * @enumerators {available} The timeslot is an available timeslot
 * @enumerators {unavailable} The timeslot is an unavailable timeslot
 */
export enum TimeSlotType {
  booked = 1,
  available = 2,
  unavailable = 3,
}
