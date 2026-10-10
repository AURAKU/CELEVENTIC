import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  celebrationDayGroups,
  celebrationMomentsFromProgramme,
  programmeMapUrl,
} from "@/lib/invitation/celebration-days";

const EDWIN = [
  {
    id: "traditional",
    time: "THU 24 DEC · 9:00 AM",
    title: "Traditional Ceremony",
    description: "Bride’s house, Tema Community 12",
  },
  {
    id: "white",
    time: "SAT 26 DEC · 9:00 AM",
    title: "White Wedding, Church Ceremony",
    description: "Assemblies of God Tema Community 12 TCC",
  },
  {
    id: "reception",
    time: "SAT 26 DEC · 3:00 PM",
    title: "Reception",
    description: "Combos & Casa, East Legon Hills",
  },
  {
    id: "menu",
    time: "RECEPTION",
    title: "Wedding Menu",
    description: "STARTERS\nBeef spring rolls",
  },
];

describe("celebration days", () => {
  it("keeps each dated programme line and drops the menu label", () => {
    const moments = celebrationMomentsFromProgramme(EDWIN, 2026, "2026-12-24T09:00:00.000Z");
    assert.deepEqual(
      moments.map((moment) => [moment.weekday, moment.day, moment.timeLabel, moment.place]),
      [
        ["Thursday", 24, "9:00 AM", "Bride’s house, Tema Community 12"],
        ["Saturday", 26, "9:00 AM", "Assemblies of God Tema Community 12 TCC"],
        ["Saturday", 26, "3:00 PM", "Combos & Casa, East Legon Hills"],
      ]
    );
    assert.equal(moments[0]?.startIso, "2026-12-24T09:00:00.000Z");
    assert.equal(moments[1]?.startIso, "2026-12-26T09:00:00.000Z");
    assert.equal(moments[2]?.startIso, "2026-12-26T15:00:00.000Z");
    assert.equal(moments[1]?.endIso, moments[2]?.startIso);
  });

  it("groups Saturday’s two celebrations under one day", () => {
    const days = celebrationDayGroups(
      celebrationMomentsFromProgramme(EDWIN, 2026, "2026-12-24T09:00:00.000Z")
    );
    assert.equal(days.length, 2);
    assert.equal(days[1]?.moments.length, 2);
    assert.equal(days[0]?.month, "December");
  });

  it("leaves a single-day clock programme on the original date plate", () => {
    const moments = celebrationMomentsFromProgramme(
      [{ id: "ceremony", time: "2:00 PM", title: "Wedding Ceremony" }],
      2026
    );
    assert.equal(celebrationDayGroups(moments).length, 0);
  });

  it("gives the church and the reception their own map links", () => {
    const church =
      "https://www.google.com/maps/place/Assemblies+of+God+Ghana+Tema+Christian+Centre/@5.670683,-0.03132,17z";
    const reception = "https://www.google.com/maps/place/Combos+%26+Casa/@5.706804,-0.11083,17z";
    const venue = "ASSEMBLIES OF GOD TEMA COMMUNITY 12 TCC";
    assert.equal(
      programmeMapUrl(undefined, "Bride’s house, Tema Community 12", venue, church),
      ""
    );
    const house =
      "https://www.google.com/maps/place/Bride's+house,+Tema+Community+12/@5.669508,-0.033181,17z";
    assert.equal(
      programmeMapUrl({ mapUrl: house }, "Bride’s house, Tema Community 12", venue, church),
      house
    );
    assert.equal(
      programmeMapUrl(undefined, "Assemblies of God Tema Community 12 TCC", venue, church),
      church
    );
    assert.equal(
      programmeMapUrl({ mapUrl: reception }, "Combos & Casa, East Legon Hills", venue, church),
      reception
    );
  });
});
