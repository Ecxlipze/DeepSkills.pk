import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { FaBan, FaCheck, FaEdit, FaEye, FaFileCsv, FaPlus, FaShieldAlt, FaTimes, FaUsers } from 'react-icons/fa';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { downloadCsv } from '../utils/csvExport';
import { canAccess, getRoleColor, getRoleLabel, MODULE_KEYS } from '../utils/permissions';
import { bulkActivate, bulkRoleChange, bulkSuspend, createRole, createUser, deleteRole, fetchRoles, fetchUserActivity, fetchUserStats, fetchUsers, reactivateUser, suspendUser, updateRole, updateUser } from '../utils/userManagementApi';

const ROLE_OPTIONS = ['Admin'];
const ICON_OPTIONS = ['👤', '👔', '💼', '📞', '📋', '🔐'];
const COLOR_OPTIONS = ['purple', 'amber', 'pink', 'gray', 'blue', 'green'];
const emptyPermissions = MODULE_KEYS.reduce((acc, key) => ({ ...acc, [key]: 'none' }), {});
const emptyUserForm = { fullName: '', cnic: '', phone: '', email: '', roleValue: 'Admin', customRoleId: '', status: 'active', sendWelcomeEmail: true, accountNotes: '' };
const emptyRoleForm = { name: '', description: '', icon: '👤', color: 'gray', permissions: emptyPermissions };

const formatCnic = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
};

const relativeTime = (value) => {
  if (!value) return 'Never';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const cyclePermission = (current = 'none') => {
  if (current === 'none') return 'view';
  if (current === 'view') return 'full';
  return 'none';
};

const PermissionsMatrix = ({ permissions, onToggle }) => (
  <MatrixWrapper>
    <MatrixTable>
      <thead><tr><th>Module</th><th>Access Level</th></tr></thead>
      <tbody>
        {MODULE_KEYS.map((key) => (
          <tr key={key}>
            <td style={{ textTransform: 'capitalize' }}>{key}</td>
            <td><PermissionCell type="button" $value={permissions[key] || 'none'} onClick={() => onToggle(key)}>{(permissions[key] || 'none').toUpperCase()}</PermissionCell></td>
          </tr>
        ))}
      </tbody>
    </MatrixTable>
  </MatrixWrapper>
);

const ActivityIcon = ({ type }) => {
  const icons = { login: '🔐', role_change: '🛡️', status_change: '⚡', user_created: '✨', profile_updated: '📝' };
  return <ActivityDot>{icons[type] || '📌'}</ActivityDot>;
};

const UserModal = ({ open, title, form, setForm, roles, editing, onClose, onSubmit }) => (
  <AnimatePresence>
    {open && (
      <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <ModalCard initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
          <ModalHeader><div><h3>{title}</h3><p>Manage staff account details, custom role assignment, and access notes.</p></div><IconButton onClick={onClose}><FaTimes /></IconButton></ModalHeader>
          <ModalBody>
            <FormGrid>
              <Field><label>Full Name *</label><input value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} /></Field>
              <Field><label>CNIC *</label><input value={form.cnic} onChange={(e) => setForm((prev) => ({ ...prev, cnic: formatCnic(e.target.value) }))} /></Field>
              <Field><label>Email Address</label><input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></Field>
              <Field><label>Phone Number</label><input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} /></Field>
              <Field>
                <label>Role</label>
                <select value={form.roleValue} onChange={(e) => { const value = e.target.value; setForm((prev) => ({ ...prev, roleValue: value, customRoleId: value.startsWith('custom-role:') ? value.split(':')[1] : '' })); }}>
                  {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                  {roles.map((role) => <option key={role.id} value={`custom-role:${role.id}`}>{role.name}</option>)}
                </select>
              </Field>
              <Field><label>Account Status</label><select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></Field>
            </FormGrid>
            <Field><label>Internal Notes</label><textarea rows="3" value={form.accountNotes} onChange={(e) => setForm((prev) => ({ ...prev, accountNotes: e.target.value }))} /></Field>
            {!editing && <Checkbox><input type="checkbox" checked={form.sendWelcomeEmail} onChange={(e) => setForm((prev) => ({ ...prev, sendWelcomeEmail: e.target.checked }))} /> Send welcome login instructions email</Checkbox>}
            <PrimaryButton onClick={onSubmit}><FaShieldAlt /> {editing ? 'Save Changes' : 'Create User'}</PrimaryButton>
          </ModalBody>
        </ModalCard>
      </ModalOverlay>
    )}
  </AnimatePresence>
);

