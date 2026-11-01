using System.Globalization;
using System.Text;
using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Training.Queries.GenerateCalendarInvite;

public sealed record GenerateCalendarInviteQuery(Guid TrainingSessionId) : IQuery<CalendarInviteResponse>;

public sealed record CalendarInviteResponse(
    string IcsContent,
    string FileName,
    string Topic,
    DateTimeOffset ScheduledAt,
    int DurationHours);

public sealed class GenerateCalendarInviteHandler : IQueryHandler<GenerateCalendarInviteQuery, CalendarInviteResponse>
{
    private readonly ITrainingSessionRepository _sessions;

    public GenerateCalendarInviteHandler(ITrainingSessionRepository sessions)
    {
        _sessions = sessions;
    }

    public async Task<Result<CalendarInviteResponse>> Handle(GenerateCalendarInviteQuery query, CancellationToken ct)
    {
        var session = await _sessions.GetByIdAsync(query.TrainingSessionId, ct).ConfigureAwait(false);

        if (session is null)
            return Result.Failure<CalendarInviteResponse>(
                new Error("training.not_found", "Sesión no encontrada.", ErrorType.NotFound));

        var endAt = session.ScheduledAt.AddHours(session.DurationHours);
        var nowStamp = DateTimeOffset.UtcNow.ToString("yyyyMMddTHHmmssZ", CultureInfo.InvariantCulture);
        var startStamp = session.ScheduledAt.UtcDateTime.ToString("yyyyMMddTHHmmssZ", CultureInfo.InvariantCulture);
        var endStamp = endAt.UtcDateTime.ToString("yyyyMMddTHHmmssZ", CultureInfo.InvariantCulture);

        var location = session.Modality == EcuNexo.Platform.Core.Training.TrainingModality.Virtual
            ? "Enlace proporcionado por el instructor"
            : "Instalaciones del cliente";

        var sb = new StringBuilder();
        foreach (var email in session.AttendeeEmails)
        {
            sb.Append("ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=");
            sb.Append(email);
            sb.Append(":mailto:");
            sb.AppendLine(email);
        }
        var attendeeLines = sb.ToString();

        var ics = $""""
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EcuNexo//Capacitacion//ES
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:{startStamp}
DTEND:{endStamp}
DTSTAMP:{nowStamp}
UID:{session.Id}@ecunexo.capacitacion
SUMMARY:Capacitación EcuNexo — {EscapeIcs(session.Topic)}
DESCRIPTION:Tipo: {session.Kind}\nModalidad: {session.Modality}\nDuración: {session.DurationHours}h\n\nNotas: {EscapeIcs(session.Notes ?? "—")}
LOCATION:{EscapeIcs(location)}
ORGANIZER;CN=EcuNexo:mailto:capacitacion@ecunexo.com
{attendeeLines}STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
"""";

        var fileName = $"capacitacion-ecunexo-{session.ScheduledAt:yyyyMMdd}.ics";

        return Result.Success(new CalendarInviteResponse(
            ics, fileName, session.Topic, session.ScheduledAt, session.DurationHours));
    }

    private static string EscapeIcs(string text)
    {
        return text.Replace("\\", "\\\\").Replace(";", "\\;").Replace(",", "\\,").Replace("\n", "\\n");
    }
}
