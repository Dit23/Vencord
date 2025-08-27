/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface HGLaborPlayer {
    playerId: string;
    playerName: string;
    headSkin: string;
    fullSkin: string;
    xp: number;
    kills: number;
    deaths: number;
    currentKillStreak: number;
    highestKillStreak: number;
    bounty: number;
    heroes: object;
}

class HGLaborAPI {

    async getPlayer(playerNameOrId: string): Promise<HGLaborPlayer> {

        const playerDB = await fetch(`https://playerdb.co/api/player/minecraft/${playerNameOrId}`).then(response => response.json());
        const playerId = playerDB.data.player.id;

        const response = await (await fetch(`https://api.hglabor.de/stats/ffa/${playerId}`)).json();

        const player = await fetch(`https://playerdb.co/api/player/minecraft/${playerId}`).then(response => response.json());
        response.playerName = player.data.player.username;
        response.headSkin = `https://crafthead.net/helm/${player.data.player.id}`;
        response.fullSkin = `https://starlightskins.lunareclipse.studio/render/dungeons/${player.data.player.id}/full`;

        return response;
    }

    async getTopPlayers(sort: string, page: number): Promise<HGLaborPlayer[]> {
        const response = await (await fetch(`https://api.hglabor.de/stats/ffa/top?sort=${sort}&page=${page + 1}`)).json();

        const promises = response.map((player: HGLaborPlayer) => fetch(`https://playerdb.co/api/player/minecraft/${player.playerId}`));
        const players = await Promise.all(promises).then(responses => Promise.all(responses.map(response => response.json())));

        for (let i = 0; i < players.length; i++) {
            response[i].playerName = players[i].data.player.username;
            response[i].headSkin = `https://crafthead.net/helm/${players[i].data.player.id}`;
            response[i].fullSkin = `https://starlightskins.lunareclipse.studio/render/dungeons/${players[i].data.player.id}/full`;
        }

        return response;
    }

}


export default HGLaborAPI;
