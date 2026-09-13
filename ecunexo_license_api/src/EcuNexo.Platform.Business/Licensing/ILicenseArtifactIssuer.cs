using EcuNexo.Core.Common;
using EcuNexo.Core.Licensing;

namespace EcuNexo.Platform.Business.Licensing;

public interface ILicenseArtifactIssuer
{
    Result<string> Sign(LicenseArtifactPayload payload);
    Result<string> GetPublicKeyPem();
}
