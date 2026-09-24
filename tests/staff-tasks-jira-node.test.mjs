import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JIRA_STAGES,
  JIRA_PRIORITIES,
  listStaffTasks,
  createStaffTask,
  updateStaffTask,
  deleteStaffTask,
  reorderStaffTasks,
  getTaskTimeDetails,
  addTaskSubtask,
  toggleTaskSubtask,
  deleteTaskSubtask,
  addTaskAttachment,
  deleteTaskAttachment,
  checkAndNotifyOverdueTasks
} from '../lib/staffTasksServer.js';
import { generateJiraCsv } from '../src/utils/staffTasksApi.js';
import {
  startTaskTimer,
  stopActiveTimer,
  createManualTimeEntry,
  recalculateTaskLoggedTime
} from '../lib/timeTrackingServer.js';

test('Jira constants define stages and priorities properly', () => {
  assert.equal(JIRA_STAGES.length, 4);
  const stageIds = JIRA_STAGES.map(s => s.id);
  assert.deepEqual(stageIds, ['todo', 'in_progress', 'in_review', 'done']);

  assert.equal(JIRA_PRIORITIES.length, 5);
  const priorityIds = JIRA_PRIORITIES.map(p => p.id);
  assert.deepEqual(priorityIds, ['lowest', 'low', 'medium', 'high', 'highest']);
});

test('createStaffTask constructs payload with sequential task key and defaults', async () => {
  let inserted = null;
  const mockSupabase = {
    from: (table) => {
      assert.equal(table, 'staff_tasks');
      return {
        select: (cols, opts) => {
          if (opts?.count === 'exact') {
            return Promise.resolve({ count: 5 });
          }
          return {
            single: () => Promise.resolve({ data: inserted, error: null })
          };
        },
        insert: (rows) => {
          inserted = { ...rows[0], id: 'task-uuid-106' };
          return {
            select: () => ({
              single: () => Promise.resolve({ data: inserted, error: null })
            })
          };
        }
      };
    }
  };

  const actor = { actorId: 'user-123', actorType: 'user', name: 'John Doe', email: 'john@deepskills.edu' };
  const task = await createStaffTask(mockSupabase, actor, {
    title: 'Admissions Lead Follow-up',
    description: 'Call 20 new applicants',
    priority: 'high',
    estimated_hours: 3.5
  });

  assert.equal(task.title, 'Admissions Lead Follow-up');
  assert.equal(task.task_key, 'DS-106');
  assert.equal(task.status, 'todo');
  assert.equal(task.priority, 'high');
  assert.equal(task.estimated_hours, 3.5);
  assert.equal(task.assignee_id, 'user-123');
  assert.equal(task.assignee_name, 'John Doe');
});

test('updateStaffTask updates allowed fields', async () => {
  let updatedPayload = null;
  const mockSupabase = {
    from: (table) => {
      assert.equal(table, 'staff_tasks');
      return {
        update: (payload) => {
          updatedPayload = payload;
          return {
            eq: (col, val) => {
              assert.equal(col, 'id');
              assert.equal(val, 'task-uuid-1');
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: { id: val, ...payload }, error: null })
                })
              };
            }
          };
        }
      };
    }
  };

  const actor = { actorId: 'user-1' };
  const res = await updateStaffTask(mockSupabase, actor, 'task-uuid-1', {
    status: 'in_progress',
    priority: 'highest',
    estimated_hours: 5
  });

  assert.equal(updatedPayload.status, 'in_progress');
  assert.equal(updatedPayload.priority, 'highest');
  assert.equal(updatedPayload.estimated_hours, 5);
  assert.ok(updatedPayload.updated_at);
});

test('recalculateTaskLoggedTime sums completed entries and updates task', async () => {
  let updatedTask = null;
  const mockSupabase = {
    from: (table) => {
      if (table === 'staff_time_entries') {
        return {
          select: () => ({
            eq: (col1, val1) => ({
              eq: (col2, val2) => {
                assert.equal(val1, 'task-999');
                assert.equal(val2, false); // is_running: false
                return Promise.resolve({
                  data: [
                    { duration_seconds: 1800 },
                    { duration_seconds: 3600 },
                    { duration_seconds: 1200 }
                  ]
                });
              }
            })
          })
        };
      }
      if (table === 'staff_tasks') {
        return {
          update: (payload) => {
            updatedTask = payload;
            return {
              eq: (col, val) => {
                assert.equal(val, 'task-999');
                return Promise.resolve({ data: payload });
              }
            };
          }
        };
      }
    }
  };

  const total = await recalculateTaskLoggedTime(mockSupabase, 'task-999');
  assert.equal(total, 6600); // 1800 + 3600 + 1200 = 6600 seconds (1.83h)
  assert.equal(updatedTask.total_logged_seconds, 6600);
});

