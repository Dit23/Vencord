/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { generateTOTP } from "./otp";
const proxyUrl = "";

import Getter from "./Getter";
import { _Class, _Room, _Subject, _Teacher, periodArray, userApiData } from "./interfaces";


class WebUntisAPI {
    private school: string;
    private user: string;
    private userID: number | undefined;
    private userFullName: string | undefined;
    private classID: number[] | undefined;
    private schoolName: string | undefined;
    private secretKey: string;
    private authToken: string | null = null;
    private untisver: string = "arche";
    private fullUntisIdData!: userApiData;
    private typeuseage: string;



    constructor(school: string, user: string, secretKey: string, untisver: string = "defaultVersion", typeuseage: string = "", classroomid: number[] | undefined = undefined) {
        this.school = school;
        this.user = user;
        this.secretKey = secretKey;
        this.typeuseage = typeuseage;
        this.untisver = untisver;
        this.classID = [];

    }
    public async getCurrentLesson() {
        const timetable = await this.getTimetable({});
        const { periods } = timetable;

        let filtered = periods.sort((a, b) => {
            const startDateA = new Date(a.startDateTime);
            const startDateB = new Date(b.startDateTime);

            if (startDateA < startDateB) return -1;
            if (startDateA > startDateB) return 1;
            return 0;
        });

        filtered = filtered.filter(element => !element.is.includes("CANCELLED"));

        // Merge lessons together if end time is equal to start time of next lesson and they have the same elements
        for (let i = 0; i < filtered.length - 1; i++) {
            const current = filtered[i];
            const next = filtered[i + 1];

            if (current.endDateTime === next.startDateTime && current.elements.length === next.elements.length) {
                let equal = true;
                for (let j = 0; j < current.elements.length; j++) {
                    if (current.elements[j].id !== next.elements[j].id) {
                        equal = false;
                        break;
                    }
                }

                if (equal) {
                    current.endDateTime = next.endDateTime;
                    filtered.splice(i + 1, 1);
                    i--;
                }
            }
        }

        const mergedPeriods = filtered;

        const now = Date.now() + 3600000; // Add 1 hour (3600000 milliseconds)

        for (let i = 0; i < mergedPeriods.length; i++) {
            const period = mergedPeriods[i];
            const start = new Date(period.startDateTime).getTime();
            const end = new Date(period.endDateTime).getTime();

            if (start <= now && end >= now) {
                return period;
            }
        }
    }





    public async setUp() {
        await this.authenticate();
        await this.cacheIdsToNames();


        this.userID = this.fullUntisIdData.userData.elemId;

        this.classID = this.fullUntisIdData.userData.klassenIds;
        this.userFullName = this.fullUntisIdData.userData.displayName;
        this.schoolName = this.fullUntisIdData.userData.schoolName;
    }
    private async renameArray(liste: periodArray) {
        var temp = new Getter(this.fullUntisIdData);
        var returnliste = liste;


        returnliste.periods.forEach(period => {
            period.subjects = [] as _Subject[];
            period.teachers = [] as _Teacher[];
            period.classes = [] as _Class[];
            period.rooms = [] as _Room[];
            period.startDateTimeUnix = new Date(period.startDateTime).getTime();
            period.endDateTimeUnix = new Date(period.endDateTime).getTime();



            period.elements.forEach(element2 => {

                if (element2.type === "SUBJECT") {

                    const tempSubject: _Subject = {
                        type: "SUBJECT",
                        id: element2.id,
                        orgId: element2.orgId,
                        name: temp.getSubjectNameFromID(element2.id),
                        longName: temp.getSubjectLongNameFromID(element2.id),
                        foreColor: temp.getforeColorCodeFromID(element2.id),
                        backColor: temp.getbackColorCodeFromID(element2.id)
                    };
                    period.subjects?.push(tempSubject);
                }

                if (element2.type === "TEACHER") {
                    const tempTeacher: _Teacher = {
                        type: "TEACHER",
                        id: element2.id,
                        orgId: element2.orgId,
                        name: temp.getTeacherNameFromID(element2.id),
                        longName: temp.getTeacherFullNameFromID(element2.id)
                    };
                    period.teachers?.push(tempTeacher);
                }

                if (element2.type === "CLASS") {
                    const tempClass: _Class = {
                        type: "CLASS",
                        id: element2.id,
                        orgId: element2.orgId,
                        name: temp.getClassNameFromID(element2.id),
                        longName: temp.getClassLongNameFromID(element2.id)
                    };
                    period.classes?.push(tempClass);
                }

                if (element2.type === "ROOM") {
                    const tempRoom: _Room = {
                        type: "ROOM",
                        id: element2.id,
                        orgId: element2.orgId,
                        name: temp.getRoomNameFromID(element2.id),
                        longName: temp.getRoomLongNameFromID(element2.id)
                    };
                    period.rooms?.push(tempRoom);
                }


            });

        });
        return returnliste;
    }

