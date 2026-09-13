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
using EcuNexo.Platform.Api.Extensions;
using EcuNexo.Platform.Api.Security;
using EcuNexo.Platform.Business.Licensing;
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
}
