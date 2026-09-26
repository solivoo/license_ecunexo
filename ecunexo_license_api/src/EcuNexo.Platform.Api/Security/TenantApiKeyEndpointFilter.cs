using System.Security.Cryptography;
using System.Text;
using EcuNexo.Platform.Api.Configuration;
using Microsoft.Extensions.Options;

namespace EcuNexo.Platform.Api.Security;

/// <summary>
/// Valida la clave máquina-a-máquina que usa el tenant para sincronizar entitlements.
/// La clave viaja en <c>X-Platform-Validation-Key</c>.
/// </summary>
public sealed class TenantApiKeyEndpointFilter : IEndpointFilter
{
    public const string HeaderName = "X-Platform-Validation-Key";

    private readonly LicenseValidationOptions _options;

    public TenantApiKeyEndpointFilter(IOptions<LicenseValidationOptions> options)
    {
        _options = options.Value;
    }

    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var configured = _options.TenantApiKey;
        if (string.IsNullOrWhiteSpace(configured))
        {
            return Results.Problem(
                title: "Sincronización de entitlements no configurada",
                detail: "Defina LicenseValidation:TenantApiKey en el API de licencias.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var provided)
            || !FixedTimeEquals(configured, provided.ToString()))
        {
            return Results.Unauthorized();
        }

        return await next(context).ConfigureAwait(false);
    }

    private static bool FixedTimeEquals(string expected, string provided)
    {
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var providedBytes = Encoding.UTF8.GetBytes(provided);
        return expectedBytes.Length == providedBytes.Length
            && CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes);
    }
}