test('startTaskTimer auto-advances todo task to in_progress and links task_id', async () => {
  let advancedTaskStatus = null;
  let insertedTimeEntry = null;

  const mockSupabase = {
    from: (table) => {
      if (table === 'staff_tasks') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'task-101', status: 'todo' } })
            })
          }),
          update: (payload) => {
            advancedTaskStatus = payload.status;
            return {
              eq: () => Promise.resolve({ data: payload })
            };
          }
        };
      }
      if (table === 'staff_time_entries') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: [] })
                  })
                })
              })
            })
          }),
          update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null }) }) }) }),
          insert: (rows) => {
            insertedTimeEntry = rows[0];
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'entry-1', ...rows[0] }, error: null })
              })
            };
          }
        };
      }
    }
  };

  const entry = await startTaskTimer(mockSupabase, 'user', 'user-1', {
    projectId: 'proj-1',
    taskId: 'task-101',
    description: 'Working on admissions checklist'
  });

  assert.equal(advancedTaskStatus, 'in_progress', 'Task should auto-advance to in_progress');
  assert.equal(insertedTimeEntry.task_id, 'task-101');
  assert.equal(insertedTimeEntry.is_running, true);
});

test('listStaffTasks enriches tasks with running elapsed seconds and overdue flags', async () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tasksInDb = [
    {
      id: 'task-1',
      task_key: 'DS-101',
      title: 'Overdue Task',
      status: 'in_progress',
      due_date: yesterday,
      total_logged_seconds: 3600
    },
    {
      id: 'task-2',
      task_key: 'DS-102',
      title: 'Current Running Task',
      status: 'in_progress',
      due_date: '2099-01-01',
      total_logged_seconds: 1000
    }
  ];

  const nowMinus30s = new Date(Date.now() - 30000).toISOString();

  const mockSupabase = {
    from: (table) => {
      if (table === 'staff_tasks') {
        return {
          select: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: tasksInDb, error: null })
            })
          })
        };
      }
      if (table === 'staff_time_entries') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({
                    data: { id: 'timer-1', task_id: 'task-2', start_time: nowMinus30s }
                  })
                })
              })
            })
          })
        };
      }
    }
  };

  const actor = { actorId: 'user-1', actorType: 'user' };
  const enriched = await listStaffTasks(mockSupabase, actor);

  assert.equal(enriched.length, 2);
  // Task 1: Overdue
  assert.equal(enriched[0].is_overdue, true);
  assert.equal(enriched[0].is_running, false);

  // Task 2: Running with ~30 seconds elapsed
  assert.equal(enriched[1].is_running, true);
  assert.ok(enriched[1].running_elapsed_seconds >= 29);
  assert.ok(enriched[1].current_total_logged_seconds >= 1029);
});

test('deleteStaffTask unlinks task_id on time entries before deleting task', async () => {
  let unlinked = false;
  let taskDeleted = false;

  const mockSupabase = {
    from: (table) => {
      if (table === 'staff_time_entries') {
        return {
          update: (payload) => {
            assert.equal(payload.task_id, null);
            return {
              eq: (col, val) => {
                assert.equal(val, 'task-to-delete');
                unlinked = true;
                return Promise.resolve({ data: null });
              }
            };
          }
        };
      }
      if (table === 'staff_tasks') {
        return {
          delete: () => ({
            eq: (col, val) => {
              assert.equal(val, 'task-to-delete');
              taskDeleted = true;
              return Promise.resolve({ error: null });
            }
          })
        };
      }
    }
  };

  const actor = { actorId: 'admin-1' };
  const res = await deleteStaffTask(mockSupabase, actor, 'task-to-delete');
  assert.equal(res.success, true);
  assert.equal(unlinked, true, 'Time entries must be unlinked to preserve logs');
  assert.equal(taskDeleted, true);
});

test('Subtasks workflow: add, toggle, and delete checklist items', async () => {
  let taskSubtasks = [
    { id: 'sub-1', title: 'Prepare documentation', done: false, created_at: '2026-09-20T10:00:00Z' }
  ];

  const mockSupabase = {
    from: (table) => {
      assert.equal(table, 'staff_tasks');
      return {
        select: (cols) => ({
          eq: (col, val) => ({
            single: () => Promise.resolve({ data: { id: val, subtasks: taskSubtasks }, error: null })
          })
        }),
        update: (payload) => {
          taskSubtasks = payload.subtasks;
          return {
            eq: (col, val) => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: val, subtasks: payload.subtasks }, error: null })
              })
            })
          };
        }
      };
    }
  };

  const actor = { actorId: 'user-1', name: 'Alice' };

  // 1. Add subtask
  const res1 = await addTaskSubtask(mockSupabase, actor, 'task-100', 'Write unit tests');
  assert.equal(res1.subtasks.length, 2);
  assert.equal(res1.subtasks[1].title, 'Write unit tests');
  assert.equal(res1.subtasks[1].done, false);

  const newSubId = res1.subtasks[1].id;

  // 2. Toggle subtask
  const res2 = await toggleTaskSubtask(mockSupabase, actor, 'task-100', newSubId);
  const toggled = res2.subtasks.find(s => s.id === newSubId);
  assert.equal(toggled.done, true);
  assert.ok(toggled.completed_at);

  // 3. Delete subtask
  const res3 = await deleteTaskSubtask(mockSupabase, actor, 'task-100', 'sub-1');
  assert.equal(res3.subtasks.length, 1);
  assert.equal(res3.subtasks[0].id, newSubId);
});