const AdminUserManagement = () => {
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'users', 'full');
  const [stats, setStats] = useState({ total: 0, admins: 0, custom: 0, adminPanelUsers: 0 });
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', role: 'all', status: 'all', lastActive: 'any' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRolePanel, setShowRolePanel] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [activityTarget, setActivityTarget] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const pageSize = 20;
  const loadPage = async () => {
    setLoading(true);
    try {
      const [{ data, count: totalCount }, statData, roleData] = await Promise.all([
        fetchUsers({
          tab: 'all',
          search: filters.search,
          role: tab === 'all' ? filters.role : tab,
          status: filters.status,
          lastActive: filters.lastActive,
          page,
          pageSize
        }),
        fetchUserStats(),
        fetchRoles()
      ]);
      setUsers(data);
      setCount(totalCount);
      setStats(statData);
      setRoles(roleData.filter((role) => role.name !== 'Student' && role.name !== 'Teacher'));
    } catch (error) {
      toast.error(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPage(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, filters.search, filters.role, filters.status, filters.lastActive]);
  useEffect(() => {
    if (!activityTarget) return;
    fetchUserActivity(activityTarget.id, { page: 1, pageSize: 50 }).then(({ data, count: total }) => { setActivityLogs(data); setActivityTotal(total); }).catch(() => toast.error('Failed to load activity log'));
  }, [activityTarget]);

  const exportRows = (rows) => downloadCsv(`users-${tab}-${new Date().toISOString().split('T')[0]}.csv`, ['Full Name', 'Email', 'CNIC', 'Phone', 'Role', 'Status', 'Last Login', 'Joined On'], rows.map((row) => [row.full_name, row.email || '', row.cnic, row.phone || '', getRoleLabel(row.role, row.custom_roles?.name), row.status, row.last_login || '', row.created_at || '']));

  const saveUser = async () => {
    if (!canMutate) {
      toast.error('You do not have permission to modify users.');
      return;
    }
    try {
      if (editingUser) {
        await updateUser(editingUser.id, userForm, user);
        toast.success('User updated');
      } else {
        await createUser(userForm, user);
        toast.success('User added successfully');
        if (userForm.sendWelcomeEmail) toast.success('Welcome email queued');
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm(emptyUserForm);
      loadPage();
    } catch (error) {
      toast.error(error.message || 'Failed to save user');
    }
  };

  const saveRole = async () => {
    if (!canMutate) {
      toast.error('You do not have permission to modify roles.');
      return;
    }
    try {
      if (editingRole) {
        await updateRole(editingRole.id, roleForm);
        toast.success('Role updated');
      } else {
        await createRole(roleForm);
        toast.success('Role created');
      }
      setEditingRole(null);
      setRoleForm(emptyRoleForm);
      loadPage();
    } catch (error) {
      toast.error(error.message || 'Failed to save role');
    }
  };

  const runBulk = async (type) => {
    if (!selectedIds.length) return toast.error('Select at least one user');
    if (type !== 'export' && !canMutate) {
      toast.error('You do not have permission to perform bulk user updates.');
      return;
    }
    try {
      if (type === 'suspend') await bulkSuspend(selectedIds, user);
      if (type === 'activate') await bulkActivate(selectedIds, user);
      if (type === 'export') exportRows(users.filter((row) => selectedIds.includes(row.id)));
      if (type === 'role') {
        const target = window.prompt('Enter role slug or custom-role:<id>');
        if (!target) return;
        await bulkRoleChange(selectedIds, { roleValue: target, customRoleId: target.startsWith('custom-role:') ? target.split(':')[1] : '' }, user);
      }
      toast.success('Bulk action complete');
      setSelectedIds([]);
      loadPage();
    } catch (error) {
      toast.error(error.message || 'Bulk action failed');
    }
  };

  return (
    <AdminLayout>
      <Wrap>
        <Header><div><h1>User Management</h1><p>Manage admin-panel staff, existing roles, and permissions</p></div><Actions>{canMutate && <PrimaryButton onClick={() => { setEditingUser(null); setUserForm(emptyUserForm); setShowUserModal(true); }}><FaPlus /> Add User</PrimaryButton>}{canMutate && <SecondaryButton onClick={() => setShowRolePanel(true)}><FaShieldAlt /> Manage Roles</SecondaryButton>}<SecondaryButton onClick={() => exportRows(users)}><FaFileCsv /> Export All</SecondaryButton></Actions></Header>
        <StatsGrid>{[['Admin Panel Users', stats.adminPanelUsers, '#4F8EF7'], ['Admins', stats.admins, '#d1d5db'], ['Custom Roles', stats.custom, '#9ca3af']].map(([label, value, color]) => <StatCard key={label}><span>{label}</span><strong style={{ color }}>{value}</strong></StatCard>)}</StatsGrid>
        <TabRow>{[['all', `All (${stats.adminPanelUsers})`], ['admin', `Admins (${stats.admins})`], ['custom', `Custom (${stats.custom})`]].map(([key, label]) => <Tab key={key} $active={tab === key} onClick={() => { setTab(key); setPage(1); }}>{label}</Tab>)}</TabRow>
        <Panel><Filters><Field><label>Search</label><input value={filters.search} onChange={(e) => { setFilters((prev) => ({ ...prev, search: e.target.value })); setPage(1); }} placeholder="name, cnic, email, phone" /></Field>{tab === 'all' && <Field><label>Role</label><select value={filters.role} onChange={(e) => { setFilters((prev) => ({ ...prev, role: e.target.value })); setPage(1); }}><option value="all">All</option>{[...ROLE_OPTIONS.map((label) => ({ value: label.toLowerCase().replace(/\s+/g, '_'), label })), { value: 'custom', label: 'Custom' }].map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}</select></Field>}<Field><label>Status</label><select value={filters.status} onChange={(e) => { setFilters((prev) => ({ ...prev, status: e.target.value })); setPage(1); }}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></Field><Field><label>Last Active</label><select value={filters.lastActive} onChange={(e) => { setFilters((prev) => ({ ...prev, lastActive: e.target.value })); setPage(1); }}><option value="any">Any time</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option></select></Field></Filters></Panel>
        <BulkBar><span>{selectedIds.length} selected</span><div>{canMutate && <SmallButton onClick={() => runBulk('suspend')}><FaBan /> Bulk Suspend</SmallButton>}{canMutate && <SmallButton onClick={() => runBulk('activate')}><FaCheck /> Bulk Activate</SmallButton>}<SmallButton onClick={() => runBulk('export')}><FaFileCsv /> Bulk Export</SmallButton>{canMutate && <SmallButton onClick={() => runBulk('role')}><FaUsers /> Bulk Role Change</SmallButton>}</div></BulkBar>
        <Panel><Table><thead><tr><th><input type="checkbox" checked={users.length > 0 && selectedIds.length === users.length} onChange={(e) => setSelectedIds(e.target.checked ? users.map((row) => row.id) : [])} /></th><th>User</th><th>CNIC</th><th>Role</th><th>Status</th><th>Last Login</th><th>Joined On</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr> : users.length === 0 ? <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40 }}>No users found.</td></tr> : users.map((row) => { const styles = getRoleColor(row.role, row.custom_roles?.color); return <tr key={row.id}><td><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id))} /></td><td><UserCell><Avatar style={{ background: styles.bg, color: styles.text, borderColor: styles.border }}>{row.full_name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</Avatar><div><strong>{row.full_name}</strong><small>{row.email || 'No email'}</small></div></UserCell></td><td>{row.cnic}</td><td><Pill style={{ background: styles.bg, color: styles.text, borderColor: styles.border }}>{getRoleLabel(row.role, row.custom_roles?.name)}</Pill></td><td><Status $status={row.status}>{row.status}</Status></td><td>{relativeTime(row.last_login)}</td><td>{row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'}</td><td><InlineActions>{canMutate && <button onClick={() => { setEditingUser(row); setUserForm({ fullName: row.full_name || '', cnic: row.cnic || '', phone: row.phone || '', email: row.email || '', roleValue: row.custom_role_id ? `custom-role:${row.custom_role_id}` : getRoleLabel(row.role), customRoleId: row.custom_role_id || '', status: row.status || 'active', sendWelcomeEmail: false, accountNotes: row.account_notes || '' }); setShowUserModal(true); }}><FaEdit /> Edit</button>}{canMutate && <button onClick={() => { if (!canMutate) return toast.error('You do not have permission to modify users.'); suspendUser(row.id, user).then(() => { toast.success('User suspended'); loadPage(); }); }}><FaBan /> Suspend</button>}{canMutate && <button onClick={() => { if (!canMutate) return toast.error('You do not have permission to modify users.'); reactivateUser(row.id, user).then(() => { toast.success('Access reset'); loadPage(); }); }}><FaCheck /> Reset Access</button>}<button onClick={() => { setActivityTarget(row); setShowActivityPanel(true); }}><FaEye /> View Activity</button></InlineActions></td></tr>; })}</tbody></Table></Panel>
        <FooterRow><span>Page {page} of {Math.max(1, Math.ceil(count / pageSize))}</span><div><SmallButton disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>Prev</SmallButton><SmallButton disabled={page >= Math.max(1, Math.ceil(count / pageSize))} onClick={() => setPage((prev) => prev + 1)}>Next</SmallButton></div></FooterRow>
        <UserModal open={showUserModal} title={editingUser ? 'Edit User' : 'Add New User'} form={userForm} setForm={setUserForm} roles={roles} editing={Boolean(editingUser)} onClose={() => setShowUserModal(false)} onSubmit={saveUser} />
        <AnimatePresence>{showRolePanel && <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><SidePanel initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}><ModalHeader><div><h3>Manage Roles</h3><p>Edit staff role permissions and create custom admin access roles.</p></div><IconButton onClick={() => setShowRolePanel(false)}><FaTimes /></IconButton></ModalHeader><PanelBody><PanelIntro>Create the staff roles you need and assign module permissions. Admin keeps full access by design and is not editable.</PanelIntro><RoleGrid>{roles.map((role) => <RoleCard key={role.id}><strong>{role.icon} {role.name}</strong><small>{role.description || 'No description'}</small><small>{users.filter((entry) => entry.custom_role_id === role.id).length} users</small><InlineActions>{canMutate && <button onClick={() => { setEditingRole(role); setRoleForm({ name: role.name, description: role.description || '', icon: role.icon || '👤', color: role.color || 'gray', permissions: { ...emptyPermissions, ...(role.permissions || {}) } }); }}>Edit</button>}<button disabled={!canMutate || users.some((entry) => entry.custom_role_id === role.id)} onClick={() => { if (!canMutate) return toast.error('You do not have permission to modify roles.'); deleteRole(role.id).then(() => { toast.success('Role deleted'); loadPage(); }); }}>Delete</button></InlineActions></RoleCard>)}</RoleGrid><SectionTitle>{editingRole ? 'Edit Role' : 'Create Role'}</SectionTitle><Field><label>Role Name</label><input value={roleForm.name} onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))} /></Field><Field><label>Description</label><textarea rows="2" value={roleForm.description} onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))} /></Field><Field><label>Icon</label><SimpleRow>{ICON_OPTIONS.map((icon) => <SmallButton key={icon} onClick={() => setRoleForm((prev) => ({ ...prev, icon }))}>{icon}</SmallButton>)}</SimpleRow></Field><Field><label>Color</label><SimpleRow>{COLOR_OPTIONS.map((color) => <SmallButton key={color} onClick={() => setRoleForm((prev) => ({ ...prev, color }))}>{color}</SmallButton>)}</SimpleRow></Field><Field><label>Permissions</label><PermissionsMatrix permissions={roleForm.permissions} onToggle={(key) => setRoleForm((prev) => ({ ...prev, permissions: { ...prev.permissions, [key]: cyclePermission(prev.permissions[key]) } }))} /></Field>{canMutate && <PrimaryButton onClick={saveRole}><FaShieldAlt /> {editingRole ? 'Update Role' : 'Create Role'}</PrimaryButton>}</PanelBody></SidePanel></ModalOverlay>}</AnimatePresence>
        <AnimatePresence>{showActivityPanel && <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><SidePanel initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}><ModalHeader><div><h3>{activityTarget?.full_name} — Activity Log</h3><p>{activityTotal} events</p></div><IconButton onClick={() => setShowActivityPanel(false)}><FaTimes /></IconButton></ModalHeader><PanelBody>{activityLogs.map((entry) => <ActivityItem key={entry.id}><ActivityIcon type={entry.event_type} /><div><strong>{entry.event_description}</strong><small>{new Date(entry.created_at).toLocaleString()}</small><small>{entry.device_info || 'Unknown device'}</small></div></ActivityItem>)}{activityLogs.length === 0 && <small>No activity found.</small>}</PanelBody></SidePanel></ModalOverlay>}</AnimatePresence>
      </Wrap>
    </AdminLayout>
  );
};

