import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  assignedDatesFromShiftPhases,
  crewShiftAssignmentKey,
  filterShiftSelectionsToSchedule,
  scheduledShiftKeys,
  type CrewShiftPhaseKey,
  type CrewShiftTime,
  type CrewShiftTimeMap,
} from "../lib/crewShiftAssignments";
import type { CrewMember } from "../lib/crew";

const PHASES = [
  { key: "setup", label: "Setup" },
  { key: "rehearsal", label: "Rehearsal" },
  { key: "show", label: "Show" },
  { key: "downrig", label: "Load Out" },
] as const;

type ShiftMode = "full" | "four" | "custom";
type ShiftTaskMap = Record<string, string[]>;

const ROLE_TASKS: Record<string, string[]> = {
  "Video / LED": ["Wall Assembly", "Signal Patch", "Processor Config"],
  Rigging: ["Motor Hang", "Truss Assembly"],
  Lighting: ["Fixtures Hang", "Patching", "FOH Op"],
  "Lighting FOH": ["Fixtures Hang", "Patching", "FOH Op"],
  Sound: ["PA Deployment", "Signal Patch", "FOH Op"],
  "AV FOH": ["Signal Patch", "Playback", "FOH Op"],
  "System Tech": ["System Config", "Signal Patch", "Troubleshooting"],
};

type Props = {
  crew: CrewMember;
  phaseDays: Partial<Record<CrewShiftPhaseKey, ReadonlyArray<string>>>;
  phaseShiftTimes?: CrewShiftTimeMap;
  rolePeers: ReadonlyArray<CrewMember>;
  onSave: (
    dates: ReadonlyArray<string>,
    shiftPhases: ReadonlyArray<string>,
    shiftTimes: CrewShiftTimeMap,
    shiftTasks: ShiftTaskMap,
  ) => void;
  onApplyToRole: (
    shiftPhases: ReadonlyArray<string>,
    shiftTimes: CrewShiftTimeMap,
    shiftTasks: ShiftTaskMap,
  ) => void;
};

function minutes(time: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [hours, mins] = time.split(":").map(Number);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}

