/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { debounce } from "@shared/debounce";
import { Logger } from "@utils/Logger";
import { useForceUpdater } from "@utils/react";

const logger = new Logger("BetterMessageLogger");

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

const DATASTORE_KEY = "BetterMessageLogger_messages";

let forceUpdateMessages: (() => void) | undefined = undefined;
export let messageStore: Record<string, LoggedMessage> = {};

// Debounced save to avoid excessive writes to storage
const debouncedSave = debounce(async () => {
    const messageCount = Object.keys(messageStore).length;
    logger.info(`Saving ${messageCount} messages to DataStore...`);
    await DataStore.set(DATASTORE_KEY, messageStore);
    logger.info("Messages saved successfully");
}, 1000);

export async function init() {
    logger.info("Initializing BetterMessageLogger...");
    messageStore = await DataStore.get<Record<string, LoggedMessage>>(DATASTORE_KEY) ?? {};
    const messageCount = Object.keys(messageStore).length;
    logger.info(`Loaded ${messageCount} messages from DataStore`);
    if (messageCount > 0) {
        logger.info("Sample message IDs:", Object.keys(messageStore).slice(0, 5));
    }
    forceUpdateMessages?.();
}

export function useMessageLogger() {
    forceUpdateMessages = useForceUpdater();
}

export function saveMessage(message: LoggedMessage) {
    logger.info(`Saving message ${message.id} in channel ${message.channelId}`);
    messageStore[message.id] = message;
    logger.info(`Total messages in store: ${Object.keys(messageStore).length}`);
    debouncedSave();
}

export function getMessage(messageId: string): LoggedMessage | undefined {
    const msg = messageStore[messageId];
    logger.info(`Getting message ${messageId}: ${msg ? "found" : "not found"}`);
    return msg;
}

export function deleteMessage(messageId: string) {
    const message = messageStore[messageId];
    if (message) {
        logger.info(`Marking message ${messageId} as deleted`);
        message.deleted = true;
        message.deletedTimestamp = Date.now();
        debouncedSave();
    } else {
        logger.warn(`Tried to delete message ${messageId} but it's not in store`);
    }
}

export function updateMessage(messageId: string, updates: Partial<LoggedMessage>) {
    const message = messageStore[messageId];
    if (message) {
        Object.assign(message, updates);
        debouncedSave();
    }
}

export function removeMessage(messageId: string) {
    delete messageStore[messageId];
    debouncedSave();
}

export async function clearAllMessages() {
    messageStore = {};
    await DataStore.set(DATASTORE_KEY, messageStore);
}

export function clearChannelMessages(channelId: string) {
    // More efficient: filter and reconstruct instead of delete in loop
    messageStore = Object.fromEntries(
        Object.entries(messageStore).filter(([, msg]) => msg.channelId !== channelId)
    );
    debouncedSave();
}

export function getAllMessages(): LoggedMessage[] {
    return Object.values(messageStore);
}

export function getChannelMessages(channelId: string): LoggedMessage[] {
    return Object.values(messageStore).filter(msg => msg.channelId === channelId);
}

export function getDeletedMessages(channelId: string): LoggedMessage[] {
    return Object.values(messageStore).filter(msg => msg.channelId === channelId && msg.deleted);
}
