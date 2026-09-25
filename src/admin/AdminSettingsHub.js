import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  FaShieldAlt,
  FaUsers,
  FaCogs,
  FaGlobe,
  FaPlus,
  FaEdit,
  FaCopy,
  FaTrashAlt,
  FaCheck,
  FaEye,
  FaBan,
  FaLock,
  FaMapMarkerAlt,
  FaRegClock,
  FaMoneyBillWave,
  FaUniversity,
  FaTable,
  FaThLarge,
  FaSearch
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import {
  MODULE_KEYS,
  ROLE_COLOR_STYLES,
  canAccess,
  ADMIN_FULL_PERMISSIONS
} from '../utils/permissions';
import {
  PERMISSION_CATEGORIES,
  ROLE_PRESETS,
  createEmptyPermissions
} from '../utils/rolePresets';
import { DEPARTMENTS } from '../utils/departments';
import {
  fetchRoles,
  fetchUsers,
  deleteRole
} from '../utils/userManagementApi';
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  fetchAttendanceSettings,
  saveAttendanceSettings
} from '../utils/autoAttendance';
import AdminRoleEditorModal from './AdminRoleEditorModal';
import { ContentManager } from './ContentManager';
import {
  FormField,
  AdminInput,
  AdminButton,
  FormGrid,
  AdminCheckbox
} from '../components/portal';

const DEFAULT_SYSTEM_POLICIES = {
  attendance: {
    instituteName: 'DeepSkill Main Campus',
    latitude: 31.5204,
    longitude: 74.3587,
    radiusMeters: 100,
    maxAccuracyBufferMeters: 200,
    lateThresholdMins: 15,
    absentCutoffMins: 60
  },
  security: {
    sessionTimeoutMins: 60,
    enforceStaffOtp: false,
    requireStrongPassword: true
  },
  studentPortal: {
    allowReceiptUploads: true,
    allowGrievanceSubmissions: true,
    allowReferralSharing: true
  },
  referral: {
    defaultRewardPkr: 2000,
    minimumPayoutThresholdPkr: 5000
  }
};

