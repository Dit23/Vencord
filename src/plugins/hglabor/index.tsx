/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./style.css";

import { ApplicationCommandInputType, ApplicationCommandOptionType } from "@api/Commands";
import { Devs } from "@utils/constants";
import { ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { useEffect, useState } from "@webpack/common";

import HGLaborAPI, { HGLaborPlayer } from "./hgLaborAPI/hgLaborAPI";

const HGLabor = ({ rootProps }: { rootProps: ModalProps; }) => {
    const [players, setPlayers] = useState<HGLaborPlayer[]>([]);
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchPlayers = async () => {
            setIsLoading(true);
            const api = new HGLaborAPI();
            const data = await api.getTopPlayers("kills", page);
            setPlayers(data);
            setIsLoading(false);
        };

        fetchPlayers();
    }, [page]);

    const handleNextPage = () => setPage(prev => prev + 1);
    const handlePreviousPage = () => setPage(prev => Math.max(prev - 1, 0));

    return (
        <ModalRoot className="vc-hglabor-ui" {...rootProps}>
            <img src="https://norisk.gg/_app/immutable/assets/norisk_logo_color.DT8vq64y.png" alt="" id="norisk-logo" />
            <div className="pagination-controls">
                <button onClick={handlePreviousPage} disabled={page === 0 || isLoading}>Previous</button>
                <span>Page {page + 1}</span>
                <button onClick={handleNextPage} disabled={isLoading}>Next</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>Player</th>
                        <th>Kills</th>
                        <th>Deaths</th>
                        <th>XP</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={5}>
                                <div className="loading-spinner"></div>
                            </td>
                        </tr>
                    ) : players.length > 0 ? (
                        players.map(player => (
                            <tr key={player.playerId} onClick={() => openModal(props => <HGLaborOfPlayerIDModal rootProps={props} playerId={player.playerId} />)}>
                                <td><img src={player.headSkin} alt="" /></td>
                                <td>{player.playerName}</td>
                                <td>{player.kills}</td>
                                <td>{player.deaths}</td>
                                <td>{player.xp}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5}>No players found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
            <div className="pagination-controls">
                <button onClick={handlePreviousPage} disabled={page === 0 || isLoading}>Previous</button>
                <span>Page {page + 1}</span>
                <button onClick={handleNextPage} disabled={isLoading}>Next</button>
            </div>
        </ModalRoot>
    );
};

const HGLaborOfPlayerIDModal = ({ rootProps, playerId }: { rootProps: ModalProps; playerId: string; }) => {
    const [player, setPlayer] = useState<HGLaborPlayer | null>(null);

    useEffect(() => {
        const api = new HGLaborAPI();
        api.getPlayer(playerId).then(data => {
            setPlayer(data);
        });
    }, [playerId]);

    return (
        <ModalRoot className="vc-user-hglabor-ui" {...rootProps}>
            {player ? (
                <>
                    <img src={player.fullSkin} alt="" />
                    <h1>{player.playerName}</h1>
                    <p>Kills: {player.kills}</p>
                    <p>Deaths: {player.deaths}</p>
                    <p>XP: {player.xp}</p>
                </>
            ) : (
                <p>Loading...</p>
            )}
        </ModalRoot>
    );
};

export default definePlugin({
    name: "hgLabor",
    description: "hgLaborAPI",
    authors: [Devs.Leonlp9],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "hglabor",
            description: "HG Labor API",
            options: [
                {
                    name: "player",
                    description: "Spielername oder UUID",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                }
            ],
            execute: async opts => {
                if (opts.length === 0) {
                    openModal(props => <HGLabor rootProps={props} />);
                } else {
                    const player = opts.find(opt => opt.name === "player")?.value;

                    if (!player) {
                        throw new Error("Der Spielername oder die UUID ist erforderlich.");
                    }

                    const api = new HGLaborAPI();
                    const data = await api.getPlayer(player);
                    openModal(props => <HGLaborOfPlayerIDModal rootProps={props} playerId={data.playerId} />);
                }

            },
        },
    ]
});
