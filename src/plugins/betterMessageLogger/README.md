# BetterMessageLogger

A persistent message logger plugin for Vencord that logs deleted and edited messages permanently with whitelist/blacklist channel filtering support.

## Features

- **Persistent Storage**: Messages are saved permanently and survive Discord reloads
- **WhiteList/BlackList Mode**: Choose whether to log only specific channels (whitelist) or all except specific channels (blacklist)
- **Edit History**: Tracks all edits made to messages
- **Deletion Tracking**: Logs deleted messages with their original content
- **Customizable Filters**: 
  - Ignore bots
  - Ignore self messages
  - Ignore specific users
  - Ignore specific guilds
  - Filter by channels using whitelist or blacklist mode

## Settings

### Display Settings
- **Delete Style**: Choose between red text or red overlay for deleted messages
- **Collapse Deleted**: Group deleted messages like blocked messages
- **Inline Edits**: Display edit history as part of message content

### Logging Settings
- **Log Deletes**: Enable/disable logging of deleted messages
- **Log Edits**: Enable/disable logging of edited messages

### Filter Settings
- **Filter Mode**: Toggle between Whitelist and Blacklist mode
  - **Blacklist** (default): Logs all channels except those in the channel list
  - **Whitelist**: Only logs channels in the channel list
- **Channel List**: Comma-separated list of channel IDs to whitelist/blacklist
- **Ignore Bots**: Don't log messages from bot accounts
- **Ignore Self**: Don't log your own messages
- **Ignore Users**: Comma-separated list of user IDs to ignore
- **Ignore Guilds**: Comma-separated list of guild IDs to ignore

## How It Works

Unlike the standard MessageLogger plugin which stores messages only in the Discord cache (lost on reload), BetterMessageLogger stores all logged messages persistently in Vencord's settings storage, similar to how PinDMs works.

### WhiteList vs BlackList

- **BlackList Mode** (Default): Logs messages from all channels except those specified in the Channel List
  - Example: Add channel IDs `123456,789012` to ignore only those channels
  
- **WhiteList Mode**: Only logs messages from channels specified in the Channel List
  - Example: Add channel IDs `123456,789012` to log only those channels permanently

## Context Menu Options

- **Toggle Deleted Highlight**: Toggle the deletion highlight on/off for individual messages
- **Remove Message History**: Remove the log entry for a specific message
- **Clear Message Log** (in channel context menu): Clear all logged messages for a channel

## Storage

Logged messages are stored in the plugin settings and include:
- Message ID
- Channel ID
- Author ID
- Message content
- Timestamp
- Edit history (with timestamps)
- Deletion status and timestamp
- Attachments
- Flags

## Notes

- Messages are stored indefinitely until manually cleared
- Large amounts of logged messages may impact storage size
- The plugin uses the same visual styling as the standard MessageLogger
- All webpack patches are identical to MessageLogger for compatibility

## Differences from MessageLogger

| Feature | MessageLogger | BetterMessageLogger |
|---------|---------------|---------------------|
| Storage | Cache (temporary) | Persistent storage |
| Survives reload | ❌ | ✅ |
| Channel filtering | BlackList only | WhiteList/BlackList toggle |
| Channel list meaning | Ignore these channels | Depends on mode (whitelist/blacklist) |
