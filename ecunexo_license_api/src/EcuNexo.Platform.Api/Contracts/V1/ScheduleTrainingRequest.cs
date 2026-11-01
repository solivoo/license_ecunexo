namespace EcuNexo.Platform.Api.Contracts.V1;

public sealed record ScheduleTrainingRequest(
    string CustomerId,
    Guid LicenseGrantId,
    string Topic,
    string Kind,
    string Modality,
    int DurationHours,
    DateTimeOffset ScheduledAt,
    List<string>? AttendeeEmails = null,
    string? Notes = null);
