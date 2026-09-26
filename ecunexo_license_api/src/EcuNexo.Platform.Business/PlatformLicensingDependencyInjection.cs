using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing.Commands.ClearGrantTenantOverride;
using EcuNexo.Platform.Business.Licensing.Commands.CreateCustomer;
using EcuNexo.Platform.Business.Licensing.Commands.CreateOperator;
using EcuNexo.Platform.Business.Licensing.Commands.CreatePlan;
using EcuNexo.Platform.Business.Licensing.Commands.DeactivateCustomer;
using EcuNexo.Platform.Business.Licensing.Commands.DeactivatePlan;
using EcuNexo.Platform.Business.Licensing.Commands.IssueLicense;
using EcuNexo.Platform.Business.Licensing.Commands.ReportGrantTenants;
using EcuNexo.Platform.Business.Licensing.Commands.ReissueLicense;
using EcuNexo.Platform.Business.Licensing.Commands.OperatorLogin;
using EcuNexo.Platform.Business.Licensing.Commands.UpdateCustomer;
using EcuNexo.Platform.Business.Licensing.Commands.UpdateGrantEntitlements;
using EcuNexo.Platform.Business.Licensing.Commands.UpdateGrantTenantEntitlements;
using EcuNexo.Platform.Business.Licensing.Commands.UpdatePlan;
using EcuNexo.Platform.Business.Licensing.Queries.GetCustomer;
using EcuNexo.Platform.Business.Licensing.Queries.GetGrantEntitlements;
using EcuNexo.Platform.Business.Licensing.Queries.GetGrantTenantEntitlements;
using EcuNexo.Platform.Business.Licensing.Queries.GetLicenseStatus;
using EcuNexo.Platform.Business.Licensing.Queries.GetPlanDetail;
using EcuNexo.Platform.Business.Licensing.Queries.ListGrantTenants;
using EcuNexo.Platform.Business.Licensing.Queries.ListLicenses;
using EcuNexo.Platform.Business.Licensing.Queries.ListLicensingCustomers;
using EcuNexo.Platform.Business.Licensing.Queries.ListOperators;
using EcuNexo.Platform.Business.Licensing.Queries.ListPlans;
using EcuNexo.Platform.Business.Training.Commands.ScheduleTraining;
using EcuNexo.Platform.Business.Training.Commands.CompleteTraining;
using EcuNexo.Platform.Business.Training.Commands.CancelTraining;
using EcuNexo.Platform.Business.Training.Queries.ListTrainingSessions;
using EcuNexo.Platform.Business.Training.Queries.GenerateCalendarInvite;
using EcuNexo.Platform.Business.Training;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace EcuNexo.Platform.Business;

public static class PlatformLicensingDependencyInjection
{
    public static IServiceCollection AddPlatformLicensingBusiness(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<IssueLicenseValidator>();

        services.AddScoped<ICommandHandler<IssueLicenseCommand, IssueLicenseResponse>, IssueLicenseHandler>();
        services.AddScoped<ICommandHandler<ReissueLicenseCommand, ReissueLicenseResponse>, ReissueLicenseHandler>();
        services.AddScoped<ICommandHandler<UpdateGrantEntitlementsCommand, GrantEntitlementsResponse>, UpdateGrantEntitlementsHandler>();
        services.AddScoped<IQueryHandler<GetGrantEntitlementsQuery, GrantEntitlementsResponse>, GetGrantEntitlementsHandler>();
        services.AddScoped<ICommandHandler<ReportGrantTenantsCommand, ReportGrantTenantsResponse>, ReportGrantTenantsHandler>();
        services.AddScoped<IQueryHandler<ListGrantTenantsQuery, IReadOnlyList<GrantTenantListItem>>, ListGrantTenantsHandler>();
        services.AddScoped<IQueryHandler<GetGrantTenantEntitlementsQuery, GrantTenantEntitlementsResponse>, GetGrantTenantEntitlementsHandler>();
        services.AddScoped<ICommandHandler<UpdateGrantTenantEntitlementsCommand, GrantTenantEntitlementsResponse>, UpdateGrantTenantEntitlementsHandler>();
        services.AddScoped<ICommandHandler<ClearGrantTenantOverrideCommand, GrantTenantEntitlementsResponse>, ClearGrantTenantOverrideHandler>();
        services.AddScoped<ICommandHandler<PlatformOperatorLoginCommand, PlatformOperatorLoginResponse>, PlatformOperatorLoginHandler>();
        services.AddScoped<ICommandHandler<CreateOperatorCommand, CreateOperatorResponse>, CreateOperatorHandler>();
        services.AddScoped<ICommandHandler<CreateCustomerCommand, CreateCustomerResponse>, CreateCustomerHandler>();
        services.AddScoped<ICommandHandler<UpdateCustomerCommand, CustomerDetailResponse>, UpdateCustomerHandler>();
        services.AddScoped<ICommandHandler<DeactivateCustomerCommand, DeactivateCustomerResponse>, DeactivateCustomerHandler>();
        services.AddScoped<IQueryHandler<GetCustomerQuery, CustomerDetailResponse?>, GetCustomerHandler>();
        services.AddScoped<IQueryHandler<ListOperatorsQuery, ListOperatorsResponse>, ListOperatorsHandler>();
        services.AddScoped<IQueryHandler<ListLicensesQuery, ListLicensesResponse>, ListLicensesHandler>();
        services.AddScoped<IQueryHandler<GetLicenseStatusQuery, LicenseStatusResponse>, GetLicenseStatusHandler>();
        services.AddScoped<IQueryHandler<ListLicensingCustomersQuery, ListLicensingCustomersResponse>, ListLicensingCustomersHandler>();

        services.AddScoped<ICommandHandler<CreatePlanCommand, CreatePlanResponse>, CreatePlanHandler>();
        services.AddScoped<ICommandHandler<UpdatePlanCommand, UpdatePlanResponse>, UpdatePlanHandler>();
        services.AddScoped<ICommandHandler<DeactivatePlanCommand, DeactivatePlanResponse>, DeactivatePlanHandler>();
        services.AddScoped<IQueryHandler<ListPlansQuery, IReadOnlyList<ListPlansItem>>, ListPlansHandler>();
        services.AddScoped<IQueryHandler<GetPlanDetailQuery, PlanDetailResponse?>, GetPlanDetailHandler>();

        // Training
        services.AddScoped<ICommandHandler<ScheduleTrainingCommand, ScheduleTrainingResponse>, ScheduleTrainingHandler>();
        services.AddScoped<ICommandHandler<CompleteTrainingCommand, CompleteTrainingResponse>, CompleteTrainingHandler>();
        services.AddScoped<ICommandHandler<CancelTrainingCommand, CancelTrainingResponse>, CancelTrainingHandler>();
        services.AddScoped<IQueryHandler<ListTrainingSessionsQuery, IReadOnlyList<TrainingSessionItem>>, ListTrainingSessionsHandler>();
        services.AddScoped<IQueryHandler<GenerateCalendarInviteQuery, CalendarInviteResponse>, GenerateCalendarInviteHandler>();

        services.AddScoped<ISender, Sender>();
        return services;
    }
}
