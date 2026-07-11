import { Interview } from "../../types/career";

export async function requestCalendarAccess() {
  const Calendar = await import("expo-calendar");
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

export async function addInterviewToCalendar(interview: Interview) {
  const Calendar = await import("expo-calendar");
  const hasAccess = await requestCalendarAccess();

  if (!hasAccess) {
    throw new Error("Calendar access was not granted.");
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writableCalendar = calendars.find((calendar) => calendar.allowsModifications) ?? calendars[0];

  if (!writableCalendar) {
    throw new Error("No writable calendar is available.");
  }

  const startDate = new Date(interview.startsAt);
  const endDate = new Date(startDate.getTime() + interview.durationMinutes * 60 * 1000);

  return Calendar.createEventAsync(writableCalendar.id, {
    title: `${interview.company}: ${interview.title}`,
    startDate,
    endDate,
    notes: interview.prepQuestions.map((question) => `- ${question}`).join("\n"),
    alarms: [{ relativeOffset: -60 }]
  });
}
