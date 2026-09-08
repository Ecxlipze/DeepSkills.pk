<?php
require_once __DIR__ . '/../../auth/_otp_common.php';
otp_bootstrap(['GET', 'POST']);

$auth = portal_authorize_admin_operation();
if (($auth['role'] ?? '') === 'custom') {
    $permissions = $auth['permissions'] ?? [];
    $p = $permissions['announcements'] ?? '';
    if ($p !== 'view' && $p !== 'full') {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Insufficient permissions for announcements and broadcasts.'
        ]);
    }
}

$canMutate = ($auth['role'] ?? '') === 'admin' || (($auth['permissions']['announcements'] ?? '') === 'full');
$method = $_SERVER['REQUEST_METHOD'];

// ──────────────────────────────────────────
// GET: Fetch Announcements, Stats, Readers
// ──────────────────────────────────────────
if ($method === 'GET') {
    try {
        $search = trim($_GET['search'] ?? '');
        $audienceType = $_GET['audience_type'] ?? '';
        $role = $_GET['role'] ?? '';
        $priority = $_GET['priority'] ?? '';
        $status = $_GET['status'] ?? '';
        $announcementId = $_GET['announcement_id'] ?? '';

        // 1. Fetch Meta: Batches, Courses, Admissions, Teachers
        $batchesRes = otp_supabase_request('GET', 'batches?select=id,batch_name,course,time_shift,status&order=batch_name.asc');
        $batches = is_array($batchesRes) ? $batchesRes : [];

        $coursesRes = otp_supabase_request('GET', 'courses?select=id,title&order=title.asc');
        $courses = is_array($coursesRes) ? $coursesRes : [];

        $admRes = otp_supabase_request('GET', 'admissions?select=id,name,cnic,phone,email,course,batch,status&status=in.(Active,Graduated)');
        $admissions = is_array($admRes) ? $admRes : [];

        $teachersRes = otp_supabase_request('GET', 'teachers?select=id,name,cnic,phone,email,status&status=eq.Active');
        $teachers = is_array($teachersRes) ? $teachersRes : [];

        // 2. Fetch Announcements & Attachments
        $annRes = otp_supabase_request('GET', 'announcements?select=*,announcement_attachments(*)&order=is_pinned.desc,posted_at.desc');
        $allAnnouncements = is_array($annRes) ? $annRes : [];

        // 3. Fetch Reads
        $readsRes = otp_supabase_request('GET', 'announcement_reads?select=announcement_id,user_id,read_at');
        $allReads = is_array($readsRes) ? $readsRes : [];

        $readCountMap = [];
        foreach ($allReads as $r) {
            $aId = $r['announcement_id'] ?? '';
            if (!empty($aId)) {
                $readCountMap[$aId] = ($readCountMap[$aId] ?? 0) + 1;
            }
        }

        // 4. Enrich
        $enriched = [];
        foreach ($allAnnouncements as $a) {
            $aId = $a['id'] ?? '';
            $atts = $a['announcement_attachments'] ?? [];
            $enriched[] = array_merge($a, [
                'body' => $a['body'] ?? $a['content'] ?? '',
                'priority' => $a['priority'] ?? 'normal',
                'attachments_count' => count($atts),
                'reads_count' => $readCountMap[$aId] ?? 0
            ]);
        }

        // 5. Apply filters
        if (!empty($search)) {
            $q = strtolower($search);
            $enriched = array_filter($enriched, function($a) use ($q) {
                return str_contains(strtolower($a['title'] ?? ''), $q) ||
                       str_contains(strtolower($a['body'] ?? ''), $q) ||
                       str_contains(strtolower($a['posted_by_name'] ?? ''), $q);
            });
            $enriched = array_values($enriched);
        }

        if (!empty($audienceType) && $audienceType !== 'all') {
            $enriched = array_filter($enriched, function($a) use ($audienceType) {
                return ($a['audience_type'] ?? 'broadcast') === $audienceType;
            });
            $enriched = array_values($enriched);
        }

        if (!empty($role) && $role !== 'all') {
            $enriched = array_filter($enriched, function($a) use ($role) {
                $r = $a['audience_roles'] ?? [];
                return is_array($r) && in_array($role, $r);
            });
            $enriched = array_values($enriched);
        }

        if (!empty($priority) && $priority !== 'all') {
            $enriched = array_filter($enriched, function($a) use ($priority) {
                return ($a['priority'] ?? 'normal') === $priority;
            });
            $enriched = array_values($enriched);
        }

        if (!empty($status) && $status !== 'all') {
            if ($status === 'active') {
                $enriched = array_filter($enriched, fn($a) => ($a['is_active'] ?? true) !== false);
            } elseif ($status === 'inactive') {
                $enriched = array_filter($enriched, fn($a) => ($a['is_active'] ?? true) === false);
            } elseif ($status === 'pinned') {
                $enriched = array_filter($enriched, fn($a) => !empty($a['is_pinned']));
            } elseif ($status === 'scheduled') {
                $now = time();
                $enriched = array_filter($enriched, fn($a) => !empty($a['scheduled_at']) && strtotime($a['scheduled_at']) > $now);
            }
            $enriched = array_values($enriched);
        }

        // 6. Reader details if specific announcement requested
        $readerDetails = null;
        if (!empty($announcementId)) {
            $targetReads = array_filter($allReads, fn($r) => ($r['announcement_id'] ?? '') === $announcementId);

            $studentMap = [];
            foreach ($admissions as $s) {
                $studentMap[$s['id']] = $s;
                if (!empty($s['cnic'])) $studentMap[$s['cnic']] = $s;
            }
            $teacherMap = [];
            foreach ($teachers as $t) {
                $teacherMap[$t['id']] = $t;
                if (!empty($t['cnic'])) $teacherMap[$t['cnic']] = $t;
            }

            $readerDetails = [];
            foreach ($targetReads as $r) {
                $uId = strval($r['user_id'] ?? '');
                $s = $studentMap[$uId] ?? null;
                $t = $teacherMap[$uId] ?? null;

                $readerDetails[] = [
                    'user_id' => $r['user_id'] ?? null,
                    'read_at' => $r['read_at'] ?? null,
                    'name' => $s['name'] ?? ($t['name'] ?? 'Registered Member'),
                    'role' => $s ? 'student' : ($t ? 'teacher' : 'user'),
                    'cnic' => $s['cnic'] ?? ($t['cnic'] ?? null),
                    'batch' => $s['batch'] ?? null,
                    'course' => $s['course'] ?? null,
                    'phone' => $s['phone'] ?? ($t['phone'] ?? null)
                ];
            }
        }

        // 7. Telemetry KPIs
        $totalCount = count($allAnnouncements);
        $activeCount = count(array_filter($allAnnouncements, fn($a) => ($a['is_active'] ?? true) !== false));
        $pinnedCount = count(array_filter($allAnnouncements, fn($a) => !empty($a['is_pinned'])));
        $totalReads = count($allReads);
        $potentialAudience = count($admissions) + count($teachers);
        $engagementRate = ($totalCount > 0 && $potentialAudience > 0)
            ? min(100, round(($totalReads / ($totalCount * $potentialAudience)) * 100))
            : 0;

        $batchNames = array_map(fn($b) => $b['batch_name'] ?? '', $batches);
        $courseTitles = array_map(fn($c) => $c['title'] ?? '', $courses);

        otp_respond(200, [
            'status' => 'success',
            'data' => [
                'announcements' => $enriched,
                'readers' => $readerDetails,
                'telemetry' => [
                    'total' => $totalCount,
                    'active' => $activeCount,
                    'pinned' => $pinnedCount,
                    'totalReads' => $totalReads,
                    'engagementRate' => $engagementRate
                ],
                'meta' => [
                    'batches' => array_filter($batchNames),
                    'courses' => array_filter($courseTitles),
                    'totalEnrolledStudents' => count($admissions),
                    'totalTeachers' => count($teachers)
                ]
            ]
        ]);
    } catch (Exception $e) {
        otp_respond(500, [
            'status' => 'error',
            'message' => $e->getMessage() ?: 'Failed to load announcements.'
        ]);
    }
}