export default function AdminSettingsHub({ initialTab = 'roles' }) {
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'settings', 'full');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'matrix'
  const [roleSearch, setRoleSearch] = useState('');

  // Role Modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // System Policies state
  const [policies, setPolicies] = useState(DEFAULT_SYSTEM_POLICIES);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [savingPolicies, setSavingPolicies] = useState(false);

  useEffect(() => {
    loadRolesAndUsers();
    loadSystemPolicies();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const loadRolesAndUsers = async () => {
    setLoadingRoles(true);
    try {
      const [rolesData, usersData] = await Promise.all([
        fetchRoles(),
        fetchUsers({ page: 1, pageSize: 200 })
      ]);
      setRoles(rolesData || []);
      setUsers(usersData.data || []);
    } catch (err) {
      toast.error('Failed to load roles and users');
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadSystemPolicies = async () => {
    setLoadingPolicies(true);
    try {
      const [{ data: policyRow }, attendanceRow] = await Promise.all([
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'system_security_policies')
          .maybeSingle(),
        fetchAttendanceSettings()
      ]);

      const merged = { ...DEFAULT_SYSTEM_POLICIES };
      if (policyRow?.value) {
        const val = typeof policyRow.value === 'string' ? JSON.parse(policyRow.value) : policyRow.value;
        if (val.security) merged.security = { ...merged.security, ...val.security };
        if (val.studentPortal) merged.studentPortal = { ...merged.studentPortal, ...val.studentPortal };
        if (val.referral) merged.referral = { ...merged.referral, ...val.referral };
      }
      if (attendanceRow) {
        merged.attendance = {
          ...merged.attendance,
          ...attendanceRow
        };
      }
      setPolicies(merged);
    } catch (err) {
      console.warn('Could not load system policies, using defaults:', err);
    } finally {
      setLoadingPolicies(false);
    }
  };

  const handleSavePolicies = async (e) => {
    if (e) e.preventDefault();
    if (!canMutate) {
      toast.error('You do not have permission to modify system policies.');
      return;
    }

    setSavingPolicies(true);
    try {
      await Promise.all([
        supabase.from('app_settings').upsert({
          key: 'system_security_policies',
          value: {
            security: policies.security,
            studentPortal: policies.studentPortal,
            referral: policies.referral
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' }),
        saveAttendanceSettings(policies.attendance)
      ]);
      toast.success('System policies and campus geofencing saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save system policies');
    } finally {
      setSavingPolicies(false);
    }
  };

  const handleOpenCreateRole = () => {
    setSelectedRole(null);
    setEditorOpen(true);
  };

  const handleOpenEditRole = (role) => {
    setSelectedRole(role);
    setEditorOpen(true);
  };

  const handleCloneRole = (role) => {
    setSelectedRole({
      ...role,
      id: null,
      name: `Copy of ${role.name}`,
      is_builtin: false
    });
    setEditorOpen(true);
    toast.success(`Cloning "${role.name}" permissions into new draft`);
  };

  const handleDeleteRole = async (role) => {
    if (role.is_builtin) {
      toast.error('Built-in roles cannot be deleted.');
      return;
    }
    const assignedCount = users.filter((u) => u.custom_role_id === role.id).length;
    if (assignedCount > 0) {
      toast.error(`Cannot delete role: ${assignedCount} staff member(s) are currently assigned.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) return;

    try {
      await deleteRole(role.id);
      toast.success(`Role "${role.name}" deleted`);
      loadRolesAndUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete role');
    }
  };

  // Filter roles
  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(roleSearch.toLowerCase()))
  );

  return (
    <AdminLayout>
      <Container>
        {/* Hub Header */}
        <Header>
          <div className="header-left">
            <span className="badge">SUPER ADMIN SETTINGS</span>
            <h1>System Configuration & Role Editor</h1>
            <p>Manage custom roles, department route rules, security defaults, and global platform parameters.</p>
          </div>
          <div className="header-right">
            <StatBadge>
              <FaShieldAlt style={{ color: '#4F8EF7' }} />
              <div>
                <strong>{roles.length + 1} Roles</strong>
                <span>1 Built-in, {roles.length} Custom</span>
              </div>
            </StatBadge>
            <StatBadge>
              <FaUsers style={{ color: '#2ECC71' }} />
              <div>
                <strong>{users.length} Users</strong>
                <span>Staff & Admin Directory</span>
              </div>
            </StatBadge>
          </div>
        </Header>

        {/* Navigation Tabs */}
        <TabsBar>
          <TabButton $active={activeTab === 'roles'} onClick={() => setActiveTab('roles')}>
            <FaShieldAlt /> Custom Roles & Permissions
          </TabButton>
          <TabButton $active={activeTab === 'departments'} onClick={() => setActiveTab('departments')}>
            <FaUniversity /> Department & Routing
          </TabButton>
          <TabButton $active={activeTab === 'system'} onClick={() => setActiveTab('system')}>
            <FaCogs /> Security & Policies
          </TabButton>
          <TabButton $active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
            <FaGlobe /> Landing Page Content
          </TabButton>
        </TabsBar>

        {/* TAB 1: ROLES & PERMISSIONS */}
        {activeTab === 'roles' && (
          <TabContent>
            {/* Roles Toolbar */}
            <Toolbar>
              <SearchBox>
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search roles by title or scope..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                />
              </SearchBox>

              <ToolbarActions>
                <ViewToggle>
                  <button
                    type="button"
                    className={viewMode === 'cards' ? 'active' : ''}
                    onClick={() => setViewMode('cards')}
                    title="Card View"
                  >
                    <FaThLarge /> Cards
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'matrix' ? 'active' : ''}
                    onClick={() => setViewMode('matrix')}
                    title="Live Comparison Matrix"
                  >
                    <FaTable /> Matrix
                  </button>
                </ViewToggle>

                {canMutate && (
                  <AdminButton $variant="primary" onClick={handleOpenCreateRole}>
                    <FaPlus /> Create Custom Role
                  </AdminButton>
                )}
              </ToolbarActions>
            </Toolbar>

            {loadingRoles ? (
              <LoadingState>Loading roles and permission configurations...</LoadingState>
            ) : viewMode === 'cards' ? (
              <RolesGrid>
                {/* Built-in Super Admin Card */}
                <RoleCard $isSuperAdmin>
                  <div className="card-top">
                    <RoleBadge style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                      <span>👑</span>
                      <strong>Super Admin</strong>
                    </RoleBadge>
                    <BuiltInTag>Built-in System Role</BuiltInTag>
                  </div>
                  <p className="role-desc">
                    Unrestricted full administrative control across all 18 institutional modules, user credentials, finance, and system policies.
                  </p>
                  <PermissionChipsSummary>
                    <span className="chip-full">ALL 18 MODULES FULL</span>
                    <span className="chip-notice">Immutable Master Access</span>
                  </PermissionChipsSummary>
                  <div className="card-footer">
                    <span className="staff-count">
                      <FaUsers /> {users.filter((u) => u.role === 'admin').length} super admin accounts
                    </span>
                    <span className="protected-label"><FaLock /> Protected</span>
                  </div>
                </RoleCard>

                {/* Custom Roles */}
                {filteredRoles.map((role) => {
                  const assignedCount = users.filter((u) => u.custom_role_id === role.id).length;
                  const colorStyle = ROLE_COLOR_STYLES[role.color] || ROLE_COLOR_STYLES.blue;
                  const perms = role.permissions || {};
                  const fullModules = Object.keys(perms).filter((k) => perms[k] === 'full');
                  const viewModules = Object.keys(perms).filter((k) => perms[k] === 'view');

                  return (
                    <RoleCard key={role.id}>
                      <div className="card-top">
                        <RoleBadge style={{ background: colorStyle.bg, color: colorStyle.text, borderColor: colorStyle.border }}>
                          <span>{role.icon || '👤'}</span>
                          <strong>{role.name}</strong>
                        </RoleBadge>
                        <UserCountTag>
                          <FaUsers /> {assignedCount} {assignedCount === 1 ? 'user' : 'users'}
                        </UserCountTag>
                      </div>

                      <p className="role-desc">{role.description || 'No description provided.'}</p>

                      <PermissionChipsSummary>
                        <span className="chip-full">{fullModules.length} Full Access</span>
                        <span className="chip-view">{viewModules.length} Read-Only</span>
                        <span className="chip-none">{MODULE_KEYS.length - fullModules.length - viewModules.length} Denied</span>
                      </PermissionChipsSummary>

                      <div className="card-footer">
                        <div className="action-buttons">
                          {canMutate && (
                            <button
                              type="button"
                              className="btn-edit"
                              onClick={() => handleOpenEditRole(role)}
                            >
                              <FaEdit /> Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-clone"
                            onClick={() => handleCloneRole(role)}
                            title="Clone as new role"
                          >
                            <FaCopy /> Clone
                          </button>
                          {canMutate && !role.is_builtin && (
                            <button
                              type="button"
                              className="btn-delete"
                              disabled={assignedCount > 0}
                              onClick={() => handleDeleteRole(role)}
                              title={assignedCount > 0 ? 'Reassign staff before deleting' : 'Delete role'}
                            >
                              <FaTrashAlt />
                            </button>
                          )}
                        </div>
                      </div>
                    </RoleCard>
                  );
                })}
              </RolesGrid>
            ) : (
              /* LIVE COMPARISON MATRIX VIEW */
              <MatrixContainer>
                <MatrixTableWrapper>
                  <MatrixTable>
                    <thead>
                      <tr>
                        <th className="sticky-col">Role / Module</th>
                        {PERMISSION_CATEGORIES.flatMap((c) =>
                          c.modules.map((m) => (
                            <th key={m.key} title={`${c.label} > ${m.label}`}>
                              <span className="mod-head-icon">{c.icon}</span>
                              <span className="mod-head-text">{m.label}</span>
                            </th>
                          ))
                        )}
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Built-in Admin Row */}
                      <tr className="super-admin-row">
                        <td className="sticky-col">
                          <div className="role-identity">
                            <span>👑</span>
                            <strong>Super Admin</strong>
                            <small>Built-in</small>
                          </div>
                        </td>
                        {MODULE_KEYS.map((k) => (
                          <td key={k} className="cell-perm full">
                            <span className="perm-pill full"><FaCheck /> Full</span>
                          </td>
                        ))}
                        <td>
                          <span className="protected-text"><FaLock /> Locked</span>
                        </td>
                      </tr>

                      {/* Custom Roles Rows */}
                      {filteredRoles.map((role) => (
                        <tr key={role.id}>
                          <td className="sticky-col">
                            <div className="role-identity">
                              <span>{role.icon || '👤'}</span>
                              <strong>{role.name}</strong>
                              <small>{users.filter((u) => u.custom_role_id === role.id).length} staff</small>
                            </div>
                          </td>
                          {MODULE_KEYS.map((key) => {
                            const level = role.permissions?.[key] || 'none';
                            return (
                              <td key={key} className={`cell-perm ${level}`}>
                                {level === 'full' ? (
                                  <span className="perm-pill full"><FaCheck /> Full</span>
                                ) : level === 'view' ? (
                                  <span className="perm-pill view"><FaEye /> View</span>
                                ) : (
                                  <span className="perm-pill none">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td>
                            <div className="table-actions">
                              {canMutate && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRole(role)}
                                  className="btn-tbl-edit"
                                >
                                  <FaEdit />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCloneRole(role)}
                                className="btn-tbl-clone"
                                title="Clone role"
                              >
                                <FaCopy />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </MatrixTable>
                </MatrixTableWrapper>
              </MatrixContainer>
            )}
          </TabContent>
        )}

        {/* TAB 2: DEPARTMENT & ROUTING */}
        {activeTab === 'departments' && (
          <TabContent>
            <DepartmentInfoCard>
              <h3>🏛️ Department Hierarchy & Staff Routing Engine</h3>
              <p>
                DeepSkills enforces strict department-based boundary isolation. When staff members log in,
                the system matches their granted permissions against departmental access rules and routes them to their
                first accessible workstation.
              </p>
            </DepartmentInfoCard>

            <DeptsGrid>
              {DEPARTMENTS.map((dept) => (
                <DeptCard key={dept.id}>
                  <div className="dept-header" style={{ borderLeftColor: dept.color }}>
                    <h4>{dept.label}</h4>
                    <span className="dept-path">{dept.path}</span>
                  </div>
                  <div className="dept-body">
                    <p className="dept-meta">
                      <strong>Permission Key:</strong> <code>{dept.permissionKey || (dept.superAdminOnly ? 'super_admin_only' : 'multiple')}</code>
                    </p>
                    <p className="dept-meta">
                      <strong>Access Level:</strong> {dept.superAdminOnly ? 'Restricted to Super Admin' : 'Granted to Custom Staff with permission'}
                    </p>
                  </div>
                </DeptCard>
              ))}
            </DeptsGrid>
          </TabContent>
        )}

        {/* TAB 3: SYSTEM SECURITY & POLICIES */}
        {activeTab === 'system' && (
          <TabContent>
            <form onSubmit={handleSavePolicies}>
              {/* Campus Geofencing */}
              <SettingsSection>
                <div className="section-head">
                  <FaMapMarkerAlt style={{ color: '#F59E0B' }} />
                  <div>
                    <h3>Campus Geofence & Automated Attendance Thresholds</h3>
                    <p>Coordinates and distance limits used by student and teacher mobile self-attendance verification.</p>
                  </div>
                </div>

                <FormGrid $columns={2}>
                  <FormField label="Campus / Institute Name">
                    <AdminInput
                      value={policies.attendance.instituteName}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          attendance: { ...policies.attendance, instituteName: e.target.value }
                        })
                      }
                      placeholder="DeepSkill Main Campus"
                    />
                  </FormField>

                  <FormField label="Allowed Radius (Meters)" hint="Maximum allowable distance from campus center">
                    <AdminInput
                      type="number"
                      value={policies.attendance.radiusMeters}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          attendance: { ...policies.attendance, radiusMeters: Number(e.target.value) }
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Campus Center Latitude">
                    <AdminInput
                      type="number"
                      step="any"
                      value={policies.attendance.latitude}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          attendance: { ...policies.attendance, latitude: parseFloat(e.target.value) || 0 }
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Campus Center Longitude">
                    <AdminInput
                      type="number"
                      step="any"
                      value={policies.attendance.longitude}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          attendance: { ...policies.attendance, longitude: parseFloat(e.target.value) || 0 }
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Late Arrival Threshold (Minutes)" hint="Minutes after class start before marked Late">
                    <AdminInput
                      type="number"
                      value={policies.attendance.lateThresholdMins}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          attendance: { ...policies.attendance, lateThresholdMins: Number(e.target.value) }
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Absent Cutoff (Minutes)" hint="Minutes after class start before marked Absent">
                    <AdminInput
                      type="number"
                      value={policies.attendance.absentCutoffMins}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          attendance: { ...policies.attendance, absentCutoffMins: Number(e.target.value) }
                        })
                      }
                    />
                  </FormField>
                </FormGrid>
              </SettingsSection>

              {/* Security & Sessions */}
              <SettingsSection>
                <div className="section-head">
                  <FaLock style={{ color: '#4F8EF7' }} />
                  <div>
                    <h3>Authentication, Sessions & Access Controls</h3>
                    <p>Configure staff session lifetimes and multi-factor authentication mandates.</p>
                  </div>
                </div>

                <FormGrid $columns={2}>
                  <FormField label="Session Idle Timeout (Minutes)">
                    <AdminInput
                      type="number"
                      value={policies.security.sessionTimeoutMins}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          security: { ...policies.security, sessionTimeoutMins: Number(e.target.value) }
                        })
                      }
                    />
                  </FormField>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                    <AdminCheckbox
                      label="Enforce OTP SMS Verification for Staff Logins"
                      description="Requires valid OTP code dispatch upon staff sign-in"
                      checked={policies.security.enforceStaffOtp}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          security: { ...policies.security, enforceStaffOtp: e.target.checked }
                        })
                      }
                    />

                    <AdminCheckbox
                      label="Require Strong Staff Passwords"
                      description="Enforces 8+ characters, digits, and special symbols"
                      checked={policies.security.requireStrongPassword}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          security: { ...policies.security, requireStrongPassword: e.target.checked }
                        })
                      }
                    />
                  </div>
                </FormGrid>
              </SettingsSection>

              {/* Student Self-Service & Referrals */}
              <SettingsSection>
                <div className="section-head">
                  <FaMoneyBillWave style={{ color: '#2ECC71' }} />
                  <div>
                    <h3>Student Portal Self-Service & Referral Policy</h3>
                    <p>Control student self-service submission capabilities and commission amounts.</p>
                  </div>
                </div>

                <FormGrid $columns={2}>
                  <FormField label="Default Referral Reward (PKR)">
                    <AdminInput
                      type="number"
                      value={policies.referral.defaultRewardPkr}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          referral: { ...policies.referral, defaultRewardPkr: Number(e.target.value) }
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Minimum Referral Payout Threshold (PKR)">
                    <AdminInput
                      type="number"
                      value={policies.referral.minimumPayoutThresholdPkr}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          referral: { ...policies.referral, minimumPayoutThresholdPkr: Number(e.target.value) }
                        })
                      }
                    />
                  </FormField>
                </FormGrid>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                  <AdminCheckbox
                    label="Allow Student Manual Fee Payment Proof Uploads"
                    description="Permits students to submit bank slips and transaction receipts from the portal"
                    checked={policies.studentPortal.allowReceiptUploads}
                    onChange={(e) =>
                      setPolicies({
                        ...policies,
                        studentPortal: { ...policies.studentPortal, allowReceiptUploads: e.target.checked }
                      })
                    }
                  />

                  <AdminCheckbox
                    label="Allow Student Grievance & Complaint Submissions"
                    description="Enables ticketing drawer in student portal for academic inquiries and support"
                    checked={policies.studentPortal.allowGrievanceSubmissions}
                    onChange={(e) =>
                      setPolicies({
                        ...policies,
                        studentPortal: { ...policies.studentPortal, allowGrievanceSubmissions: e.target.checked }
                      })
                    }
                  />

                  <AdminCheckbox
                    label="Allow Referral Program Link Generation"
                    description="Allows enrolled students to generate affiliate referral links"
                    checked={policies.studentPortal.allowReferralSharing}
                    onChange={(e) =>
                      setPolicies({
                        ...policies,
                        studentPortal: { ...policies.studentPortal, allowReferralSharing: e.target.checked }
                      })
                    }
                  />
                </div>
              </SettingsSection>

              {/* Submit Button */}
              {canMutate && (
                <StickySubmitBar>
                  <span>Ensure values are correct before committing to production.</span>
                  <AdminButton $variant="primary" type="submit" disabled={savingPolicies}>
                    <FaCheck /> {savingPolicies ? 'Saving Policies...' : 'Save System Policies'}
                  </AdminButton>
                </StickySubmitBar>
              )}
            </form>
          </TabContent>
        )}

        {/* TAB 4: LANDING PAGE CONTENT */}
        {activeTab === 'content' && (
          <TabContent>
            <ContentManagerWrapper>
              <ContentManager />
            </ContentManagerWrapper>
          </TabContent>
        )}

        {/* Dynamic Role & Permissions Modal */}
        <AdminRoleEditorModal
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          role={selectedRole}
          roles={roles}
          users={users}
          canMutate={canMutate}
          onSaved={loadRolesAndUsers}
        />
      </Container>
    </AdminLayout>
  );
}

const Container = styled.div`
  color: #fff;
  padding: 10px 0 40px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 24px;

  .badge {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #4f8ef7;
    background: rgba(79, 142, 247, 0.12);
    padding: 4px 10px;
    border-radius: 999px;
    margin-bottom: 8px;
    border: 1px solid rgba(79, 142, 247, 0.25);
  }

  h1 {
    margin: 0 0 6px;
    font-size: 1.85rem;
    color: #fff;
  }

  p {
    margin: 0;
    color: #9ca3af;
    font-size: 0.95rem;
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
`;

const StatBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px 16px;

  svg {
    font-size: 1.5rem;
  }

  strong {
    display: block;
    font-size: 1.1rem;
    color: #fff;
  }

  span {
    display: block;
    font-size: 0.75rem;
    color: #9ca3af;
  }
`;

const TabsBar = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
  margin-bottom: 24px;
  overflow-x: auto;
`;

const TabButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${(props) => (props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.06)')};
  background: ${(props) => (props.$active ? '#7B1F2E' : '#111318')};
  color: #fff;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    background: ${(props) => (props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.08)')};
  }
`;

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`;

const SearchBox = styled.div`
  position: relative;
  width: min(360px, 100%);

  svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
  }

  input {
    width: 100%;
    padding: 10px 14px 10px 38px;
    background: #111318;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: #fff;
    outline: none;
    font-size: 0.88rem;

    &:focus {
      border-color: #4f8ef7;
    }
  }
`;

const ToolbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ViewToggle = styled.div`
  display: flex;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;

  button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: #9ca3af;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;

    &.active {
      background: #7B1F2E;
      color: #fff;
    }
  }
`;

const RolesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const RoleCard = styled.div`
  background: #111318;
  border: 1px solid ${(props) => (props.$isSuperAdmin ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.06)')};
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .role-desc {
    margin: 0;
    color: #9ca3af;
    font-size: 0.82rem;
    line-height: 1.45;
    min-height: 38px;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    .staff-count {
      color: #9ca3af;
      font-size: 0.78rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .protected-label {
      color: #ef4444;
      font-size: 0.78rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;

    button {
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      color: #fff;
      font-size: 0.76rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
      }

      &.btn-delete {
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.25);
        background: rgba(239, 68, 68, 0.08);

        &:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
        }

        &:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      }
    }
  }
`;

const RoleBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.84rem;

  strong {
    font-weight: 600;
  }
`;

const BuiltInTag = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(239, 68, 68, 0.25);
`;

const UserCountTag = styled.span`
  font-size: 0.75rem;
  color: #9ca3af;
  display: inline-flex;
  align-items: center;
  gap: 5px;
`;

const PermissionChipsSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;

    &.chip-full {
      background: rgba(46, 204, 113, 0.12);
      color: #2ecc71;
      border: 1px solid rgba(46, 204, 113, 0.25);
    }

    &.chip-view {
      background: rgba(79, 142, 247, 0.12);
      color: #4f8ef7;
      border: 1px solid rgba(79, 142, 247, 0.25);
    }

    &.chip-none {
      background: rgba(255, 255, 255, 0.04);
      color: #9ca3af;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    &.chip-notice {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
  }
`;

const MatrixContainer = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;
`;

const MatrixTableWrapper = styled.div`
  overflow-x: auto;
  max-width: 100%;
`;

const MatrixTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;

  th, td {
    padding: 12px 14px;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.8rem;
  }

  th {
    background: #0a0a0a;
    color: #9ca3af;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    vertical-align: bottom;

    .mod-head-icon {
      display: block;
      font-size: 1.1rem;
      margin-bottom: 4px;
    }

    .mod-head-text {
      display: block;
      font-size: 0.72rem;
    }
  }

  .sticky-col {
    position: sticky;
    left: 0;
    background: #111318;
    z-index: 2;
    text-align: left;
    min-width: 190px;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
  }

  th.sticky-col {
    background: #0a0a0a;
  }

  .role-identity {
    display: flex;
    align-items: center;
    gap: 8px;

    strong {
      color: #fff;
      font-size: 0.84rem;
    }

    small {
      color: #9ca3af;
      font-size: 0.72rem;
      margin-left: auto;
    }
  }

  .perm-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 700;

    &.full {
      background: rgba(46, 204, 113, 0.15);
      color: #2ecc71;
    }

    &.view {
      background: rgba(79, 142, 247, 0.15);
      color: #4f8ef7;
    }

    &.none {
      color: #6b7280;
    }
  }

  .table-actions {
    display: flex;
    justify-content: center;
    gap: 6px;

    button {
      padding: 6px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #fff;
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.12);
      }
    }
  }

  .super-admin-row {
    background: rgba(239, 68, 68, 0.04);
  }

  .protected-text {
    color: #ef4444;
    font-size: 0.74rem;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
`;

const DepartmentInfoCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px;

  h3 {
    margin: 0 0 6px;
    font-size: 1.1rem;
    color: #fff;
  }

  p {
    margin: 0;
    color: #9ca3af;
    font-size: 0.88rem;
    line-height: 1.5;
  }
`;

const DeptsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1000px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const DeptCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;

  .dept-header {
    padding: 16px;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    border-left: 4px solid;

    h4 {
      margin: 0 0 4px;
      font-size: 1rem;
      color: #fff;
    }

    .dept-path {
      color: #9ca3af;
      font-family: monospace;
      font-size: 0.78rem;
    }
  }

  .dept-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .dept-meta {
      margin: 0;
      font-size: 0.82rem;
      color: #9ca3af;

      strong {
        color: #d1d5db;
      }

      code {
        background: #0a0a0a;
        padding: 2px 6px;
        border-radius: 4px;
        color: #f59e0b;
        font-size: 0.78rem;
      }
    }
  }
`;

const SettingsSection = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 22px;
  margin-bottom: 20px;

  .section-head {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    svg {
      font-size: 1.4rem;
      margin-top: 2px;
    }

    h3 {
      margin: 0 0 4px;
      font-size: 1.05rem;
      color: #fff;
    }

    p {
      margin: 0;
      color: #9ca3af;
      font-size: 0.82rem;
    }
  }
`;

const StickySubmitBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px 20px;
  margin-top: 10px;

  span {
    color: #9ca3af;
    font-size: 0.85rem;
  }
`;

const ContentManagerWrapper = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 24px;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px;
  color: #9ca3af;
  font-size: 0.95rem;
`;
