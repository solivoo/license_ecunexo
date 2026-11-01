using FluentValidation;

namespace EcuNexo.Platform.Business.Training.Commands.ScheduleTraining;

public sealed class ScheduleTrainingValidator : AbstractValidator<ScheduleTrainingCommand>
{
    public ScheduleTrainingValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty().MaximumLength(64);
        RuleFor(x => x.LicenseGrantId).NotEmpty();
        RuleFor(x => x.Topic).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Kind).IsInEnum();
        RuleFor(x => x.Modality).IsInEnum();
        RuleFor(x => x.DurationHours).InclusiveBetween(1, 40);
        RuleFor(x => x.ScheduledAt).GreaterThan(DateTimeOffset.UtcNow);
        RuleFor(x => x.CreatedByOperatorId).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Notes).MaximumLength(2000);
        RuleForEach(x => x.AttendeeEmails)
            .EmailAddress().WithMessage("Uno o más correos no tienen formato válido.")
            .When(x => x.AttendeeEmails is not null && x.AttendeeEmails.Count > 0);
    }
}
