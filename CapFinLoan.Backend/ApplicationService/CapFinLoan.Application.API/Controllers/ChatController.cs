using System.Security.Claims;
using CapFinLoan.Application.Application.DTOs;
using CapFinLoan.Application.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CapFinLoan.Application.API.Controllers;

[ApiController]
[Route("chat")]
[Authorize]
public sealed class ChatController : ControllerBase
{
    private readonly ChatService _chatService;

    public ChatController(ChatService chatService)
    {
        _chatService = chatService;
    }

    [HttpPost("message")]
    public async Task<ActionResult<ChatResponseDto>> Message(
        [FromBody] ChatRequestDto dto,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest(new { message = "Message cannot be empty." });

        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdValue) || !int.TryParse(userIdValue, out var userId))
            return Unauthorized();

        var authHeader = Request.Headers.Authorization.ToString();
        var response = await _chatService.ChatAsync(userId, dto.Message.Trim(), authHeader, cancellationToken);
        return Ok(response);
    }
}