function addHours(time: string, hours: number): string {
  const start = minutes(time);
  if (start == null) return "";
  const value = (start + hours * 60) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function durationHours(time?: CrewShiftTime): number {
  if (!time || time.timeTbd) return 0;
  const start = minutes(time.startTime);
  const end = minutes(time.endTime);
  if (start == null || end == null) return 0;
  return ((end - start + 1440) % 1440 || 1440) / 60;
}

function inferredMode(
  selected: boolean,
  value: CrewShiftTime | undefined,
  standard: CrewShiftTime | undefined,
): ShiftMode | undefined {
  if (!selected) return undefined;
  if (
    value &&
    standard &&
    value.startTime === standard.startTime &&
    value.endTime === standard.endTime
  ) return "full";
  if (
    value &&
    value.endTime === addHours(value.startTime, 4)
  ) return "four";
  return "custom";
}

export function AssignShiftsModal({
  crew,
  phaseDays,
  phaseShiftTimes = {},
  rolePeers,
  onSave,
  onApplyToRole,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [times, setTimes] = useState<CrewShiftTimeMap>({});
  const [tasks, setTasks] = useState<ShiftTaskMap>({});
  const [customTasks, setCustomTasks] = useState<Record<string, string>>({});
  const [modes, setModes] = useState<Record<string, ShiftMode | undefined>>({});
  const availableKeys = useMemo(
    () => new Set(scheduledShiftKeys(phaseDays)),
    [phaseDays],
  );
  const days = useMemo(
    () => assignedDatesFromShiftPhases(availableKeys),
    [availableKeys],
  );
  const [focusDate, setFocusDate] = useState(days[0] ?? "");

  const openModal = () => {
    const selections = filterShiftSelectionsToSchedule(
      crew.assignedShiftPhases ??
        (crew.assignedDates ?? []).flatMap((date) =>
          PHASES.filter((phase) => phaseDays[phase.key]?.includes(date))
            .map((phase) => crewShiftAssignmentKey(date, phase.key)),
        ),
      availableKeys,
    );
    const initialTimes: CrewShiftTimeMap = {};
    const initialModes: Record<string, ShiftMode | undefined> = {};
    for (const key of availableKeys) {
      const value = crew.assignedShiftTimes?.[key] ?? phaseShiftTimes[key];
      if (value) initialTimes[key] = { ...value };
      initialModes[key] = inferredMode(
        selections.has(key),
        value,
        phaseShiftTimes[key],
      );
    }
    setDraft(selections);
    setTimes(initialTimes);
    setTasks(
      Object.fromEntries(
        Object.entries(crew.assignedShiftTasks ?? {}).map(([key, values]) => [
          key,
          [...values],
        ]),
      ),
    );
    setCustomTasks({});
    setModes(initialModes);
    setFocusDate(days[0] ?? "");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  const setPreset = (
    key: string,
    mode: ShiftMode | "clear",
    standard?: CrewShiftTime,
  ) => {
    if (
      (mode === "full" || mode === "four") &&
      (!standard || standard.timeTbd || minutes(standard.startTime) == null)
    ) {
      return;
    }
    setDraft((current) => {
      const next = new Set(current);
      if (mode === "clear") next.delete(key);
      else next.add(key);
      return next;
    });
    if (mode === "clear") {
      setModes((current) => ({ ...current, [key]: undefined }));
      setTimes((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setTasks((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return;
    }
    const start = standard?.startTime || crew.callTime || "08:00";
    const nextTime =
      mode === "four"
        ? { startTime: start, endTime: addHours(start, 4) }
        : mode === "full"
          ? { startTime: start, endTime: standard?.endTime || crew.offTime || addHours(start, 8) }
          : times[key] ?? {
              startTime: start,
              endTime: standard?.endTime || crew.offTime || addHours(start, 8),
            };
    setTimes((current) => ({ ...current, [key]: nextTime }));
    setModes((current) => ({ ...current, [key]: mode }));
  };

  const updateCustomTime = (key: string, side: "startTime" | "endTime", value: string) => {
    setTimes((current) => ({
      ...current,
      [key]: {
        startTime: current[key]?.startTime ?? "",
        endTime: current[key]?.endTime ?? "",
        [side]: value,
      },
    }));
  };

  const selectedTimes = useMemo(() => {
    const result: CrewShiftTimeMap = {};
    for (const key of draft) {
      if (times[key]) result[key] = { ...times[key] };
    }
    return result;
  }, [draft, times]);

  const selectedTasks = useMemo(
    () =>
      Object.fromEntries(
        [...draft].flatMap((key) =>
          tasks[key]?.length ? [[key, [...tasks[key]]]] : [],
        ),
      ),
    [draft, tasks],
  );

  const toggleTask = (key: string, task: string) => {
    setTasks((current) => {
      const values = current[key] ?? [];
      return {
        ...current,
        [key]: values.includes(task)
          ? values.filter((value) => value !== task)
          : [...values, task],
      };
    });
  };

  const addCustomTask = (key: string) => {
    const task = customTasks[key]?.trim();
    if (!task) return;
    setTasks((current) => ({
      ...current,
      [key]: current[key]?.includes(task)
        ? current[key]
        : [...(current[key] ?? []), task],
    }));
    setCustomTasks((current) => ({ ...current, [key]: "" }));
  };

  const totalHours = useMemo(
    () => [...draft].reduce((total, key) => total + durationHours(times[key]), 0),
    [draft, times],
  );

  const save = () => {
    const keys = [...draft].sort();
    onSave(assignedDatesFromShiftPhases(draft), keys, selectedTimes, selectedTasks);
    setOpen(false);
  };

  const applyToRole = () => {
    const keys = [...draft].sort();
    onSave(assignedDatesFromShiftPhases(draft), keys, selectedTimes, selectedTasks);
    onApplyToRole(keys, selectedTimes, selectedTasks);
    setOpen(false);
  };

  const barsForDate = (date: string) => {
    const current = {
      id: crew.id,
      name: crew.name || "Selected crew",
      times: selectedTimes,
      selected: true,
    };
    return [
      current,
      ...rolePeers
        .filter((member) => member.id !== crew.id)
        .map((member) => ({
          id: member.id,
          name: member.name || member.role,
          times: member.assignedShiftTimes ?? {},
          selected: false,
        })),
    ].flatMap((member) => {
      const dayTimes = Object.entries(member.times)
        .filter(([key]) => key.startsWith(`${date}::`))
        .map(([, time]) => time)
        .filter((time) => minutes(time.startTime) != null && minutes(time.endTime) != null);
      if (dayTimes.length === 0) return [];
      return [{ ...member, dayTimes }];
    });
  };

  const selectedDayCount = assignedDatesFromShiftPhases(
    filterShiftSelectionsToSchedule(
      crew.assignedShiftPhases ??
        (crew.assignedDates ?? []).flatMap((date) =>
          PHASES.filter((phase) => phaseDays[phase.key]?.includes(date))
            .map((phase) => crewShiftAssignmentKey(date, phase.key)),
        ),
      availableKeys,
    ),
  ).length;

  return (
    <>
      <button
        type="button"
        className="roster-day-quickpick-btn"
        onClick={openModal}
        disabled={days.length === 0}
      >
        Edit shifts{selectedDayCount ? ` (${selectedDayCount}d)` : ""}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                className="crew-shift-matrix-backdrop"
                aria-label="Close shift assignment"
                onClick={() => setOpen(false)}
              />
              <section className="crew-shift-matrix" role="dialog" aria-modal="true">
                <header className="crew-shift-matrix-header">
                  <div>
                    <p className="crew-shift-matrix-eyebrow">Crew booking · {crew.role}</p>
                    <h3>Assign shifts — {crew.name || "Crew member"}</h3>
                  </div>
                  <div className="shift-role-actions">
                    <button type="button" className="crew-shift-matrix-close" onClick={() => setOpen(false)}>×</button>
                  </div>
                </header>

                <div className="crew-shift-matrix-scroll">
                  {days.map((date) => (
                    <fieldset className="crew-shift-day" key={date}>
                      <legend>{date}</legend>
                      <div className="shift-preset-list">
                        {PHASES.filter((phase) => phaseDays[phase.key]?.includes(date)).map((phase) => {
                          const key = crewShiftAssignmentKey(date, phase.key);
                          const mode = modes[key];
                          const standard = phaseShiftTimes[key];
                          const hasStandardStart =
                            !!standard &&
                            !standard.timeTbd &&
                            minutes(standard.startTime) != null;
                          return (
                            <div className="shift-preset-row" key={key}>
                              <div className="shift-preset-title">
                                <strong>{phase.label}</strong>
                                <small>{standard?.timeTbd ? "Time TBD" : standard ? `${standard.startTime}–${standard.endTime}` : "No standard time"}</small>
                              </div>
                              <div className="shift-preset-buttons">
                                <button
                                  type="button"
                                  className={mode === "full" ? "is-active" : ""}
                                  disabled={!hasStandardStart || minutes(standard?.endTime ?? "") == null}
                                  title={!hasStandardStart ? "Add a project phase time to use this preset" : undefined}
                                  onClick={() => setPreset(key, "full", standard)}
                                >
                                  Full Phase
                                </button>
                                <button
                                  type="button"
                                  className={mode === "four" ? "is-active" : ""}
                                  disabled={!hasStandardStart}
                                  title={!hasStandardStart ? "Add a project phase start time to use this preset" : undefined}
                                  onClick={() => setPreset(key, "four", standard)}
                                >
                                  4h Call
                                </button>
                                <button type="button" className={mode === "custom" ? "is-active" : ""} onClick={() => setPreset(key, "custom", standard)}>Custom Hours</button>
                                <button type="button" className="is-clear" onClick={() => setPreset(key, "clear")}>Clear</button>
                              </div>
                              {mode === "custom" ? (
                                <div className="shift-custom-times">
                                  <label>Start<input type="time" value={times[key]?.startTime ?? ""} onChange={(event) => updateCustomTime(key, "startTime", event.target.value)} /></label>
                                  <span>→</span>
                                  <label>End<input type="time" value={times[key]?.endTime ?? ""} onChange={(event) => updateCustomTime(key, "endTime", event.target.value)} /></label>
                                </div>
                              ) : null}
                              <div className="shift-task-editor">
                                <span>Tasks / Focus</span>
                                <div className="shift-task-chips">
                                  {(ROLE_TASKS[crew.role] ?? ["General Support", "Site Prep", "Show Call"]).map((task) => (
                                    <button
                                      key={task}
                                      type="button"
                                      className={tasks[key]?.includes(task) ? "is-active" : ""}
                                      disabled={!draft.has(key)}
                                      onClick={() => toggleTask(key, task)}
                                    >
                                      {task}
                                    </button>
                                  ))}
                                  {(tasks[key] ?? [])
                                    .filter((task) => !(ROLE_TASKS[crew.role] ?? []).includes(task))
                                    .map((task) => (
                                      <button
                                        key={task}
                                        type="button"
                                        className="is-active"
                                        title="Remove custom task"
                                        onClick={() => toggleTask(key, task)}
                                      >
                                        {task} ×
                                      </button>
                                    ))}
                                </div>
                                <div className="shift-custom-task">
                                  <input
                                    value={customTasks[key] ?? ""}
                                    placeholder="Add custom task"
                                    disabled={!draft.has(key)}
                                    onChange={(event) => setCustomTasks((current) => ({ ...current, [key]: event.target.value }))}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        addCustomTask(key);
                                      }
                                    }}
                                  />
                                  <button type="button" disabled={!draft.has(key)} onClick={() => addCustomTask(key)}>Add</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}

                  {days.length > 0 ? (
                    <section className="shift-overlap">
                      <div className="shift-overlap-heading">
                        <div><strong>24-hour coverage</strong><small>Selected crew and other {crew.role}</small></div>
                        {days.length > 1 ? (
                          <select value={focusDate} onChange={(event) => setFocusDate(event.target.value)}>
                            {days.map((day) => <option key={day} value={day}>{day}</option>)}
                          </select>
                        ) : <span>{focusDate}</span>}
                      </div>
                      <div className="shift-hour-scale">
                        <div className="shift-hour-scale-spacer" />
                        <div className="shift-hour-scale-labels">
                          <span>00</span>
                          <span>06</span>
                          <span>12</span>
                          <span>18</span>
                          <span>24</span>
                        </div>
                      </div>
                      <div className="shift-overlap-rows">
                        {barsForDate(focusDate).map((member) => (
                          <div className="shift-overlap-row" key={member.id}>
                            <span title={member.name}>{member.name}</span>
                            <div className="shift-overlap-track">
                              {member.dayTimes.flatMap((time, index) => {
                                const start = minutes(time.startTime)!;
                                const end = minutes(time.endTime)!;
                                const length = (end - start + 1440) % 1440 || 1440;
                                const blocks = [
                                  { left: start, width: Math.min(length, 1440 - start) }
                                ];
                                if (length > 1440 - start) {
                                  blocks.push({ left: 0, width: length - (1440 - start) });
                                }
                                return blocks.map((block, blockIndex) => (
                                  <i
                                    key={`${time.startTime}-${time.endTime}-${index}-${blockIndex}`}
                                    className={member.selected ? "is-selected" : ""}
                                    title={`${member.name}: ${time.startTime}–${time.endTime}`}
                                    style={{ left: `${block.left / 14.4}%`, width: `${block.width / 14.4}%` }}
                                  />
                                ));
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>

                <footer className="crew-shift-matrix-footer">
                  <strong>Total Booked: {Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)} hrs</strong>
                  <div className="crew-shift-matrix-actions">
                    <button type="button" onClick={() => setOpen(false)}>Cancel</button>
                    {rolePeers.length > 1 ? (
                      <button
                        type="button"
                        onClick={applyToRole}
                      >
                        Apply to all {crew.role}
                      </button>
                    ) : null}
                    <button type="button" className="is-primary" onClick={save}>Save shifts</button>
                  </div>
                </footer>
              </section>
            </>,
            document.body,
          )
        : null}
    </>
  );
}