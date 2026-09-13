using System.Security.Cryptography;
using EcuNexo.Core.Common;
using EcuNexo.Core.Licensing;
using EcuNexo.Platform.Api.Configuration;
using EcuNexo.Platform.Business.Licensing;
using Microsoft.Extensions.Options;

namespace EcuNexo.Platform.Api.Licensing;

public sealed class LicenseArtifactIssuer : ILicenseArtifactIssuer
{
    private readonly string _privateKeyPem;

    public LicenseArtifactIssuer(IOptions<LicenseSigningOptions> options, IHostEnvironment env)
    {
        _privateKeyPem = ResolvePrivateKeyPem(options.Value, env);
    }

    public Result<string> GetPublicKeyPem()
    {
        if (string.IsNullOrWhiteSpace(_privateKeyPem))
        {
            return Result.Failure<string>(
                new Error(
                    "license.signing.key.missing",
                    "Clave privada de firma de licencias no configurada.",
                    ErrorType.Unexpected));
        }

        try
        {
            using var rsa = RSA.Create();
            rsa.ImportFromPem(_privateKeyPem);
            return Result.Success(rsa.ExportSubjectPublicKeyInfoPem());
        }
        catch (Exception ex)
        {
            return Result.Failure<string>(
                new Error(
                    "license.signing.key.invalid",
                    $"No se pudo derivar la clave pública: {ex.Message}",
                    ErrorType.Unexpected));
        }
    }

    public Result<string> Sign(LicenseArtifactPayload payload)
    {
        if (string.IsNullOrWhiteSpace(_privateKeyPem))
        {
            return Result.Failure<string>(
                new Error(
                    "license.signing.key.missing",
                    "Clave privada de firma de licencias no configurada.",
                    ErrorType.Unexpected));
        }

        try
        {
            return Result.Success(LicenseArtifactCodec.Sign(payload, _privateKeyPem));
        }
        catch (Exception)
        {
            return Result.Failure<string>(
                new Error("license.signing.failed", "No se pudo firmar el paquete de licencia.", ErrorType.Unexpected));
        }
    }

    private static string ResolvePrivateKeyPem(LicenseSigningOptions options, IHostEnvironment env)
    {
        if (!string.IsNullOrWhiteSpace(options.PrivateKeyPem))
        {
            return options.PrivateKeyPem;
        }

        if (string.IsNullOrWhiteSpace(options.PrivateKeyPath))
        {
            return string.Empty;
        }

        var path = options.PrivateKeyPath;
        if (!Path.IsPathRooted(path))
        {
            path = Path.Combine(env.ContentRootPath, path);
        }

        return File.Exists(path) ? File.ReadAllText(path) : string.Empty;
    }
}