// ──────────────────────────────────────────
// POST: Mutations (Create, Update, Pin, Delete)
// ──────────────────────────────────────────
if ($method === 'POST') {
    if (!$canMutate) {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Modification permissions required.'
        ]);
    }

    $input = otp_read_json_body();
    $action = $input['action'] ?? '';

    // Action 1: Create
    if ($action === 'create') {
        $title = trim($input['title'] ?? '');
        $body = trim($input['body'] ?? '');
        $priority = $input['priority'] ?? 'normal';
        $audienceType = $input['audience_type'] ?? 'broadcast';
        $audienceCourses = $input['audience_courses'] ?? [];
        $audienceBatches = $input['audience_batches'] ?? [];
        $audienceRoles = $input['audience_roles'] ?? ['student', 'teacher'];
        $isPinned = !empty($input['is_pinned']);
        $scheduledAt = $input['scheduled_at'] ?? null;
        $attachments = $input['attachments'] ?? [];

        if (empty($title)) {
            otp_respond(400, ['status' => 'error', 'message' => 'Announcement title is required.']);
        }
        if (empty($body)) {
            otp_respond(400, ['status' => 'error', 'message' => 'Announcement body is required.']);
        }

        $record = [
            'title' => $title,
            'body' => $body,
            'posted_by_name' => $auth['name'] ?? 'Administrator',
            'posted_by_role' => 'admin',
            'audience_type' => $audienceType,
            'audience_courses' => $audienceType === 'targeted' ? $audienceCourses : null,
            'audience_batches' => $audienceType === 'targeted' ? $audienceBatches : null,
            'audience_roles' => !empty($audienceRoles) ? $audienceRoles : ['student', 'teacher'],
            'priority' => in_array($priority, ['urgent', 'normal', 'info']) ? $priority : 'normal',
            'is_pinned' => $isPinned,
            'is_active' => true,
            'scheduled_at' => $scheduledAt,
            'posted_at' => gmdate('Y-m-d\TH:i:s\Z')
        ];

        $res = otp_supabase_request('POST', 'announcements', $record, ['Prefer: return=representation']);
        $created = is_array($res) && isset($res[0]) ? $res[0] : (is_array($res) ? $res : null);

        if (!$created || empty($created['id'])) {
            otp_respond(500, ['status' => 'error', 'message' => 'Failed to insert announcement into database.']);
        }

        $annId = $created['id'];

        // Insert attachments
        if (is_array($attachments) && count($attachments) > 0) {
            foreach ($attachments as $att) {
                otp_supabase_request('POST', 'announcement_attachments', [
                    'announcement_id' => $annId,
                    'file_name' => $att['file_name'] ?? 'Attachment',
                    'file_size' => $att['file_size'] ?? '',
                    'file_url' => $att['file_url'] ?? '',
                    'file_type' => $att['file_type'] ?? ''
                ]);
            }
        }

        otp_respond(200, [
            'status' => 'success',
            'message' => 'Announcement published successfully.',
            'data' => $created
        ]);
    }

    // Action 2: Update
    if ($action === 'update') {
        $annId = $input['announcement_id'] ?? '';
        if (empty($annId)) {
            otp_respond(400, ['status' => 'error', 'message' => 'announcement_id is required.']);
        }

        $title = trim($input['title'] ?? '');
        $body = trim($input['body'] ?? '');
        $priority = $input['priority'] ?? 'normal';
        $audienceType = $input['audience_type'] ?? 'broadcast';
        $audienceCourses = $input['audience_courses'] ?? [];
        $audienceBatches = $input['audience_batches'] ?? [];
        $audienceRoles = $input['audience_roles'] ?? ['student', 'teacher'];
        $isPinned = isset($input['is_pinned']) ? !empty($input['is_pinned']) : null;
        $scheduledAt = $input['scheduled_at'] ?? null;
        $attachments = $input['attachments'] ?? null;

        $update = [
            'title' => $title,
            'body' => $body,
            'priority' => in_array($priority, ['urgent', 'normal', 'info']) ? $priority : 'normal',
            'audience_type' => $audienceType,
            'audience_courses' => $audienceType === 'targeted' ? $audienceCourses : null,
            'audience_batches' => $audienceType === 'targeted' ? $audienceBatches : null,
            'audience_roles' => !empty($audienceRoles) ? $audienceRoles : ['student', 'teacher']
        ];
        if ($isPinned !== null) $update['is_pinned'] = $isPinned;
        if (array_key_exists('scheduled_at', $input)) $update['scheduled_at'] = $scheduledAt;

        $res = otp_supabase_request('PATCH', "announcements?id=eq.{$annId}", $update, ['Prefer: return=representation']);

        if (is_array($attachments)) {
            otp_supabase_request('DELETE', "announcement_attachments?announcement_id=eq.{$annId}");
            foreach ($attachments as $att) {
                otp_supabase_request('POST', 'announcement_attachments', [
                    'announcement_id' => $annId,
                    'file_name' => $att['file_name'] ?? 'Attachment',
                    'file_size' => $att['file_size'] ?? '',
                    'file_url' => $att['file_url'] ?? '',
                    'file_type' => $att['file_type'] ?? ''
                ]);
            }
        }

        otp_respond(200, [
            'status' => 'success',
            'message' => 'Announcement updated successfully.',
            'data' => is_array($res) && isset($res[0]) ? $res[0] : $res
        ]);
    }

    // Action 3: Toggle Pin
    if ($action === 'toggle_pin') {
        $annId = $input['announcement_id'] ?? '';
        $isPinned = !empty($input['is_pinned']);
        if (empty($annId)) {
            otp_respond(400, ['status' => 'error', 'message' => 'announcement_id is required.']);
        }

        otp_supabase_request('PATCH', "announcements?id=eq.{$annId}", ['is_pinned' => $isPinned]);
        otp_respond(200, [
            'status' => 'success',
            'message' => $isPinned ? 'Announcement pinned.' : 'Announcement unpinned.'
        ]);
    }

    // Action 4: Toggle Active
    if ($action === 'toggle_active') {
        $annId = $input['announcement_id'] ?? '';
        $isActive = !empty($input['is_active']);
        if (empty($annId)) {
            otp_respond(400, ['status' => 'error', 'message' => 'announcement_id is required.']);
        }

        otp_supabase_request('PATCH', "announcements?id=eq.{$annId}", ['is_active' => $isActive]);
        otp_respond(200, [
            'status' => 'success',
            'message' => $isActive ? 'Announcement activated.' : 'Announcement archived.'
        ]);
    }

    // Action 5: Delete Permanently
    if ($action === 'delete') {
        $annId = $input['announcement_id'] ?? '';
        if (empty($annId)) {
            otp_respond(400, ['status' => 'error', 'message' => 'announcement_id is required.']);
        }

        otp_supabase_request('DELETE', "announcements?id=eq.{$annId}");
        otp_respond(200, [
            'status' => 'success',
            'message' => 'Announcement deleted permanently.'
        ]);
    }

    otp_respond(400, ['status' => 'error', 'message' => 'Invalid action.']);
}
