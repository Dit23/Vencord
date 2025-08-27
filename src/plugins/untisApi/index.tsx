/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { ModalProps, ModalRoot, openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { ApplicationAssetUtils, Button, FluxDispatcher, Forms, GuildStore, React, SelectedChannelStore, SelectedGuildStore, UserStore } from "@webpack/common";

import WebUntisAPI from "./api/untisApi";

const useProfileThemeStyle = findByCodeLazy("profileThemeStyle:", "--profile-gradient-primary-color");
const ActivityComponent = findComponentByCodeLazy("onOpenGameProfile");
const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;

async function getApplicationAsset(key: string): Promise<string> {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(key)) return "mp:" + key.replace(/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//, "");
    return (await ApplicationAssetUtils.fetchAssetIds(settings.store.AppID!, [key]))[0];
}


interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state?: string;
    details?: string;
    timestamps?: {
        start?: number;
        end?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: ActivityType;
    url?: string;
    flags: number;
}

const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}

const settings = definePluginSettings({
    showonlyavailable: {
        type: OptionType.BOOLEAN,
        name: "Show only available lessons",
        description: "Wont show lessons that wont happen",
        defaultValue: false
    },
    Key: {
        type: OptionType.STRING,
        name: "Key",
        description: "Your user key (required)",
        defaultValue: "XXXXXXXXXXXXXXXX"
    },
    School: {
        type: OptionType.STRING,
        name: "School",
        description: "Your school name (required)",
        defaultValue: "your-school"
    },
    UntisUsername: {

        type: OptionType.STRING,
        name: "Username for untis",
        description: "Its your untis username",
        defaultValue: "your-username"
    },
    Untisver: {
        type: OptionType.STRING,
        name: "Untis Server",
        description: "Your untis server ONLY USE THE SUBDOMAIN",
        defaultValue: "arche",
        default: "arche"
    },
    UntisType: {
        type: OptionType.SELECT,
        description: "What time table do you want to use",
        options: [
            {
                label: "Student",
                value: "STUDENT",
                default: true
            },
            {
                label: "Class",
                value: "CLASS"
            },
            {
                label: "Room",
                value: "ROOM"
            }
        ]
    },
    AppID: {
        type: OptionType.STRING,
        name: "App ID",
        description: "Your Discord Bot application ID (required for Discord RPC)",
        defaultValue: "",
        onChange: onChange
    },
    EnableDiscordRPC: {
        type: OptionType.BOOLEAN,
        name: "Enable Discord RPC",
        description: "Show your current lesson for others on Discord in the Rich Presence",
        defaultValue: true,
        default: true,
        onChange: onChange
    },
    type: {
        type: OptionType.SELECT,
        description: "Activity type",
        onChange: onChange,
        options: [
            {
                label: "Playing",
                value: ActivityType.PLAYING
            },
            {
                label: "Streaming",
                value: ActivityType.STREAMING
            },
            {
                label: "Listening",
                value: ActivityType.LISTENING,
                default: true
            },
            {
                label: "Watching",
                value: ActivityType.WATCHING
            },
            {
                label: "Competing",
                value: ActivityType.COMPETING
            }
        ]
    },
    Name: {
        type: OptionType.STRING,
        name: "Name",
        defaultValue: "{lesson}",
        default: "{lesson}",
        description: "The name of the activity (supports placeholders)",
        onChange: onChange
    },
    Description: {
        type: OptionType.STRING,
        name: "Description",
        defaultValue: "In room {room}",
        default: "{room}",
        description: "The description of the activity (supports placeholders)",
        onChange: onChange
    }
});

function onChange() {
    dispatchActivityUpdate();
}

