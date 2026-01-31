import { DateTime } from "luxon";
import { Time } from '@internationalized/date';

export function addMinutesToTime(time: string, minutesToAdd: number): string {
  // Split "HH:MM" into hours and minutes

  if(!time) {
    time = "00:00"
  }
  const [hh, mm] = time.split(':').map(Number)

  // Convert total time to minutes
  const totalMinutes = hh * 60 + mm + minutesToAdd

  // Compute new hours and minutes
  const newHours = Math.floor(totalMinutes / 60)
  const newMinutes = totalMinutes % 60

  // Format with leading zeros
  const hhStr = String(newHours).padStart(2, '0')
  const mmStr = String(newMinutes).padStart(2, '0')

  return `${hhStr}:${mmStr}`
} 

export function removeSeconds(time: string | null| undefined) {
	if(time == null || time == undefined){
		return '';
	}
	return time.slice(0, 5);
}

export function minutesBetween(start: string | null | undefined, end: string): number {
  if(!start){
    start = '00:00'
  }
  if(!end){
    end = '00:00'
  }
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)

  return (eh * 60 + em) - (sh * 60 + sm)
}

export function toMinutes(time: string | null | undefined) : number {
  if(!time){
    time = '00:00'
  }
  const [sh, sm] = time.split(':').map(Number)
  return (sh * 60 + sm);
}

export type HoursAndMinutes = Pick<Time, "hour" | "minute">;

export function toTimeValue(time: string | null | undefined) : HoursAndMinutes {
  if(!time) {
   time =  "00:00"
  }
  const [sh, sm] = time.split(':').map(Number)
  return {hour: sh  || 0, minute: sm || 0};
}

export function toTimeValueFromTotalMinutes(time: number) : HoursAndMinutes {
  return {
    hour: Math.floor(time/60),
    minute: time % 60
  }
}

export function fromTimeValue(time: HoursAndMinutes) : string {
  return time.hour + ":" + time.minute;
}

export function toStringFromTotalMinutes(time: number) : string {
    return `${Math.floor(time/60)}:${time % 60}`
}

export function dateStringToHumanString(dateStr: string | Date | null | undefined ) : string {

  if(dateStr == null || dateStr == undefined){
		return '';
	}

  // 1️⃣ Parse the string
  const dt = DateTime.fromFormat(dateStr, "yyyy-MM-dd");

  // 2️⃣ Format as "5th April 2027"
  const formatted = dt.toFormat("d'th' LLLL yyyy");

  // ⚠️ Problem: "d'th'" will literally print "th"
  // Luxon doesn’t automatically add ordinal suffixes, so we need a helper:

  function ordinal(day: number) {
    if (day > 3 && day < 21) return `${day}th`;
    switch (day % 10) {
      case 1: return `${day}st`;
      case 2: return `${day}nd`;
      case 3: return `${day}rd`;
      default: return `${day}th`;
    }
  }

  return `${ordinal(dt.day)} ${dt.toFormat("LLLL yyyy")}`;
}