    private async cacheIdsToNames() {


        const timetableParams = {

            masterDataTimestamp: 1724834423826,
            type: this.typeuseage,
            startDate: this.getCurrentMonday() || this.getCurrentMonday(),
            endDate: this.getCurrentFriday() || this.getCurrentFriday(),
            auth: {
                user: this.user,
                otp: await generateTOTP(this.secretKey),
                clientTime: Date.now(),
            },
            deviceOs: "IOS",
            deviceOsVersion: "18.0"
        };


        const data = await this.fetchFromAPI(`https://${this.untisver}.webuntis.com/WebUntis/jsonrpc_intern.do?a=0&m=getUserData2017&s=${this.untisver}.webuntis.com&school=${this.school}&v=i3.45.1`,
            "getUserData2017",
            timetableParams
        );
        this.fullUntisIdData = data;

    }

    private async fetchFromAPI(endpoint: string, method: string, params: any) {
        const baseJson = {
            jsonrpc: "2.0",
            id: "UntisMobileiOS",
            method,
            params: [params],
        };

        // console.log("Sending API request:", baseJson);

        const response = await fetch(proxyUrl + endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify(baseJson),
        });




        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || "Unknown API error");
        }
        // console.log("API response:", data);


        return data.result;
    }

    private async authenticate() {
        const otp = await generateTOTP(this.secretKey);
        const authParams = {
            user: this.user,
            otp,
            clientTime: Date.now(),
        };

        const result = await this.fetchFromAPI(
            `https://${this.untisver}.webuntis.com/WebUntis/jsonrpc_intern.do?a=0&m=getAuthToken&s=${this.untisver}.webuntis.com&school=${this.school}&v=i3.45.1`,
            "getAuthToken",
            { auth: authParams }
        );



        this.authToken = result.token;
        // console.log("Authentication successful. Token:", this.authToken);
    }

    private async ensureAuthenticated() {
        if (!this.authToken) {
            await this.authenticate();
        }
    }



    public async getTimetable(params: {
        id?: number;
        type?: "STUDENT" | "CLASS" | "ROOM";
        startDate?: string;
        endDate?: string;

    }) {
        await this.ensureAuthenticated();


        const { id, type, startDate, endDate } = params;
        const timetableParams = {
            masterDataTimestamp: 1724834423826,
            id: this.typeuseage === "STUDENT" ? this.userID : this.classID?.[0] ?? 0,
            type: this.typeuseage,
            startDate: startDate || this.getCurrentMonday(),
            endDate: endDate || this.getCurrentFriday(),
            auth: {
                user: this.user,
                otp: await generateTOTP(this.secretKey),
                clientTime: Date.now(),
            }


        };

        const result = await this.fetchFromAPI(
            `https://${this.untisver}.webuntis.com/WebUntis/jsonrpc_intern.do?a=0&m=getTimetable2017&s=${this.untisver}.webuntis.com&school=${this.school}&v=i3.45.1`,
            "getTimetable2017",
            timetableParams
        );

        const renamedArray = await this.renameArray(result.timetable as periodArray) as periodArray;
        renamedArray.periods.sort((a, b) => a.startDateTimeUnix! - b.startDateTimeUnix!);
        return renamedArray;
    }

    public getCurrentMonday(): string {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
        return new Date(today.setDate(diff)).toISOString().split("T")[0];
    }

    public getCurrentFriday(): string {
        const monday = new Date(this.getCurrentMonday());
        return new Date(monday.setDate(monday.getDate() + 5)).toISOString().split("T")[0];
    }

    public getCurrentCalendarWeek(): number {
        const today = new Date();
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        const pastDaysOfYear = (today.getTime() - firstDayOfYear.getTime()) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }


    public getMondayOfCalendarWeek(week: number, year: number): string {
        const date = new Date(year, 0, 1 + (week - 1) * 7);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
        return new Date(date.setDate(diff)).toISOString().split("T")[0];
    }

    public getFridayOfCalendarWeek(week: number, year: number): string {
        const monday = new Date(this.getMondayOfCalendarWeek(week, year));
        return new Date(monday.setDate(monday.getDate() + 5)).toISOString().split("T")[0];
    }

    // get FullUntisIdData
    public getFullUntisIdData(): userApiData {
        return this.fullUntisIdData;
    }
}

export default WebUntisAPI;