async function createActivity(): Promise<Activity | undefined> {
    if (!settings.store.EnableDiscordRPC) {
        return undefined;
    }

    if (!settings.store.AppID) {
        return undefined;
    }

    if (!settings.store.Name) {
        return undefined;
    }

    const untis = new WebUntisAPI(
        settings.store.School || "defaultSchool",
        settings.store.UntisUsername || "defaultUsername",
        settings.store.Key || "defaultKey",
        settings.store.Untisver || "arche",
        settings.store.UntisType || "STUDENT"
    );

    try {
        await untis.setUp();
    } catch (error) {
        console.error("Error setting up Untis:", error);
        return undefined;
    }

    const currentLesson = await untis.getCurrentLesson();

    if (!currentLesson) {
        return undefined;
    }

    return {
        application_id: settings.store.AppID || "",
        flags: 1,
        name: settings.store.Name?.replace("{lesson}", currentLesson.subjects?.[0]?.name || "Unknown Lesson")
            .replace("{lesson_long}", currentLesson.subjects?.[0]?.longName || "Unknown Lesson")
            .replace("{room}", currentLesson.rooms?.[0]?.name || "Unknown Room")
            .replace("{room_long}", currentLesson.rooms?.[0]?.longName || "Unknown Room")
            || "Unknown Activity",
        details: settings.store.Description?.replace("{lesson}", currentLesson.subjects?.[0]?.name || "Unknown Lesson")
            .replace("{lesson_long}", currentLesson.subjects?.[0]?.longName || "Unknown Lesson")
            .replace("{room}", currentLesson.rooms?.[0]?.name || "Unknown Room")
            .replace("{room_long}", currentLesson.rooms?.[0]?.longName || "Unknown Room")
            || "Unknown Activity",
        type: settings.store.type,
        timestamps: {
            start: new Date(currentLesson.startDateTime).getTime() - 3600000,
            end: new Date(currentLesson.endDateTime).getTime() - 3600000
        },
        assets: {
            large_image: await getApplicationAsset("https://play-lh.googleusercontent.com/6lUhld8gFhB0_b-lpce_crw-gdH70lDnXot5ckVmOFMh91jag56whanU-Q30nLt68sr5=w240-h480-rw"),
            large_text: undefined,
        }
    };
}


async function dispatchActivityUpdate() {

    try {
        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: await createActivity(),
            socketId: "UntisAPI",
        });
    } catch (error) {
        console.error("Error fetching timetable:", error);
    }
}

const scheduleNextUpdate = () => {
    const now = new Date();
    const delay = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    setTimeout(() => {
        dispatchActivityUpdate();
        scheduleNextUpdate();
    }, delay);
};
scheduleNextUpdate();

const handleButtonClick = async () => {
    openModal(props => <UntisModalContent rootProps={props} />);
};

const UntisButton = () => (
    <Button
        onClick={handleButtonClick}
        size={Button.Sizes.MIN}
        color={Button.Colors.CUSTOM}
        className="vc-untis-button"
    >
        <div className="vc-untis-button-content">
            <svg className="untis-button" viewBox="0 0 24 24" fill="currentColor">
                <path fill="currentColor" className="st0" d="M12,0C5.37,0,0,5.37,0,12s5.37,12,12,12,12-5.37,12-12S18.63,0,12,0ZM1.53,12.33v-.67h3.89v.67H1.53ZM4.83,19.64l-.47-.47,2.75-2.75.47.47-2.75,2.75ZM7.11,7.58l-2.75-2.75.47-.47,2.75,2.75-.47.47ZM12.33,22.47h-.67v-3.89h.67v3.89ZM19.17,19.64l-2.75-2.75.47-.47,2.75,2.75-.47.47ZM11,12V2.53c.39-.39.61-.61,1-1,.39.39.61.61,1,1v6.05l4.8-4.8h1.42v1.42l-4.8,4.8h7.05c.39.39.61.61,1,1-.39.39-.61.61-1,1h-10.47Z" />
            </svg>
        </div>
    </Button>
);

