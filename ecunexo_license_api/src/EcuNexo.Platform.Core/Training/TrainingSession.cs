namespace EcuNexo.Platform.Core.Training;

/// <summary>
/// Sesión de capacitación agendada para un cliente (licenciatario).
/// Gestionada por operadores desde la platform. Cada sesión consume créditos
/// del entitlement de capacitación del license grant asociado.
/// </summary>
public sealed class TrainingSession
{
    public const int TopicMaxLength = 200;
    public const int NotesMaxLength = 2000;

    private TrainingSession()
    {
        Topic = string.Empty;
    }

    public Guid Id { get; private set; }

    /// <summary>Cliente que recibe la capacitación.</summary>
    public string CustomerId { get; private set; } = string.Empty;

    /// <summary>Licencia bajo la cual se consume el entitlement de capacitación.</summary>
    public Guid LicenseGrantId { get; private set; }

    /// <summary>Tema de la capacitación (ej. "Onboarding inicial", "Inventario avanzado").</summary>
    public string Topic { get; private set; }

    /// <summary>Tipo: Onboarding, Refresco, Avanzada, Personalizada.</summary>
    public TrainingSessionKind Kind { get; private set; }

    /// <summary>Modalidad: Presencial, Virtual.</summary>
    public TrainingModality Modality { get; private set; }

    /// <summary>Duración estimada en horas.</summary>
    public int DurationHours { get; private set; }

    /// <summary>Estado actual de la sesión.</summary>
    public TrainingSessionStatus Status { get; private set; }

    /// <summary>Fecha y hora programada (en UTC).</summary>
    public DateTimeOffset ScheduledAt { get; private set; }

    /// <summary>Fecha en que se completó la capacitación.</summary>
    public DateTimeOffset? CompletedAt { get; private set; }

    /// <summary>Notas internas del operador.</summary>
    public string? Notes { get; private set; }

    /// <summary>Correos de los asistentes (uno o varios).</summary>
    public List<string> AttendeeEmails { get; private set; } = [];

    /// <summary>Operador que creó la sesión.</summary>
    public string CreatedByOperatorId { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? UpdatedAt { get; private set; }

    public static TrainingSession Schedule(
        Guid id,
        string customerId,
        Guid licenseGrantId,
        string topic,
        TrainingSessionKind kind,
        TrainingModality modality,
        int durationHours,
        DateTimeOffset scheduledAt,
        string createdByOperatorId,
        IReadOnlyList<string>? attendeeEmails = null,
        string? notes = null)
    {
        var utcNow = DateTimeOffset.UtcNow;

        return new TrainingSession
        {
            Id = id,
            CustomerId = customerId,
            LicenseGrantId = licenseGrantId,
            Topic = topic.Trim(),
            Kind = kind,
            Modality = modality,
            DurationHours = durationHours,
            Status = TrainingSessionStatus.Scheduled,
            ScheduledAt = scheduledAt,
            CreatedByOperatorId = createdByOperatorId,
            AttendeeEmails = attendeeEmails is not null && attendeeEmails.Count > 0
                ? attendeeEmails.Select(e => e.Trim().ToLowerInvariant()).Distinct().ToList()
                : [],
            Notes = notes?.Trim(),
            CreatedAt = utcNow,
        };
    }

    public void Complete()
    {
        Status = TrainingSessionStatus.Completed;
        CompletedAt = DateTimeOffset.UtcNow;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Cancel()
    {
        Status = TrainingSessionStatus.Cancelled;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Reschedule(DateTimeOffset newScheduledAt)
    {
        ScheduledAt = newScheduledAt;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