const Wrap = styled.div`color:#fff;`;
const Header = styled.div`display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:24px;h1{margin:0 0 6px;font-size:2rem;}p{margin:0;color:#9ca3af;}`;
const Actions = styled.div`display:flex;gap:12px;flex-wrap:wrap;`;
const StatsGrid = styled.div`display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;margin-bottom:24px;@media (max-width:1100px){grid-template-columns:repeat(2,minmax(0,1fr));}@media (max-width:640px){grid-template-columns:1fr;}`;
const StatCard = styled.div`background:#111318;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px;span{display:block;color:#9ca3af;margin-bottom:8px;font-size:0.85rem;}strong{font-size:1.7rem;}`;
const TabRow = styled.div`display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;`;
const Tab = styled.button`padding:10px 16px;background:${(props) => props.$active ? '#7B1F2E' : '#111318'};border:1px solid ${(props) => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.08)'};color:#fff;border-radius:999px;cursor:pointer;`;
const Panel = styled.div`background:#111318;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px;margin-bottom:18px;overflow-x:auto;`;
const Filters = styled.div`display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;@media (max-width:1100px){grid-template-columns:repeat(2,minmax(0,1fr));}@media (max-width:640px){grid-template-columns:1fr;}`;
const Field = styled.div`display:flex;flex-direction:column;gap:8px;label{font-size:0.82rem;color:#9ca3af;}input,select,textarea{background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px;color:#fff;outline:none;}`;
const BulkBar = styled.div`display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;span{color:#9ca3af;}div{display:flex;gap:10px;flex-wrap:wrap;}`;
const Table = styled.table`width:100%;border-collapse:collapse;th,td{padding:16px;border-bottom:1px solid rgba(255,255,255,0.05);text-align:left;vertical-align:middle;white-space:nowrap;}th{color:#9ca3af;font-size:0.8rem;text-transform:uppercase;}`;
const UserCell = styled.div`display:flex;align-items:center;gap:12px;strong{display:block;}small{color:#9ca3af;}`;
const Avatar = styled.div`width:42px;height:42px;border-radius:50%;border:1px solid;display:flex;align-items:center;justify-content:center;font-weight:700;`;
const Pill = styled.span`display:inline-flex;align-items:center;padding:6px 10px;border:1px solid;border-radius:999px;font-size:0.78rem;font-weight:700;`;
const Status = styled.span`display:inline-flex;padding:6px 10px;border-radius:999px;text-transform:capitalize;font-size:0.78rem;font-weight:700;background:${(props) => props.$status === 'active' ? 'rgba(46,204,113,0.14)' : props.$status === 'suspended' ? 'rgba(239,68,68,0.14)' : 'rgba(156,163,175,0.14)'};color:${(props) => props.$status === 'active' ? '#2ecc71' : props.$status === 'suspended' ? '#ef4444' : '#d1d5db'};`;
const InlineActions = styled.div`display:flex;gap:8px;flex-wrap:wrap;button{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:#fff;padding:8px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}& button:disabled{opacity:0.45;cursor:not-allowed;}`;
const FooterRow = styled.div`display:flex;justify-content:space-between;gap:12px;align-items:center;color:#9ca3af;`;
const PrimaryButton = styled.button`display:inline-flex;align-items:center;gap:8px;padding:12px 16px;background:#198754;border:none;border-radius:10px;color:#fff;cursor:pointer;font-weight:700;`;
const SecondaryButton = styled.button`display:inline-flex;align-items:center;gap:8px;padding:12px 16px;background:transparent;border:1px solid rgba(255,255,255,0.12);border-radius:10px;color:#fff;cursor:pointer;`;
const SmallButton = styled.button`display:inline-flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#fff;cursor:pointer;&:disabled{opacity:0.5;cursor:not-allowed;}`;
const ModalOverlay = styled(motion.div)`position:fixed;inset:0;background:rgba(0,0,0,0.82);display:flex;justify-content:center;align-items:center;padding:20px;z-index:1100;`;
const ModalCard = styled(motion.div)`width:min(760px,100%);background:#111318;border:1px solid rgba(255,255,255,0.08);border-radius:18px;overflow:hidden;`;
const ModalHeader = styled.div`display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,0.06);h3{margin:0 0 4px;}p{margin:0;color:#9ca3af;}`;
const ModalBody = styled.div`padding:24px;`;
const SidePanel = styled(motion.div)`margin-left:auto;width:min(460px,100%);height:100%;background:#111318;border-left:1px solid rgba(255,255,255,0.08);overflow-y:auto;`;
const PanelBody = styled.div`padding:20px 24px 28px;`;
const FormGrid = styled.div`display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:18px;@media (max-width:640px){grid-template-columns:1fr;}`;
const Checkbox = styled.label`display:flex;align-items:center;gap:10px;color:#d1d5db;margin-bottom:18px;`;
const IconButton = styled.button`width:38px;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:#fff;cursor:pointer;`;
const RoleGrid = styled.div`display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:20px;@media (max-width:640px){grid-template-columns:1fr;}`;
const RoleCard = styled.div`background:#0a0a0a;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px;small{color:#9ca3af;}`;
const SectionTitle = styled.h4`margin:0 0 10px;color:#fff;`;
const SimpleRow = styled.div`display:flex;gap:8px;flex-wrap:wrap;`;
const MatrixWrapper = styled.div`overflow-x:auto;`;
const MatrixTable = styled.table`width:100%;border-collapse:collapse;th,td{padding:12px;border-bottom:1px solid rgba(255,255,255,0.05);text-align:left;}th{color:#9ca3af;font-size:0.8rem;text-transform:uppercase;}`;
const PermissionCell = styled.button`border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;background:${(props) => props.$value === 'full' ? 'rgba(46,204,113,0.16)' : props.$value === 'view' ? 'rgba(79,142,247,0.16)' : 'rgba(239,68,68,0.16)'};color:${(props) => props.$value === 'full' ? '#2ecc71' : props.$value === 'view' ? '#4F8EF7' : '#ef4444'};cursor:pointer;`;
const ActivityItem = styled.div`display:flex;gap:12px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.05);strong{display:block;margin-bottom:6px;}small{display:block;color:#9ca3af;margin-top:3px;}`;
const ActivityDot = styled.div`width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;`;

const HelpText = styled.p`margin:0 0 18px;color:#9ca3af;font-size:0.9rem;`;
const PanelIntro = styled.p`margin:0 0 16px;color:#9ca3af;line-height:1.5;`;

export default AdminUserManagement;
