import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  FaShieldAlt,
  FaCopy,
  FaCheck,
  FaEye,
  FaBan,
  FaMagic,
  FaTrashAlt,
  FaUsers
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  AdminModal,
  AdminModalHeader,
  AdminModalBody,
  AdminModalFooter,
  FormField,
  AdminInput,
  AdminTextarea,
  AdminButton,
  FormGrid
} from '../components/portal';
import {
  PERMISSION_CATEGORIES,
  ROLE_PRESETS,
  ICON_OPTIONS,
  COLOR_OPTIONS,
  createEmptyPermissions
} from '../utils/rolePresets';
import { ROLE_COLOR_STYLES } from '../utils/permissions';
import { createRole, updateRole, deleteRole } from '../utils/userManagementApi';

export default function AdminRoleEditorModal({
  isOpen,
  onClose,
  role,
  onSaved,
  roles = [],
  users = [],
  canMutate = true
}) {
  const isEditing = Boolean(role?.id);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '👤',
    color: 'blue',
    permissions: createEmptyPermissions()
  });
  const [loading, setLoading] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('');

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        icon: role.icon || '👤',
        color: role.color || 'blue',
        permissions: {
          ...createEmptyPermissions(),
          ...(role.permissions || {})
        }
      });
      setSelectedPresetId('');
    } else {
      setFormData({
        name: '',
        description: '',
        icon: '👤',
        color: 'blue',
        permissions: createEmptyPermissions()
      });
      setSelectedPresetId('');
    }
  }, [role, isOpen]);

  const assignedUsers = isEditing
    ? users.filter((u) => u.custom_role_id === role?.id)
    : [];

  const handleApplyPreset = (presetId) => {
    setSelectedPresetId(presetId);
    const preset = ROLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setFormData((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : preset.name,
      description: prev.description.trim() ? prev.description : preset.description,
      icon: preset.icon,
      color: preset.color,
      permissions: {
        ...createEmptyPermissions(),
        ...preset.permissions
      }
    }));
    toast.success(`Loaded preset: "${preset.name}" permissions`);
  };

  const handleSetAllPermissions = (level) => {
    setFormData((prev) => {
      const next = {};
      Object.keys(prev.permissions).forEach((k) => {
        next[k] = level;
      });
      return { ...prev, permissions: next };
    });
    toast.success(`All permissions set to ${level.toUpperCase()}`);
  };

  const handleSetCategoryPermissions = (category, level) => {
    setFormData((prev) => {
      const next = { ...prev.permissions };
      category.modules.forEach((mod) => {
        next[mod.key] = level;
      });
      return { ...prev, permissions: next };
    });
  };

  const handlePermissionChange = (moduleKey, level) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: level
      }
    }));
  };

  const handleCloneAsNew = () => {
    setFormData((prev) => ({
      ...prev,
      name: `Copy of ${prev.name}`
    }));
    toast.success('Cloned permissions to new role draft. Enter a role name and save.');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!canMutate) {
      toast.error('You do not have permission to modify roles.');
      return;
    }

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast.error('Please enter a role name.');
      return;
    }

    const duplicate = roles.find(
      (r) => r.name.toLowerCase() === trimmedName.toLowerCase() && r.id !== role?.id
    );
    if (duplicate) {
      toast.error(`A role named "${trimmedName}" already exists.`);
      return;
    }

    setLoading(true);
    try {
      let saved;
      if (isEditing) {
        saved = await updateRole(role.id, formData);
        toast.success(`Role "${trimmedName}" updated successfully`);
      } else {
        saved = await createRole(formData);
        toast.success(`Custom role "${trimmedName}" created successfully`);
      }
      if (onSaved) onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !role?.id) return;
    if (assignedUsers.length > 0) {
      toast.error(
        `Cannot delete role: ${assignedUsers.length} staff member(s) are currently assigned to this role. Please reassign them first.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete custom role "${role.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteRole(role.id);
      toast.success(`Role "${role.name}" deleted`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete role');
    } finally {
      setLoading(false);
    }
  };

  const previewColor = ROLE_COLOR_STYLES[formData.color] || ROLE_COLOR_STYLES.blue;

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} maxWidth="880px">
      <AdminModalHeader
        title={isEditing ? `Edit Role: ${role.name}` : 'Create Custom Role'}
        subtitle="Configure department capabilities and granular module permissions for staff accounts on the fly."
        icon={FaShieldAlt}
        onClose={onClose}
      />
      <AdminModalBody>
        <ModalContentWrapper>
          {/* Preset Archetypes Bar */}
          <PresetBar>
            <div className="preset-label">
              <FaMagic /> <strong>1-Click Archetype Templates:</strong>
            </div>
            <div className="preset-buttons">
              {ROLE_PRESETS.map((preset) => (
                <PresetChip
                  key={preset.id}
                  type="button"
                  $active={selectedPresetId === preset.id}
                  onClick={() => handleApplyPreset(preset.id)}
                >
                  <span>{preset.icon}</span> {preset.name}
                </PresetChip>
              ))}
            </div>
          </PresetBar>

          {/* Role Metadata Grid */}
          <SectionCard>
            <FormGrid $columns={2}>
              <FormField label="Role Title / Display Name" required>
                <AdminInput
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Senior Academic Coordinator"
                />
              </FormField>

              <FormField label="Badge & Appearance Preview">
                <BadgePreviewRow>
                  <RoleBadgePreview style={{ background: previewColor.bg, color: previewColor.text, borderColor: previewColor.border }}>
                    <span>{formData.icon}</span>
                    <strong>{formData.name || 'Role Title Preview'}</strong>
                  </RoleBadgePreview>
                  {isEditing && (
                    <UserCountBadge>
                      <FaUsers /> {assignedUsers.length} staff assigned
                    </UserCountBadge>
                  )}
                </BadgePreviewRow>
              </FormField>
            </FormGrid>

            <FormGrid $columns={2} style={{ marginTop: '14px' }}>
              <FormField label="Role Icon Picker">
                <IconPickerRow>
                  {ICON_OPTIONS.map((icon) => (
                    <IconButton
                      key={icon}
                      type="button"
                      $active={formData.icon === icon}
                      onClick={() => setFormData({ ...formData, icon })}
                    >
                      {icon}
                    </IconButton>
                  ))}
                </IconPickerRow>
              </FormField>

              <FormField label="Theme Accent Color">
                <ColorPickerRow>
                  {COLOR_OPTIONS.map((col) => (
                    <ColorButton
                      key={col.key}
                      type="button"
                      $hex={col.hex}
                      $active={formData.color === col.key}
                      onClick={() => setFormData({ ...formData, color: col.key })}
                      title={col.label}
                    />
                  ))}
                </ColorPickerRow>
              </FormField>
            </FormGrid>

            <FormField label="Role Description & Department Responsibilities" style={{ marginTop: '14px' }}>
              <AdminTextarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe role scope, operational mandate, or department context..."
              />
            </FormField>
          </SectionCard>

          {/* Quick-Set Permissions Toolbar */}
          <PermissionsToolbar>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Granular Permission Matrix</h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
                Control access to each portal module: <strong>None</strong> (denied), <strong>View</strong> (read-only), or <strong>Full</strong> (modify/manage).
              </p>
            </div>
            <QuickActionsGroup>
              <QuickButton type="button" $level="full" onClick={() => handleSetAllPermissions('full')}>
                <FaCheck /> All Full
              </QuickButton>
              <QuickButton type="button" $level="view" onClick={() => handleSetAllPermissions('view')}>
                <FaEye /> All View
              </QuickButton>
              <QuickButton type="button" $level="none" onClick={() => handleSetAllPermissions('none')}>
                <FaBan /> Clear All
              </QuickButton>
            </QuickActionsGroup>
          </PermissionsToolbar>

          {/* Categorized Permission Matrix */}
          <CategoriesContainer>
            {PERMISSION_CATEGORIES.map((category) => (
              <CategoryCard key={category.id}>
                <CategoryHeader>
                  <div className="cat-title-block">
                    <span className="cat-icon">{category.icon}</span>
                    <div>
                      <h4>{category.label}</h4>
                      <p>{category.description}</p>
                    </div>
                  </div>
                  <CategoryQuickActions>
                    <span className="quick-label">Category:</span>
                    <button
                      type="button"
                      onClick={() => handleSetCategoryPermissions(category, 'full')}
                      className="cat-btn full"
                    >
                      All Full
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetCategoryPermissions(category, 'view')}
                      className="cat-btn view"
                    >
                      All View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetCategoryPermissions(category, 'none')}
                      className="cat-btn none"
                    >
                      None
                    </button>
                  </CategoryQuickActions>
                </CategoryHeader>

                <ModulesList>
                  {category.modules.map((mod) => {
                    const currentLevel = formData.permissions[mod.key] || 'none';
                    return (
                      <ModuleRow key={mod.key}>
                        <div className="mod-info">
                          <span className="mod-name">{mod.label}</span>
                          <span className="mod-desc">{mod.description}</span>
                        </div>
                        <SegmentedControl>
                          <SegmentButton
                            type="button"
                            $level="none"
                            $active={currentLevel === 'none'}
                            onClick={() => handlePermissionChange(mod.key, 'none')}
                          >
                            <FaBan /> None
                          </SegmentButton>
                          <SegmentButton
                            type="button"
                            $level="view"
                            $active={currentLevel === 'view'}
                            onClick={() => handlePermissionChange(mod.key, 'view')}
                          >
                            <FaEye /> View
                          </SegmentButton>
                          <SegmentButton
                            type="button"
                            $level="full"
                            $active={currentLevel === 'full'}
                            onClick={() => handlePermissionChange(mod.key, 'full')}
                          >
                            <FaCheck /> Full
                          </SegmentButton>
                        </SegmentedControl>
                      </ModuleRow>
                    );
                  })}
                </ModulesList>
              </CategoryCard>
            ))}
          </CategoriesContainer>
        </ModalContentWrapper>
      </AdminModalBody>

      <AdminModalFooter>
        <FooterLeft>
          {isEditing && (
            <>
              <AdminButton
                $variant="secondary"
                type="button"
                onClick={handleCloneAsNew}
                title="Duplicate this role configuration into a new role draft"
              >
                <FaCopy /> Clone as New
              </AdminButton>
              {canMutate && !role.is_builtin && (
                <DeleteButton
                  type="button"
                  onClick={handleDelete}
                  disabled={assignedUsers.length > 0}
                  title={
                    assignedUsers.length > 0
                      ? 'Reassign active staff members before deleting'
                      : 'Delete this custom role'
                  }
                >
                  <FaTrashAlt /> Delete Role
                </DeleteButton>
              )}
            </>
          )}
        </FooterLeft>

        <FooterRight>
          <AdminButton $variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </AdminButton>
          <AdminButton
            $variant="primary"
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canMutate}
          >
            <FaShieldAlt /> {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Role'}
          </AdminButton>
        </FooterRight>
      </AdminModalFooter>
    </AdminModal>
  );
}

const ModalContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const PresetBar = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .preset-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: #f59e0b;
  }

  .preset-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
`;

const PresetChip = styled.button`
  background: ${(props) => (props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.05)')};
  border: 1px solid ${(props) => (props.$active ? '#a0283a' : 'rgba(255, 255, 255, 0.1)')};
  color: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;

  &:hover {
    background: ${(props) => (props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.1)')};
    border-color: rgba(255, 255, 255, 0.25);
  }
`;

const SectionCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 18px;
`;

const BadgePreviewRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 42px;
  flex-wrap: wrap;
`;

const RoleBadgePreview = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.88rem;

  strong {
    font-weight: 600;
  }
`;

const UserCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #9ca3af;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const IconPickerRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const IconButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${(props) => (props.$active ? 'rgba(123, 31, 46, 0.35)' : 'rgba(255, 255, 255, 0.04)')};
  border: 1px solid ${(props) => (props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.08)')};
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const ColorPickerRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-height: 36px;
`;

const ColorButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${(props) => props.$hex};
  border: 2px solid ${(props) => (props.$active ? '#fff' : 'transparent')};
  cursor: pointer;
  box-shadow: ${(props) => (props.$active ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : 'none')};
  transition: all 0.15s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const PermissionsToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  flex-wrap: wrap;
`;

const QuickActionsGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const QuickButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.15s ease;

  ${(props) =>
    props.$level === 'full' &&
    `
    background: rgba(46, 204, 113, 0.12);
    color: #2ecc71;
    border-color: rgba(46, 204, 113, 0.25);
    &:hover { background: rgba(46, 204, 113, 0.2); }
  `}

  ${(props) =>
    props.$level === 'view' &&
    `
    background: rgba(79, 142, 247, 0.12);
    color: #4F8EF7;
    border-color: rgba(79, 142, 247, 0.25);
    &:hover { background: rgba(79, 142, 247, 0.2); }
  `}

  ${(props) =>
    props.$level === 'none' &&
    `
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.25);
    &:hover { background: rgba(239, 68, 68, 0.2); }
  `}
`;

const CategoriesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const CategoryCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;
`;

const CategoryHeader = styled.div`
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .cat-title-block {
    display: flex;
    align-items: center;
    gap: 10px;

    .cat-icon {
      font-size: 1.3rem;
    }

    h4 {
      margin: 0;
      font-size: 0.95rem;
      color: #fff;
    }

    p {
      margin: 2px 0 0;
      font-size: 0.75rem;
      color: #9ca3af;
    }
  }
`;

const CategoryQuickActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  .quick-label {
    font-size: 0.72rem;
    color: #9ca3af;
    margin-right: 2px;
  }

  .cat-btn {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;

    &.full {
      background: rgba(46, 204, 113, 0.1);
      color: #2ecc71;
      border-color: rgba(46, 204, 113, 0.2);
    }
    &.view {
      background: rgba(79, 142, 247, 0.1);
      color: #4F8EF7;
      border-color: rgba(79, 142, 247, 0.2);
    }
    &.none {
      background: rgba(255, 255, 255, 0.04);
      color: #9ca3af;
      border-color: rgba(255, 255, 255, 0.08);
    }

    &:hover {
      opacity: 0.85;
    }
  }
`;

const ModulesList = styled.div`
  display: flex;
  flex-direction: column;
`;

const ModuleRow = styled.div`
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);

  &:last-child {
    border-bottom: none;
  }

  .mod-info {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .mod-name {
      font-size: 0.88rem;
      font-weight: 500;
      color: #e5e7eb;
    }

    .mod-desc {
      font-size: 0.75rem;
      color: #9ca3af;
    }
  }
`;

const SegmentedControl = styled.div`
  display: flex;
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
  flex-shrink: 0;
`;

const SegmentButton = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;

  ${(props) => {
    if (!props.$active) {
      return `
        background: transparent;
        color: #6b7280;
        &:hover {
          color: #9ca3af;
          background: rgba(255, 255, 255, 0.03);
        }
      `;
    }

    if (props.$level === 'full') {
      return `
        background: #198754;
        color: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      `;
    }

    if (props.$level === 'view') {
      return `
        background: #2563eb;
        color: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      `;
    }

    return `
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    `;
  }}
`;

const FooterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const FooterRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
`;

const DeleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
