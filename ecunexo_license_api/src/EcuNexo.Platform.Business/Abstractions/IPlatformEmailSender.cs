using EcuNexo.Core.Common;

namespace EcuNexo.Platform.Business.Abstractions;

public sealed record PlatformEmailAttachment(
    string FileName,
    byte[] Content,
    string ContentType);

public sealed record PlatformEmailMessage(
    IReadOnlyList<string> Recipients,
    string Subject,
    string PlainTextBody,
    string? HtmlBody = null,
    IReadOnlyList<PlatformEmailAttachment>? Attachments = null);

public interface IPlatformEmailSender
{
    Task<Result> SendAsync(PlatformEmailMessage message, CancellationToken ct = default);
}
