"""Supported Melora webhook event types."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class WebhookEventDefinition:
    name: str
    description: str


EVENT_DEFINITIONS = (
    WebhookEventDefinition("playback.started", "A playback session started"),
    WebhookEventDefinition("playback.paused", "Playback was paused"),
    WebhookEventDefinition("playback.stopped", "Playback was stopped"),
    WebhookEventDefinition("song.played", "A song finished or was recorded as played"),
    WebhookEventDefinition("library.song.saved", "A song was added to the user's library"),
    WebhookEventDefinition("library.song.removed", "A song was removed from the user's library"),
    WebhookEventDefinition("playlist.created", "A playlist was created"),
    WebhookEventDefinition("playlist.updated", "A playlist was updated"),
    WebhookEventDefinition("playlist.deleted", "A playlist was deleted"),
    WebhookEventDefinition("artist.followed", "An artist was followed"),
    WebhookEventDefinition("artist.unfollowed", "An artist was unfollowed"),
    WebhookEventDefinition("upload.completed", "A music upload or import completed"),
    WebhookEventDefinition("settings.updated", "User settings were updated"),
    WebhookEventDefinition("user.updated", "The user's profile was updated"),
    WebhookEventDefinition("automation.triggered", "An approved automation was triggered"),
    WebhookEventDefinition("admin.user.updated", "An administrator changed a user account"),
)

WEBHOOK_EVENT_CATALOG = {
    event.name: event for event in EVENT_DEFINITIONS
}


def serialize_webhook_events() -> list[dict[str, str]]:
    return [
        {"name": event.name, "description": event.description}
        for event in EVENT_DEFINITIONS
    ]
