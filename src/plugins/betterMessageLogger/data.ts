/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useForceUpdater } from "@utils/react";

import { settings } from "./index";

export interface LoggedMessage {
    id: string;
    channelId: string;
    authorId: string;
    content: string;
    timestamp: number;
    editHistory: { timestamp: Date; content: string; }[];
    deleted?: boolean;
    deletedTimestamp?: number;
    attachments?: any[];
    flags?: number;
}

let forceUpdateMessages: (() => void) | undefined = undefined;
export let messageStore: Record<string, LoggedMessage> = {};

export async function init() {
    messageStore = settings.store.messageStore ?? {};
    forceUpdateMessages?.();
}

export function useMessageLogger() {
    forceUpdateMessages = useForceUpdater();
    settings.use(["messageStore", "filterMode", "channelList"]);
}

export function saveMessage(message: LoggedMessage) {
    messageStore[message.id] = message;
    settings.store.messageStore = messageStore;
}

export function getMessage(messageId: string): LoggedMessage | undefined {
    return messageStore[messageId];
}

export function deleteMessage(messageId: string) {
    const message = messageStore[messageId];
    if (message) {
        message.deleted = true;
        message.deletedTimestamp = Date.now();
        settings.store.messageStore = messageStore;
    }
}

export function updateMessage(messageId: string, updates: Partial<LoggedMessage>) {
    const message = messageStore[messageId];
    if (message) {
        Object.assign(message, updates);
        settings.store.messageStore = messageStore;
    }
}

export function removeMessage(messageId: string) {
    delete messageStore[messageId];
    settings.store.messageStore = messageStore;
}

export function clearAllMessages() {
    messageStore = {};
    settings.store.messageStore = messageStore;
}

export function clearChannelMessages(channelId: string) {
    Object.keys(messageStore).forEach(id => {
        if (messageStore[id].channelId === channelId) {
            delete messageStore[id];
        }
    });
    settings.store.messageStore = messageStore;
}

export function getAllMessages(): LoggedMessage[] {
    return Object.values(messageStore);
}

export function getChannelMessages(channelId: string): LoggedMessage[] {
    return Object.values(messageStore).filter(msg => msg.channelId === channelId);
}