const UntisModalContent = ({ rootProps }: { rootProps: ModalProps; }) => {
    const [timeGrid, setTimeGrid] = React.useState<any>(null);
    const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().split("T")[0]);
    const [timeTable, setTimeTable] = React.useState<any>(null);

    const untis = new WebUntisAPI(
        settings.store.School || "defaultSchool",
        settings.store.UntisUsername || "defaultUsername",
        settings.store.Key || "defaultKey",
        settings.store.Untisver || "arche",
        settings.store.UntisType || "STUDENT"
    );

    const getMonday = (date: Date) => {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(date.setDate(diff));
    };
    const getFriday = (date: Date) => {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? 6 : 5); // adjust when day is sunday
        return new Date(date.setDate(diff));
    };

    React.useEffect(() => {
        const fetchTimetable = async () => {
            try {
                await untis.setUp();

                const timegrid = untis.getFullUntisIdData().masterData.timeGrid;

                timegrid.days = timegrid.days.filter((day: any) => day.day !== "SAT" && day.day !== "SUN");

                timegrid.days.forEach((day: any) => {
                    day.units = day.units.reduce((mergedUnits: any[], unit: any) => {
                        const lastUnit = mergedUnits[mergedUnits.length - 1];
                        if (lastUnit && lastUnit.endTime === unit.startTime) {
                            lastUnit.endTime = unit.endTime;
                            lastUnit.isMerged = true;
                        } else {
                            mergedUnits.push(unit);
                        }
                        return mergedUnits;
                    }, []);
                });

                setTimeGrid(timegrid);

            } catch (error) {
                console.error("Error fetching timetable:", error);
            }
        };

        fetchTimetable();
    }, [selectedDate]);

    const monday = getMonday(new Date(selectedDate));
    const friday = getFriday(new Date(selectedDate));
    const weekDates = Array.from({ length: 5 }, (_, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    });

    // function to get the period by the start time Periods for start time: T16:30 on date: 31.03.2025 are: undefined
    const getPeriodsByStartTime = (startTime: string, date: string) => {

        if (!timeTable) {
            console.error("No timetable data available");
            return [];
        }

        const periods = timeTable?.periods.filter((period: any) => {
            const periodStartTime = new Date(period.startDateTime).toISOString().split("T")[1].substring(0, 5);
            const periodDate = new Date(period.startDateTime).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

            startTime = startTime.replace("T", "");

            return periodStartTime === startTime && periodDate === date;
        });

        return periods;
    };

    React.useEffect(() => {
        const fetchTimetable = async () => {
            try {
                await untis.setUp();

                const timetableData = await untis.getTimetable({
                    id: 1,
                    type: settings.store.UntisType as "STUDENT" | "CLASS" | "ROOM",
                    startDate: monday.toISOString().split("T")[0],
                    endDate: friday.toISOString().split("T")[0]
                });

                /* displayableEndDate
                :
                "2025-04-04"
                displayableStartDate
                :
                "2025-03-31"
                periods
                :
                Array(30)
                0
                :
                {id: 3953842, lessonId: 140775, startDateTime: '2025-03-31T09:15Z', endDateTime: '2025-03-31T10:00Z', foreColor: '#000000', …} */

                // merge units
                timetableData.periods = timetableData.periods.reduce((mergedPeriods: any[], period: any) => {
                    const lastPeriod = mergedPeriods[mergedPeriods.length - 1];
                    if (lastPeriod && lastPeriod.endDateTime === period.startDateTime) {
                        lastPeriod.endDateTime = period.endDateTime;
                        lastPeriod.isMerged = true;
                    } else {
                        mergedPeriods.push(period);
                    }
                    return mergedPeriods;
                }, []);

                console.log("Timetable data:", timetableData);

                setTimeTable(timetableData);

            } catch (error) {
                console.error("Error fetching timetable:", error);
            }
        };

        fetchTimetable();
    }, [selectedDate]);

    return (
        <ModalRoot {...rootProps} className="vc-untis-modal">
            <nav>
                <button className="vc-untis-modal-button" onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() - 7);
                    setSelectedDate(newDate.toISOString().split("T")[0]);
                }}>
                    Vorherige Woche
                </button>

                <input type="date" className="vc-untis-modal-input" value={selectedDate} onChange={e => {
                    const newDate = new Date(e.target.value);
                    setSelectedDate(newDate.toISOString().split("T")[0]);
                }} />

                <button className="vc-untis-modal-button" onClick={() => {
                    const newDate = new Date();
                    setSelectedDate(newDate.toISOString().split("T")[0]);
                }}>
                    Heute
                </button>

                <button className="vc-untis-modal-button" onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() + 7);
                    setSelectedDate(newDate.toISOString().split("T")[0]);
                }}>
                    Nächste Woche
                </button>
            </nav>
            <table className="vc-untis-modal-grid">
                <thead>
                    <tr>
                        <th>Time</th>
                        {timeGrid && timeGrid.days.map((day: any, index: number) => (
                            <th key={day.day}>
                                {day.day} ({weekDates[index]})
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {timeGrid && timeGrid.days.length > 0 && timeGrid.days[0].units.map((unit: any, index: number) => (
                        <tr key={unit.start}>
                            <td>{unit.startTime.replace(/^T/, "")} - {unit.endTime.replace(/^T/, "")}</td>
                            {timeGrid.days.map((day: any, dayIndex: number) => {
                                const dateForDay = weekDates[dayIndex]; // Datum für den aktuellen Tag
                                const periods = getPeriodsByStartTime(unit.startTime, dateForDay); // Hole die Perioden für die Startzeit und das Datum

                                return (
                                    <td key={`${day.day}-${index}`}>
                                        {periods && periods.length > 0 ? (
                                            <div
                                                className={`vc-untis-modal-periods ${new Date(periods[0].endDateTime).getTime() - 1000 * 60 * 60 * 2 < Date.now()
                                                    ? "vc-untis-modal-periods-past"
                                                    : new Date(periods[0].startDateTime).getTime() - 1000 * 60 * 60 * 2 <= Date.now() &&
                                                        new Date(periods[0].endDateTime).getTime() - 1000 * 60 * 60 * 2 > Date.now()
                                                        ? "vc-untis-modal-periods-current"
                                                        : ""
                                                    }`}
                                            >
                                                {periods.map((period: any) => (
                                                    <div key={period.id} className={`vc-untis-modal-period ${period.is}`}
                                                        style={{
                                                            backgroundColor: `color-mix(in srgb, ${period.subjects?.[0]?.backColor || period.backColor || "transparent"} 40%, transparent)`,
                                                            color: period.subjects?.[0]?.foreColor || period.foreColor || undefined
                                                        }}
                                                        onClick={() => openSingleLessonModal(period)}>
                                                        <p title={period.subjects.map((subject: any) => subject.longName || subject.name || "Unknown Subject").join(", ")}>
                                                            {period.subjects.map((subject: any) => subject.name || "Unknown Subject").join(", ")}
                                                        </p>
                                                        <p title={period.rooms.map((room: any) => room.longName || room.name || "Unknown Room").join(", ")}>
                                                            {period.rooms.map((room: any) => room.name || "Unknown Room").join(", ")}
                                                        </p>
                                                        <p title={period.teachers.map((teacher: any) => teacher.longName || teacher.name || "Unknown Teacher").join(", ")}>
                                                            {period.teachers.map((teacher: any) => teacher.name || "Unknown Teacher").join(", ")}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </ModalRoot>
    );
};

const SingleLessonModalContent = ({ rootProps, period }: { rootProps: ModalProps; period: any; }) => {
    return (
        <ModalRoot {...rootProps} className={`vc-untis-single-lesson-modal ${period.is}`}>
            <h2>{period.subjects[0].name} ({period.subjects[0].longName})</h2>
            <p><b>Teacher:</b> {period.teachers.map((teacher: any) => `${teacher.name} (${teacher.longName})`).join(", ")}</p>
            <p><b>Room:</b> {period.rooms.map((room: any) => `${room.name} (${room.longName})`).join(", ")}</p>
            <p><b>Class:</b> {period.classes.map((class_: any) => (
                <span key={class_.id} title={class_.longName}>{class_.name}</span>
            )).reduce((prev, curr) => [prev, ", ", curr])}</p>
            <p><b>Is:</b> {period.is[0]}</p>

            {period.text.lesson && (
                <div className="vc-untis-single-lesson-text">
                    <h3>Lesson</h3>
                    <p>{period.text.lesson}</p>
                </div>
            )}

            {period.text.substitution && (
                <div className="vc-untis-single-lesson-text">
                    <h3>Substitution</h3>
                    <p>{period.text.substitution}</p>
                </div>
            )}

            {period.text.info && (
                <div className="vc-untis-single-lesson-text">
                    <h3>Info</h3>
                    <p>{period.text.info}</p>
                </div>
            )}

            {period.homeWorks
                .filter((homework: any) => homework.endDate === period.startDateTime.split("T")[0])
                .length > 0 && (
                    <div className="vc-untis-single-lesson-homework">
                        <h3>Homeworks</h3>
                        {period.homeWorks
                            .filter((homework: any) => homework.endDate === period.startDateTime.split("T")[0])
                            .map((homework: any) => (
                                <div key={homework.id}>
                                    <p>{homework.text}</p>
                                </div>
                            ))}
                    </div>
                )}
        </ModalRoot>
    );
};

function openSingleLessonModal(period: any) {
    openModal(props => <SingleLessonModalContent rootProps={props} period={period} />);
}


export default definePlugin({
    name: "UntisAPI",
    description: "Adds a button to show your timetable from Untis. You can also enable Discord RPC to show your current lesson to others.",
    authors: [Devs.Leonlp9, Devs.minikomo],
    settings,
    dependencies: ["ServerListAPI"],

    renderUntisButton: UntisButton,

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderUntisButton);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderUntisButton);
        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: null,
            socketId: "UntisAPI",
        });
    },

    settingsAboutComponent: () => {
        const activity = useAwaiter(createActivity);
        const { profileThemeStyle } = useProfileThemeStyle({});

        return (
            <>
                <Forms.FormDivider className={Margins.top8 + " " + Margins.bottom8} />

                <Forms.FormText>
                    <h2 style={{ fontWeight: "bold", fontSize: "18px" }} className={Margins.bottom8}>Untis API</h2>

                    <h3 style={{ fontWeight: "bold", fontSize: "16px" }} className={Margins.bottom8}>How to get "Key", "School", "Username" and "Untis Server":</h3>
                    Log in to your Untis account and open your profile at the bottom left. There, switch to "Freigaben" and click on "Anzeigen". You will now see all the data you need.
                    <img src="https://github.com/Leonlp9/Vencord/blob/main/src/plugins/untisApi/Anleitung.png?raw=true" alt="" style={{ width: "100%", marginTop: "8px", borderRadius: "8px" }} />
                </Forms.FormText>

                <Forms.FormDivider className={Margins.top8 + " " + Margins.bottom8} />

                <Forms.FormText>
                    <h2 style={{ fontWeight: "bold", fontSize: "18px" }} className={Margins.bottom16}>Discord RPC</h2>

                    <h3 style={{ fontWeight: "bold", fontSize: "16px" }} className={Margins.bottom8}>How to get "App ID":</h3>
                    Go to <Link href="https://discord.com/developers/applications">Discord Developer Portal</Link> to create an application and get the application ID.

                    <h3 style={{ fontWeight: "bold", fontSize: "16px" }} className={Margins.top20}>Rich Presence Placeholders:</h3>
                    <p>Use these placeholders in the "Name" and "Description" settings to display dynamic information:</p>
                    <ul>
                        <li>{"{lesson}"} - The name of the lesson</li>
                        <li>{"{lesson_long}"} - The long name of the lesson</li>
                        <li>{"{room}"} - The name of the room</li>
                        <li>{"{room_long}"} - The long name of the room</li>
                    </ul>
                </Forms.FormText>

                <Forms.FormDivider className={Margins.top8} />

                {activity[0] && (
                    <div style={{ width: "284px", ...profileThemeStyle, padding: 8, marginTop: 8, borderRadius: 8, background: "var(--bg-mod-faint)" }}>
                        <ActivityComponent activity={activity[0]} channelId={SelectedChannelStore.getChannelId()}
                            guild={GuildStore.getGuild(SelectedGuildStore.getLastSelectedGuildId())}
                            application={{ id: settings.store.AppID || "" }}
                            user={UserStore.getCurrentUser()} className={"untisActivitySettings"} />
                    </div>
                ) ||
                    <div style={{ width: "284px", ...profileThemeStyle, padding: 8, marginTop: 8, borderRadius: 8, background: "var(--bg-mod-faint)" }}>
                        <div style={{ color: "var(--text-normal)" }}>You are not in a lesson right now.</div>
                    </div>
                }

            </>
        );
    }
});
