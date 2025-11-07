/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import type { LoggedMessage } from "./data";

export const enum FilterMode {
    Blacklist = "blacklist",
    Whitelist = "whitelist"
}

export const settings = definePluginSettings({
    deleteStyle: {
        type: OptionType.SELECT,
        description: "The style of deleted messages",
        default: "text",
        options: [
            { label: "Red text", value: "text", default: true },
            { label: "Red overlay", value: "overlay" }
        ],
    },
    logDeletes: {
        type: OptionType.BOOLEAN,
        description: "Whether to log deleted messages",
        default: true,
    },
    collapseDeleted: {
        type: OptionType.BOOLEAN,
        description: "Whether to collapse deleted messages, similar to blocked messages",
        default: false,
        restartNeeded: true,
    },
    logEdits: {
        type: OptionType.BOOLEAN,
        description: "Whether to log edited messages",
        default: true,
    },
    inlineEdits: {
        type: OptionType.BOOLEAN,
        description: "Whether to display edit history as part of message content",
        default: true
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by bots",
        default: false
    },
    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by yourself",
        default: false
    },
    ignoreUsers: {
        type: OptionType.STRING,
        description: "Comma-separated list of user IDs to ignore",
        default: ""
    },
    filterMode: {
        type: OptionType.SELECT,
        description: "Channel filter mode",
        options: [
            { label: "Blacklist (log all except listed channels)", value: FilterMode.Blacklist, default: true },
            { label: "Whitelist (only log listed channels)", value: FilterMode.Whitelist }
        ],
        default: FilterMode.Blacklist
    },
    channelList: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs (for whitelist/blacklist)",
        default: ""
    },
    ignoreGuilds: {
        type: OptionType.STRING,
        description: "Comma-separated list of guild IDs to ignore",
        default: ""
    },
    messageStore: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, LoggedMessage>
    }
});
