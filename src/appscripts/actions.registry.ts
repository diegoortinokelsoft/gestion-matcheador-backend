export const APPSCRIPTS_ACTIONS = {
  // tasks
  tasks_list: { isWrite: false, retry: true },
  tasks_set_multiple: { isWrite: true, retry: false },
  tasks_delete_multiple: { isWrite: true, retry: false },

  // vacations
  vacations_list_all: { isWrite: false, retry: true },
  vacations_list_user: { isWrite: false, retry: true },
  vacations_list_team: { isWrite: false, retry: true },
  vacations_set: { isWrite: true, retry: false },
  vacations_delete: { isWrite: true, retry: false },

  // absences
  absences_create: { isWrite: true, retry: false },
  absences_list_user: { isWrite: false, retry: true },
  absences_calendar: { isWrite: false, retry: true },
  absences_delete: { isWrite: true, retry: false },
  absences_cases: { isWrite: false, retry: true },

  // logs
  logs_append: { isWrite: true, retry: false },
  logs_query: { isWrite: false, retry: true },

  // allowlist
  allowlist_get: { isWrite: false, retry: true },
  allowlist_list: { isWrite: false, retry: true },
  allowlist_upsert: { isWrite: true, retry: false },
  allowlist_disable: { isWrite: true, retry: false },
} as const;

export type AppscriptsAction = keyof typeof APPSCRIPTS_ACTIONS;

export function isAppscriptsAction(value: string): value is AppscriptsAction {
  return Object.prototype.hasOwnProperty.call(APPSCRIPTS_ACTIONS, value);
}