test('Attachments workflow: add and delete attachments metadata', async () => {
  let taskAttachments = [];

  const mockSupabase = {
    from: (table) => {
      assert.equal(table, 'staff_tasks');
      return {
        select: (cols) => ({
          eq: (col, val) => ({
            single: () => Promise.resolve({ data: { id: val, attachments: taskAttachments }, error: null })
          })
        }),
        update: (payload) => {
          taskAttachments = payload.attachments;
          return {
            eq: (col, val) => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: val, attachments: payload.attachments }, error: null })
              })
            })
          };
        }
      };
    }
  };

  const actor = { actorId: 'user-2', name: 'Bob' };

  // 1. Add attachment
  const fileMeta = {
    name: 'architecture_diagram.pdf',
    size: 245600,
    type: 'application/pdf',
    url: 'https://example.com/files/arch.pdf',
    path: 'task_attachments/arch.pdf'
  };

  const res1 = await addTaskAttachment(mockSupabase, actor, 'task-200', fileMeta);
  assert.equal(res1.attachments.length, 1);
  assert.equal(res1.attachments[0].name, 'architecture_diagram.pdf');
  assert.equal(res1.attachments[0].size, 245600);
  assert.equal(res1.attachments[0].uploaded_by, 'Bob');

  const attId = res1.attachments[0].id;

  // 2. Delete attachment
  const res2 = await deleteTaskAttachment(mockSupabase, actor, 'task-200', attId);
  assert.equal(res2.attachments.length, 0);
});

test('checkAndNotifyOverdueTasks detects overdue tasks and dispatches in-app notifications', async () => {
  const insertedNotifications = [];

  const mockSupabase = {
    from: (table) => {
      if (table === 'staff_tasks') {
        return {
          select: () => ({
            lt: () => ({
              neq: () => ({
                not: () => Promise.resolve({
                  data: [
                    {
                      id: 'task-overdue-1',
                      task_key: 'DS-201',
                      title: 'Renew Cloud Hosting',
                      status: 'in_progress',
                      due_date: '2026-09-10',
                      assignee_id: 'user-emp-55',
                      assignee_type: 'user',
                      assignee_name: 'David',
                      assignee_email: ''
                    }
                  ],
                  error: null
                })
              })
            })
          })
        };
      }
      if (table === 'notifications') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                ilike: () => ({
                  gte: () => ({
                    limit: () => Promise.resolve({ data: [] }) // No recent duplicate
                  })
                })
              })
            })
          }),
          insert: (records) => {
            insertedNotifications.push(...records);
            return {
              select: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'notif-1', ...records[0] } })
              })
            };
          }
        };
      }
    }
  };

  const result = await checkAndNotifyOverdueTasks(mockSupabase);
  assert.equal(result.count, 1);
  assert.deepEqual(result.notified, ['DS-201']);
  assert.equal(insertedNotifications.length, 1);
  assert.equal(insertedNotifications[0].user_id, 'user-emp-55');
  assert.equal(insertedNotifications[0].type, 'task_overdue');
  assert.ok(insertedNotifications[0].title.includes('DS-201'));
  assert.equal(insertedNotifications[0].link, '/staff/tasks');
});

test('generateJiraCsv generates CSV format with estimates, actuals, subtasks, and attachments', () => {
  const mockTasks = [
    {
      task_key: 'DS-101',
      title: 'Fix Payment Gateway Webhook',
      status: 'in_progress',
      priority: 'high',
      department: 'Finance',
      staff_time_projects: { name: 'Billing Platform' },
      assignee_name: 'John Doe',
      assignee_email: 'john@deepskills.pk',
      start_date: '2026-09-20',
      due_date: '2026-09-25',
      is_overdue: false,
      estimated_hours: 8,
      total_logged_seconds: 14400, // 4 hours
      subtasks: [
        { id: '1', title: 'Verify signature', done: true },
        { id: '2', title: 'Unit test retry', done: false }
      ],
      attachments: [
        { id: 'att-1', name: 'webhook_payload.json' }
      ],
      created_at: '2026-09-20T10:00:00Z'
    }
  ];

  const csv = generateJiraCsv(mockTasks);
  assert.ok(csv.includes('"Issue Key","Summary","Status","Priority"'));
  assert.ok(csv.includes('"DS-101"'));
  assert.ok(csv.includes('"Fix Payment Gateway Webhook"'));
  assert.ok(csv.includes('"IN PROGRESS"'));
  assert.ok(csv.includes('"HIGH"'));
  assert.ok(csv.includes('"Billing Platform"'));
  assert.ok(csv.includes('"John Doe"'));
  assert.ok(csv.includes('"04:00:00"')); // Time spent HMS
  assert.ok(csv.includes('"4.00"'));     // Time spent decimal
  assert.ok(csv.includes('"-4.00"'));    // Variance: 4.00 - 8.00 = -4.00
  assert.ok(csv.includes('"1/2 (50%)"')); // Subtasks progress
  assert.ok(csv.includes('"1"'));        // Attachments count
});

