using System.Globalization;
using System.Security.Claims;
using Asp.Versioning;
using Asp.Versioning.Builder;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing.Commands.IssueLicense;
using EcuNexo.Platform.Business.Licensing.Commands.CreateCustomer;
using EcuNexo.Platform.Business.Licensing.Commands.DeactivateCustomer;
using EcuNexo.Platform.Business.Licensing.Commands.UpdateCustomer;
using EcuNexo.Platform.Business.Licensing.Commands.CreateOperator;
using EcuNexo.Platform.Business.Licensing.Commands.OperatorLogin;
using EcuNexo.Platform.Business.Licensing.Commands.ReissueLicense;
using EcuNexo.Platform.Business.Licensing.Commands.CreatePlan;
using EcuNexo.Platform.Business.Licensing.Commands.UpdatePlan;
using EcuNexo.Platform.Business.Licensing.Commands.DeactivatePlan;
using EcuNexo.Platform.Business.Licensing.Queries.GetLicenseStatus;
using EcuNexo.Platform.Business.Licensing.Queries.ListLicenses;
using EcuNexo.Platform.Business.Licensing.Queries.GetCustomer;
using EcuNexo.Platform.Business.Licensing.Queries.ListLicensingCustomers;
using EcuNexo.Platform.Business.Licensing.Queries.ListOperators;
using EcuNexo.Platform.Business.Licensing.Queries.ListPlans;
using EcuNexo.Platform.Business.Licensing.Queries.GetPlanDetail;
using EcuNexo.Platform.Business.Training.Commands.ScheduleTraining;
using EcuNexo.Platform.Business.Training.Commands.CompleteTraining;
using EcuNexo.Platform.Business.Training.Commands.CancelTraining;
using EcuNexo.Platform.Business.Training.Queries.ListTrainingSessions;
using EcuNexo.Platform.Business.Training.Queries.GenerateCalendarInvite;
using EcuNexo.Platform.Core.Training;
using EcuNexo.Platform.Data.Licensing;
using EcuNexo.Platform.Api.Contracts.V1;
using EcuNexo.Platform.Api.Email;
using EcuNexo.Platform.Api.Extensions;
using EcuNexo.Platform.Api.Security;
using EcuNexo.Platform.Business.Licensing;
using EcuNexo.Platform.Business.Settings;
using EcuNexo.Platform.Business.Training;
using EcuNexo.Platform.Core.Settings;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcuNexo.Platform.Api.Endpoints.V1;

public static class PlatformLicensingEndpoints
{
    public static WebApplication MapPlatformLicensingEndpointsV1(this WebApplication app)
    {
        ApiVersionSet versionSet = app.NewApiVersionSet()
            .HasApiVersion(new ApiVersion(1, 0))
            .ReportApiVersions()
            .Build();

        RouteGroupBuilder group = app
            .MapGroup("/api/v{version:apiVersion}/platform")
            .WithApiVersionSet(versionSet)
            .WithTags("Platform Licensing");

        group.MapPost("/auth/login", OperatorLoginAsync).AllowAnonymous();
        group.MapGet("/health", HealthAsync).AllowAnonymous();
        group.MapGet("/public-key", GetPublicKeyAsync).AllowAnonymous();
        group.MapGet("/licenses/{grantId:guid}/status", GetLicenseStatusAsync).AllowAnonymous();

        var secured = group.MapGroup("").RequireAuthorization();
        secured.MapPost("/licenses", IssueLicenseAsync);
        secured.MapGet("/licenses", ListLicensesAsync);
        secured.MapPost("/licenses/{grantId:guid}/reissue", ReissueLicenseAsync);
        secured.MapGet("/customers", ListCustomersAsync);
        secured.MapPost("/customers", CreateCustomerAsync);
        secured.MapGet("/customers/{id:guid}", GetCustomerAsync);
        secured.MapPut("/customers/{id:guid}", UpdateCustomerAsync);
        secured.MapDelete("/customers/{id:guid}", DeactivateCustomerAsync);
        secured.MapGet("/plans", ListPlansAsync);
        secured.MapPost("/plans", CreatePlanAsync);
        secured.MapGet("/plans/{code}", GetPlanDetailAsync);
        secured.MapPut("/plans/{code}", UpdatePlanAsync);
        secured.MapDelete("/plans/{code}", DeactivatePlanAsync);
        secured.MapGet("/operators", ListOperatorsAsync);
        secured.MapPost("/operators", CreateOperatorAsync);

        // Training & Support
        secured.MapPost("/training", ScheduleTrainingAsync);
        secured.MapGet("/training", ListTrainingSessionsAsync);
        secured.MapPost("/training/{id:guid}/complete", CompleteTrainingAsync);
        secured.MapPost("/training/{id:guid}/cancel", CancelTrainingAsync);
        secured.MapGet("/training/{id:guid}/calendar", GetTrainingCalendarInviteAsync);
        secured.MapPost("/training/{id:guid}/send-invite", SendTrainingInviteEmailAsync);

        // System Settings & Email
        secured.MapGet("/settings/email", GetEmailSettingsAsync);
        secured.MapPut("/settings/email", UpdateEmailSettingsAsync);
        secured.MapPost("/settings/email/test", TestEmailSettingsAsync);
        secured.MapPost("/licenses/{grantId:guid}/send-email", SendLicenseDeliveryEmailAsync);

        return app;
    }

