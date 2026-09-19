using System.Text.Json;
using EcuNexo.Core.Common;
using EcuNexo.Platform.Api.Contracts.V1;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Settings;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace EcuNexo.Platform.Api.Email;

public sealed class MailKitPlatformEmailSender : IPlatformEmailSender
{
    private const string SettingKey = "platform.email.smtp";
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly IPlatformSettingRepository _settingsRepo;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MailKitPlatformEmailSender> _logger;

    public MailKitPlatformEmailSender(
        IPlatformSettingRepository settingsRepo,
        IConfiguration configuration,
        ILogger<MailKitPlatformEmailSender> logger)
    {
        _settingsRepo = settingsRepo;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<(PlatformEmailSmtpConfig? Config, string Source)> GetEffectiveConfigAsync(CancellationToken ct = default)
    {
        var rawJson = await _settingsRepo.GetValueAsync(SettingKey, ct).ConfigureAwait(false);
        if (!string.IsNullOrWhiteSpace(rawJson))
        {
            try
            {
                var dbConfig = JsonSerializer.Deserialize<PlatformEmailSmtpConfig>(rawJson, JsonOptions);

                if (dbConfig != null && !string.IsNullOrWhiteSpace(dbConfig.Host))
                {
                    return (dbConfig, "Database");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al deserializar configuración SMTP de la base de datos.");
            }
        }

        var envHost = _configuration["Smtp:Host"];
        if (!string.IsNullOrWhiteSpace(envHost))
        {
            var envConfig = new PlatformEmailSmtpConfig
            {
                Host = envHost.Trim(),
                Port = int.TryParse(_configuration["Smtp:Port"], out var p) ? p : 587,
                UseSsl = bool.TryParse(_configuration["Smtp:UseSsl"], out var ssl) && ssl,
                UserName = _configuration["Smtp:UserName"]?.Trim() ?? string.Empty,
                Password = _configuration["Smtp:Password"] ?? string.Empty,
                SenderEmail = _configuration["Smtp:SenderEmail"]?.Trim() ?? string.Empty,
                SenderName = _configuration["Smtp:SenderName"]?.Trim() ?? "EcuNexo Platform"
            };

            return (envConfig, "Environment");
        }

        return (null, "None");
    }

    public async Task<Result> SendAsync(PlatformEmailMessage message, CancellationToken ct = default)
    {
        if (message.Recipients == null || message.Recipients.Count == 0)
        {
            return Result.Failure(new Error("email.empty_recipients", "No se especificaron destinatarios para el correo.", ErrorType.Validation));
        }

        var (config, source) = await GetEffectiveConfigAsync(ct).ConfigureAwait(false);
        if (config == null || string.IsNullOrWhiteSpace(config.Host))
        {
            _logger.LogWarning("Intento de envío de correo sin servidor SMTP configurado.");
            return Result.Failure(new Error("email.not_configured", "El servidor de correo SMTP no está configurado. Configure los parámetros en Administración -> Servidor de Correo.", ErrorType.Validation));
        }

        try
        {
            var mimeMessage = new MimeMessage();
            var senderDisplayName = string.IsNullOrWhiteSpace(config.SenderName) ? "EcuNexo Platform" : config.SenderName;
            var senderAddress = string.IsNullOrWhiteSpace(config.SenderEmail) ? config.UserName : config.SenderEmail;

            mimeMessage.From.Add(new MailboxAddress(senderDisplayName, senderAddress));

            foreach (var recipient in message.Recipients)
            {
                if (!string.IsNullOrWhiteSpace(recipient))
                {
                    mimeMessage.To.Add(MailboxAddress.Parse(recipient.Trim()));
                }
            }

            mimeMessage.Subject = message.Subject;

            var bodyBuilder = new BodyBuilder
            {
                TextBody = message.PlainTextBody
            };

            if (!string.IsNullOrWhiteSpace(message.HtmlBody))
            {
                bodyBuilder.HtmlBody = message.HtmlBody;
            }

            if (message.Attachments != null)
            {
                foreach (var att in message.Attachments)
                {
                    if (att.Content != null && att.Content.Length > 0)
                    {
                        var contentType = ContentType.Parse(string.IsNullOrWhiteSpace(att.ContentType) ? "application/octet-stream" : att.ContentType);
                        bodyBuilder.Attachments.Add(att.FileName, att.Content, contentType);
                    }
                }
            }

            mimeMessage.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();

            var secureOptions = config.Port == 465 || config.UseSsl
                ? SecureSocketOptions.SslOnConnect
                : SecureSocketOptions.StartTlsWhenAvailable;

            await client.ConnectAsync(config.Host, config.Port, secureOptions, ct).ConfigureAwait(false);

            if (!string.IsNullOrWhiteSpace(config.UserName))
            {
                await client.AuthenticateAsync(config.UserName, config.Password, ct).ConfigureAwait(false);
            }

            await client.SendAsync(mimeMessage, ct).ConfigureAwait(false);
            await client.DisconnectAsync(true, ct).ConfigureAwait(false);

            _logger.LogInformation(
                "Correo '{Subject}' enviado exitosamente a {RecipientCount} destinatarios vía SMTP {Host}:{Port} (origen: {Source}).",
                message.Subject,
                message.Recipients.Count,
                config.Host,
                config.Port,
                source);

            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al despachar correo electrónico vía SMTP a {Recipients}", string.Join(", ", message.Recipients));
            return Result.Failure(new Error("email.dispatch_failed", $"Fallo al enviar correo: {ex.Message}", ErrorType.Unexpected));
        }
    }
}