    private static async Task<IResult> HealthAsync(LicensingDbContext db, CancellationToken ct)
    {
        try
        {
            await db.Database.CanConnectAsync(ct).ConfigureAwait(false);
            return Results.Ok(new { service = "EcuNexo.Platform", database = "licensing_ecunexo", status = "ok" });
        }
        catch (Exception ex)
        {
            return Results.Problem(detail: ex.Message, statusCode: 503, title: "BD licensing no disponible");
        }
    }

    private static IResult GetPublicKeyAsync(
        ILicenseArtifactIssuer issuer,
        [FromQuery] string? format)
    {
        var result = issuer.GetPublicKeyPem();
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        if (string.Equals(format, "pem", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(format, "raw", StringComparison.OrdinalIgnoreCase))
        {
            return Results.Text(result.Value!, "text/plain; charset=utf-8");
        }

        return Results.Ok(new { publicKeyPem = result.Value });
    }

    private static async Task<IResult> OperatorLoginAsync(
        PlatformOperatorLoginRequest body,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender
            .SendAsync<PlatformOperatorLoginCommand, PlatformOperatorLoginResponse>(body.ToCommand(), ct)
            .ConfigureAwait(false);
        return result.ToHttpResult();
    }

    private static async Task<IResult> IssueLicenseAsync(
        IssueLicenseRequest body,
        ClaimsPrincipal user,
        ISender sender,
        CancellationToken ct)
    {
        var operatorId = ResolveOperatorId(user);
        if (operatorId is null)
        {
            return Results.Unauthorized();
        }

        var result = await sender
            .SendAsync<IssueLicenseCommand, IssueLicenseResponse>(body.ToCommand(operatorId.Value), ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        return Results.Created($"/api/v1/platform/licenses/{result.Value!.LicenseId}", result.Value);
    }

    private static async Task<IResult> ListLicensesAsync(ISender sender, CancellationToken ct)
    {
        var result = await sender.AskAsync<ListLicensesQuery, ListLicensesResponse>(new ListLicensesQuery(), ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        return Results.Ok(result.Value!.Items);
    }

    private static async Task<IResult> ReissueLicenseAsync(
        Guid grantId,
        ReissueLicenseRequest body,
        ClaimsPrincipal user,
        ISender sender,
        CancellationToken ct)
    {
        var operatorId = ResolveOperatorId(user);
        if (operatorId is null)
        {
            return Results.Unauthorized();
        }

        var result = await sender
            .SendAsync<ReissueLicenseCommand, ReissueLicenseResponse>(
                body.ToCommand(grantId, operatorId.Value),
                ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        return Results.Created($"/api/v1/platform/licenses/{result.Value!.LicenseId}", result.Value);
    }

    private static async Task<IResult> GetLicenseStatusAsync(
        Guid grantId,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender
            .AskAsync<GetLicenseStatusQuery, LicenseStatusResponse>(new GetLicenseStatusQuery(grantId), ct)
            .ConfigureAwait(false);
        return result.ToHttpResult();
    }

    private static async Task<IResult> ListCustomersAsync(ISender sender, CancellationToken ct)
    {
        var result = await sender
            .AskAsync<ListLicensingCustomersQuery, ListLicensingCustomersResponse>(
                new ListLicensingCustomersQuery(),
                ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        return Results.Ok(result.Value!.Items);
    }

    private static async Task<IResult> CreateCustomerAsync(
        CreateCustomerRequest body,
        ClaimsPrincipal user,
        ISender sender,
        CancellationToken ct)
    {
        var operatorId = ResolveOperatorId(user);
        if (operatorId is null)
        {
            return Results.Unauthorized();
        }

        var result = await sender
            .SendAsync<CreateCustomerCommand, CreateCustomerResponse>(
                body.ToCommand(operatorId.Value),
                ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        return Results.Created($"/api/v1/platform/customers/{result.Value!.Id}", result.Value);
    }

    private static async Task<IResult> GetCustomerAsync(Guid id, ISender sender, CancellationToken ct)
    {
        var result = await sender
            .AskAsync<GetCustomerQuery, CustomerDetailResponse?>(new GetCustomerQuery(id), ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        if (result.Value is null)
        {
            return Results.NotFound(new { error = "customer.not_found", detail = "Cliente no encontrado." });
        }

        return Results.Ok(result.Value);
    }

    private static async Task<IResult> UpdateCustomerAsync(
        Guid id,
        UpdateCustomerRequest body,
        ClaimsPrincipal user,
        ISender sender,
        CancellationToken ct)
    {
        var operatorId = ResolveOperatorId(user);
        if (operatorId is null)
        {
            return Results.Unauthorized();
        }

        var result = await sender
            .SendAsync<UpdateCustomerCommand, CustomerDetailResponse>(
                body.ToCommand(id, operatorId.Value),
                ct)
            .ConfigureAwait(false);
        return result.ToHttpResult();
    }

    private static async Task<IResult> DeactivateCustomerAsync(
        Guid id,
        ClaimsPrincipal user,
        ISender sender,
        CancellationToken ct)
    {
        var operatorId = ResolveOperatorId(user);
        if (operatorId is null)
        {
            return Results.Unauthorized();
        }

        var result = await sender
            .SendAsync<DeactivateCustomerCommand, DeactivateCustomerResponse>(
                new DeactivateCustomerCommand(id, operatorId.Value),
                ct)
            .ConfigureAwait(false);
        return result.ToHttpResult();
    }

    private static async Task<IResult> ListPlansAsync(
        bool? includeInactive,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender
            .AskAsync<ListPlansQuery, IReadOnlyList<ListPlansItem>>(
                new ListPlansQuery(includeInactive ?? false), ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        return Results.Ok(result.Value!);
    }

    private static async Task<IResult> CreatePlanAsync(
        CreatePlanRequest body,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender
            .SendAsync<CreatePlanCommand, CreatePlanResponse>(body.ToCommand(), ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        return Results.Created($"/api/v1/platform/plans/{result.Value!.Code}", result.Value);
    }

    private static async Task<IResult> GetPlanDetailAsync(
        string code,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender
            .AskAsync<GetPlanDetailQuery, PlanDetailResponse?>(new GetPlanDetailQuery(code), ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        if (result.Value is null)
        {
            return Results.NotFound(new { error = "plan.not_found", detail = $"Plan «{code}» no encontrado." });
        }

        return Results.Ok(result.Value);
    }

    private static async Task<IResult> UpdatePlanAsync(
        string code,
        UpdatePlanRequest body,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender
            .SendAsync<UpdatePlanCommand, UpdatePlanResponse>(body.ToCommand(code), ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        return Results.Ok(result.Value!);
    }

    private static async Task<IResult> DeactivatePlanAsync(
        string code,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender
            .SendAsync<DeactivatePlanCommand, DeactivatePlanResponse>(new DeactivatePlanCommand(code), ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        return Results.Ok(result.Value!);
    }

    private static async Task<IResult> ListOperatorsAsync(ISender sender, CancellationToken ct)
    {
        var result = await sender.AskAsync<ListOperatorsQuery, ListOperatorsResponse>(new ListOperatorsQuery(), ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        return Results.Ok(result.Value!.Items);
    }

    private static async Task<IResult> CreateOperatorAsync(
        CreateOperatorRequest body,
        ClaimsPrincipal user,
        ISender sender,
        CancellationToken ct)
    {
        var operatorId = ResolveOperatorId(user);
        var role = ResolveOperatorRole(user);
        if (operatorId is null || role is null)
        {
            return Results.Unauthorized();
        }

        var result = await sender
            .SendAsync<CreateOperatorCommand, CreateOperatorResponse>(
                body.ToCommand(operatorId.Value, role),
                ct)
            .ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return result.ToHttpResult();
        }

        return Results.Created($"/api/v1/platform/operators/{result.Value!.OperatorId}", result.Value);
    }

    private static Guid? ResolveOperatorId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(PlatformJwtClaimTypes.OperatorId)
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    private static string? ResolveOperatorRole(ClaimsPrincipal user) =>
        user.FindFirstValue(PlatformJwtClaimTypes.OperatorRole);

    // ═══════════════════════════════════════════════════════════════
    // Training endpoints
    // ═══════════════════════════════════════════════════════════════

    private static async Task<IResult> ScheduleTrainingAsync(
        ScheduleTrainingRequest body,
        ClaimsPrincipal user,
        ISender sender,
        CancellationToken ct)
    {
        var operatorId = ResolveOperatorId(user);
        if (operatorId is null) return Results.Unauthorized();

        if (!Enum.TryParse<TrainingSessionKind>(body.Kind, true, out var kind))
            return Results.BadRequest(new { error = "training.invalid_kind", detail = $"Tipo inválido: {body.Kind}" });

        if (!Enum.TryParse<TrainingModality>(body.Modality, true, out var modality))
            return Results.BadRequest(new { error = "training.invalid_modality", detail = $"Modalidad inválida: {body.Modality}" });

        var result = await sender
            .SendAsync<ScheduleTrainingCommand, ScheduleTrainingResponse>(
                new ScheduleTrainingCommand(
                    body.CustomerId,
                    body.LicenseGrantId,
                    body.Topic,
                    kind,
                    modality,
                    body.DurationHours,
                    body.ScheduledAt,
                    operatorId.Value.ToString(),
                    body.AttendeeEmails,
                    body.Notes),
                ct)
            .ConfigureAwait(false);

        if (!result.IsSuccess) return result.ToHttpResult();

        return Results.Created($"/api/v1/platform/training/{result.Value!.Id}", result.Value);
    }

    private static async Task<IResult> ListTrainingSessionsAsync(
        string? customerId,
        Guid? licenseGrantId,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender
            .AskAsync<ListTrainingSessionsQuery, IReadOnlyList<TrainingSessionItem>>(
                new ListTrainingSessionsQuery(customerId, licenseGrantId), ct)
            .ConfigureAwait(false);

        return result.ToHttpResult();
    }

    private static async Task<IResult> CompleteTrainingAsync(
        Guid id,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender
            .SendAsync<CompleteTrainingCommand, CompleteTrainingResponse>(
                new CompleteTrainingCommand(id), ct)
            .ConfigureAwait(false);

        return result.ToHttpResult();
    }

    private static async Task<IResult> CancelTrainingAsync(
        Guid id,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender
            .SendAsync<CancelTrainingCommand, CancelTrainingResponse>(
                new CancelTrainingCommand(id), ct)
            .ConfigureAwait(false);

        return result.ToHttpResult();
    }

    private static async Task<IResult> GetTrainingCalendarInviteAsync(
        Guid id,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender
            .AskAsync<GenerateCalendarInviteQuery, CalendarInviteResponse>(
                new GenerateCalendarInviteQuery(id), ct)
            .ConfigureAwait(false);

        if (!result.IsSuccess) return result.ToHttpResult();

        var invite = result.Value!;
        return Results.Text(invite.IcsContent, "text/calendar; charset=utf-8");
    }

    private static async Task<IResult> GetEmailSettingsAsync(
        MailKitPlatformEmailSender emailSender,
        CancellationToken ct)
    {
        var (config, source) = await emailSender.GetEffectiveConfigAsync(ct).ConfigureAwait(false);
        var isConfigured = config != null && !string.IsNullOrWhiteSpace(config.Host);

        var response = new PlatformEmailSettingsResponse(
            Host: config?.Host ?? string.Empty,
            Port: config?.Port ?? 587,
            UseSsl: config?.UseSsl ?? false,
            UserName: config?.UserName ?? string.Empty,
            HasPassword: !string.IsNullOrEmpty(config?.Password),
            SenderEmail: config?.SenderEmail ?? string.Empty,
            SenderName: config?.SenderName ?? string.Empty,
            IsConfigured: isConfigured,
            Source: source
        );

        return Results.Ok(response);
    }

    private static async Task<IResult> UpdateEmailSettingsAsync(
        [FromBody] UpdatePlatformEmailSettingsRequest body,
        IPlatformSettingRepository settingsRepo,
        MailKitPlatformEmailSender emailSender,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Host))
        {
            return Results.BadRequest(new { error = "El servidor SMTP (Host) es obligatorio." });
        }

        if (body.Port <= 0 || body.Port > 65535)
        {
            return Results.BadRequest(new { error = "El puerto SMTP debe estar entre 1 y 65535." });
        }

        var (existingConfig, _) = await emailSender.GetEffectiveConfigAsync(ct).ConfigureAwait(false);

        var passwordToSave = !string.IsNullOrWhiteSpace(body.Password)
            ? body.Password
            : (existingConfig?.Password ?? string.Empty);

        var configToSave = new PlatformEmailSmtpConfig
        {
            Host = body.Host.Trim(),
            Port = body.Port,
            UseSsl = body.UseSsl,
            UserName = body.UserName.Trim(),
            Password = passwordToSave,
            SenderEmail = string.IsNullOrWhiteSpace(body.SenderEmail) ? body.UserName.Trim() : body.SenderEmail.Trim(),
            SenderName = string.IsNullOrWhiteSpace(body.SenderName) ? "EcuNexo Platform" : body.SenderName.Trim()
        };

        var json = JsonSerializer.Serialize(configToSave);
        var setting = new PlatformSetting("platform.email.smtp", json, "Configuración SMTP institucional de la plataforma EcuNexo");

        await settingsRepo.SaveAsync(setting, ct).ConfigureAwait(false);

        var response = new PlatformEmailSettingsResponse(
            Host: configToSave.Host,
            Port: configToSave.Port,
            UseSsl: configToSave.UseSsl,
            UserName: configToSave.UserName,
            HasPassword: !string.IsNullOrEmpty(configToSave.Password),
            SenderEmail: configToSave.SenderEmail,
            SenderName: configToSave.SenderName,
            IsConfigured: true,
            Source: "Database"
        );

        return Results.Ok(response);
    }

    private static async Task<IResult> TestEmailSettingsAsync(
        [FromBody] TestPlatformEmailRequest body,
        IPlatformEmailSender emailSender,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.TargetEmail))
        {
            return Results.BadRequest(new { error = "El correo destinatario para la prueba es obligatorio." });
        }

        var subject = string.IsNullOrWhiteSpace(body.Subject)
            ? "Prueba de Servidor de Correo — EcuNexo Platform"
            : body.Subject.Trim();

        var timestamp = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd HH:mm:ss 'UTC'", CultureInfo.InvariantCulture);

        var htmlBody = $"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #0284c7; margin: 0; font-size: 24px;">EcuNexo Platform</h1>
                    <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Diagnóstico de Conectividad SMTP</p>
                </div>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <p style="color: #166534; font-weight: 600; margin: 0 0 8px 0; font-size: 15px;">✓ Conexión y Autenticación Exitosas</p>
                    <p style="color: #15803d; margin: 0; font-size: 13px;">Este correo confirma que el servidor de correo institucional de EcuNexo Platform se encuentra correctamente configurado y operativo.</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155; margin-bottom: 20px;">
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; width: 140px;">Destinatario:</td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">{body.TargetEmail}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">Fecha y Hora:</td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">{timestamp}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600;">Servicio:</td>
                        <td style="padding: 8px 0;">EcuNexo Platform Licencias API</td>
                    </tr>
                </table>
                <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Mensaje generado automáticamente por la Plataforma de Licencias de EcuNexo.</p>
            </div>
            """;

        var textBody = $"""
            EcuNexo Platform — Diagnóstico de Conectividad SMTP
            ==================================================

            ✓ Conexión y Autenticación Exitosas
            Este correo confirma que el servidor de correo institucional de EcuNexo Platform se encuentra correctamente configurado.

            Destinatario: {body.TargetEmail}
            Fecha y Hora: {timestamp}
            Servicio: EcuNexo Platform Licencias API
            """;

        var message = new PlatformEmailMessage(
            Recipients: [body.TargetEmail.Trim()],
            Subject: subject,
            PlainTextBody: textBody,
            HtmlBody: htmlBody
        );

        var result = await emailSender.SendAsync(message, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return Results.BadRequest(new { error = result.Error?.Message ?? "Error al enviar correo de prueba." });
        }

        return Results.Ok(new { message = $"Correo de prueba enviado con éxito a {body.TargetEmail}." });
    }

    private static async Task<IResult> SendLicenseDeliveryEmailAsync(
        Guid grantId,
        [FromBody] SendLicenseDeliveryEmailRequest body,
        ILicenseGrantRepository grantRepo,
        ILicensingCustomerRepository customerRepo,
        IPlatformEmailSender emailSender,
        CancellationToken ct)
    {
        var grant = await grantRepo.GetByIdAsync(grantId, ct).ConfigureAwait(false);
        if (grant == null)
        {
            return Results.NotFound(new { error = "Licencia no encontrada." });
        }

        var customer = await customerRepo.GetByIdAsync(grant.CustomerId, ct).ConfigureAwait(false);
        if (customer == null)
        {
            return Results.NotFound(new { error = "Cliente asociado no encontrado." });
        }

        var targetEmail = !string.IsNullOrWhiteSpace(body.RecipientEmail)
            ? body.RecipientEmail.Trim()
            : (!string.IsNullOrWhiteSpace(customer.ContactEmail)
                ? customer.ContactEmail.Trim()
                : grant.OwnerEmailNormalized);

        if (string.IsNullOrWhiteSpace(targetEmail))
        {
            return Results.BadRequest(new { error = "No se encontró una dirección de correo para el cliente. Ingrese un correo destinatario." });
        }

        var customerName = !string.IsNullOrWhiteSpace(customer.TradeName) ? customer.TradeName : customer.LegalName;
        var planName = grant.PlanLabel;
        var expiresAt = grant.ExpiresAtUtc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var deployment = grant.DeploymentMode.ToString();

        var activationCode = !string.IsNullOrWhiteSpace(body.ActivationCodePlaintext)
            ? body.ActivationCodePlaintext.Trim()
            : null;

        var codeBlockHtml = activationCode != null
            ? $"""
                <div style="background: #0f172a; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                    <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Código de Activación Comercial</span>
                    <code style="color: #38bdf8; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 20px; font-weight: 700; letter-spacing: 0.1em;">{activationCode}</code>
                </div>
              """
            : """
                <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin: 16px 0; text-align: center;">
                    <p style="color: #64748b; font-size: 13px; margin: 0;">Esta entrega corresponde a una suscripción ya registrada o reemitida. Si requiere un nuevo código de activación, puede generarlo en la plataforma.</p>
                </div>
              """;

        var codeBlockText = activationCode != null
            ? $"\nCÓDIGO DE ACTIVACIÓN: {activationCode}\n"
            : string.Empty;

        var htmlBody = $"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
                <div style="text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
                    <h1 style="color: #0284c7; margin: 0; font-size: 24px;">EcuNexo</h1>
                    <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Entrega Oficial de Licencia y Suscripción</p>
                </div>
                
                <p style="font-size: 15px; margin: 0 0 16px 0;">Estimado/a <strong>{customerName}</strong>,</p>
                <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0; line-height: 1.5;">Nos complace formalizar la entrega de su licencia para la plataforma empresarial <strong>EcuNexo</strong>. A continuación se detallan los datos de su suscripción y las credenciales de activación:</p>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
                    <tr style="background: #f8fafc;">
                        <td style="padding: 8px 12px; font-weight: 600; width: 150px; border: 1px solid #e2e8f0;">Plan Contratado:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">{planName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: 600; border: 1px solid #e2e8f0;">Modalidad:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">{deployment}</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td style="padding: 8px 12px; font-weight: 600; border: 1px solid #e2e8f0;">Vigencia Hasta:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">{expiresAt}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: 600; border: 1px solid #e2e8f0;">Límites:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Máx. {grant.MaxTenants} empresas / {grant.MaxUsers} usuarios / {grant.MaxWarehouses} bodegas</td>
                    </tr>
                </table>

                {codeBlockHtml}

                <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #475569;">
                    <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Instrucciones para canjear su licencia:</strong>
                    1. Ingrese al panel administrativo de su empresa.<br />
                    2. Diríjase a <strong>Configuración del Sistema → Licenciamiento</strong>.<br />
                    3. Ingrese el código de activación o cargue el archivo adjunto <code>.ecunexo-license</code> para activar de inmediato todos los módulos de su plan.
                </div>

                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 24px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                    Este es un mensaje institucional generado automáticamente por el sistema de licenciamiento de EcuNexo.
                </p>
            </div>
            """;

        var textBody = $"""
            EcuNexo — Entrega Oficial de Licencia y Suscripción
            ====================================================

            Estimado/a {customerName},

            Nos complace formalizar la entrega de su licencia para la plataforma empresarial EcuNexo.

            Detalles de la suscripción:
            - Plan Contratado: {planName}
            - Modalidad: {deployment}
            - Vigencia Hasta: {expiresAt}
            - Límites: {grant.MaxTenants} empresas / {grant.MaxUsers} usuarios / {grant.MaxWarehouses} bodegas
            {codeBlockText}
            Instrucciones:
            1. Ingrese al panel de su empresa en Configuración -> Licenciamiento.
            2. Ingrese su código de activación o importe el archivo de licencia adjunto.

            EcuNexo Platform
            """;

        List<PlatformEmailAttachment>? attachments = null;
        if (!string.IsNullOrWhiteSpace(body.LicenseArtifact))
        {
            var artifactBytes = System.Text.Encoding.UTF8.GetBytes(body.LicenseArtifact);
            var cleanPlan = string.Concat(planName.Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_'));
            attachments = [new PlatformEmailAttachment($"licencia-{cleanPlan}.ecunexo-license", artifactBytes, "application/json")];
        }

        var emailMessage = new PlatformEmailMessage(
            Recipients: [targetEmail],
            Subject: $"Entrega de Licencia EcuNexo — {planName} ({customerName})",
            PlainTextBody: textBody,
            HtmlBody: htmlBody,
            Attachments: attachments
        );

        var result = await emailSender.SendAsync(emailMessage, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return Results.BadRequest(new { error = result.Error?.Message ?? "Error al enviar la licencia por correo." });
        }

        return Results.Ok(new { message = $"Licencia enviada exitosamente a {targetEmail}." });
    }

    private static async Task<IResult> SendTrainingInviteEmailAsync(
        Guid id,
        [FromBody] SendTrainingInviteEmailRequest? body,
        ISender sender,
        ITrainingSessionRepository sessionsRepo,
        ILicensingCustomerRepository customerRepo,
        IPlatformEmailSender emailSender,
        CancellationToken ct)
    {
        var session = await sessionsRepo.GetByIdAsync(id, ct).ConfigureAwait(false);
        if (session == null)
        {
            return Results.NotFound(new { error = "Sesión de capacitación no encontrada." });
        }

        var customer = await customerRepo.GetByIdAsync(Guid.Parse(session.CustomerId), ct).ConfigureAwait(false);
        var customerName = customer != null ? (!string.IsNullOrWhiteSpace(customer.TradeName) ? customer.TradeName : customer.LegalName) : "Cliente";

        var recipients = body?.RecipientEmails?.Where(e => !string.IsNullOrWhiteSpace(e)).ToList();
        if (recipients == null || recipients.Count == 0)
        {
            recipients = session.AttendeeEmails.Where(e => !string.IsNullOrWhiteSpace(e)).ToList();
        }

        if (recipients.Count == 0)
        {
            return Results.BadRequest(new { error = "La sesión no tiene correos de asistentes registrados." });
        }

        var inviteResult = await sender
            .AskAsync<GenerateCalendarInviteQuery, CalendarInviteResponse>(new GenerateCalendarInviteQuery(id), ct)
            .ConfigureAwait(false);

        byte[]? icsBytes = null;
        string icsFileName = "capacitacion-ecunexo.ics";
        if (inviteResult.IsSuccess && inviteResult.Value != null)
        {
            icsBytes = System.Text.Encoding.UTF8.GetBytes(inviteResult.Value.IcsContent);
            icsFileName = inviteResult.Value.FileName;
        }

        var scheduledAt = session.ScheduledAt.ToString("yyyy-MM-dd HH:mm UTC", CultureInfo.InvariantCulture);
        var modality = session.Modality == EcuNexo.Platform.Core.Training.TrainingModality.Virtual ? "Virtual (Online)" : "Presencial";

        var htmlBody = $"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
                <div style="text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
                    <h1 style="color: #0284c7; margin: 0; font-size: 24px;">EcuNexo Capacitación</h1>
                    <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Invitación a Sesión de Capacitación</p>
                </div>

                <p style="font-size: 15px; margin: 0 0 16px 0;">Estimado equipo de <strong>{customerName}</strong>,</p>
                <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0; line-height: 1.5;">Le confirmamos la programación de su sesión de inducción y capacitación técnica en la plataforma <strong>EcuNexo</strong>:</p>

                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
                    <tr style="background: #f8fafc;">
                        <td style="padding: 8px 12px; font-weight: 600; width: 140px; border: 1px solid #e2e8f0;">Tema / Módulo:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">{session.Topic}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: 600; border: 1px solid #e2e8f0;">Fecha y Hora:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">{scheduledAt}</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td style="padding: 8px 12px; font-weight: 600; border: 1px solid #e2e8f0;">Duración:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">{session.DurationHours} hora(s)</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: 600; border: 1px solid #e2e8f0;">Modalidad:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">{modality}</td>
                    </tr>
                </table>

                <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #1e40af;">
                    Adjunto a este correo encontrará el archivo de calendario <code>{icsFileName}</code> para agendar automáticamente el evento en Google Calendar, Outlook o Apple Calendar.
                </div>

                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 24px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                    EcuNexo Platform — Área de Capacitación y Éxito del Cliente
                </p>
            </div>
            """;

        var textBody = $"""
            EcuNexo Capacitación — Invitación a Sesión
            ===========================================

            Estimado equipo de {customerName},

            Detalles de la sesión de capacitación programada:
            - Tema: {session.Topic}
            - Fecha y Hora: {scheduledAt}
            - Duración: {session.DurationHours} hora(s)
            - Modalidad: {modality}

            Se adjunta el archivo de calendario para su agenda.

            EcuNexo Platform
            """;

        List<PlatformEmailAttachment>? attachments = null;
        if (icsBytes != null)
        {
            attachments = [new PlatformEmailAttachment(icsFileName, icsBytes, "text/calendar; charset=utf-8")];
        }

        var message = new PlatformEmailMessage(
            Recipients: recipients,
            Subject: $"Capacitación EcuNexo: {session.Topic} ({customerName})",
            PlainTextBody: textBody,
            HtmlBody: htmlBody,
            Attachments: attachments
        );

        var result = await emailSender.SendAsync(message, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return Results.BadRequest(new { error = result.Error?.Message ?? "Error al enviar invitación de capacitación." });
        }

        return Results.Ok(new { message = $"Invitación enviada exitosamente a {recipients.Count} destinatarios." });
    }
}
