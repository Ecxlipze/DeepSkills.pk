import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  fetchAttendanceSettings,
  saveAttendanceSettings
} from '../utils/autoAttendance';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';

const Container = styled.div`
  color: #fff;
  padding: 20px 0;
`;

const Header = styled.div`
  margin-bottom: 28px;
  h1 { margin: 0 0 6px; font-size: 2rem; }
  p { margin: 0; color: #888; }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 440px);
  gap: 24px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 18px;
  font-size: 1.1rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #aaa;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;

  input {
    background: #090a0d;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: #fff;
    font-size: 0.95rem;
    padding: 12px;
    outline: none;
  }

  input:focus {
    border-color: #378ADD;
  }
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.035);
  border-radius: 12px;
  margin-top: 18px;
`;

const Toggle = styled.button`
  width: 58px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: ${props => props.$active ? '#2ecc71' : '#333'};
  cursor: pointer;
  padding: 4px;

  span {
    display: block;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fff;
    transform: translateX(${props => props.$active ? '26px' : '0'});
    transition: transform 0.2s;
  }
`;

const DayGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const DayButton = styled.button`
  border: 1px solid ${props => props.$active ? 'rgba(55, 138, 221, 0.55)' : 'rgba(255,255,255,0.12)'};
  background: ${props => props.$active ? 'rgba(55, 138, 221, 0.16)' : 'rgba(255,255,255,0.035)'};
  color: ${props => props.$active ? '#8ec5ff' : '#aaa'};
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
`;

const Button = styled.button`
  border: 1px solid ${props => props.$secondary ? 'rgba(255,255,255,0.12)' : 'rgba(55, 138, 221, 0.45)'};
  background: ${props => props.$secondary ? 'rgba(255,255,255,0.04)' : '#378ADD'};
  color: #fff;
  border-radius: 10px;
  padding: 12px 18px;
  cursor: pointer;
  font-weight: 800;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const MapFrame = styled.div`
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 330px;
  background: #08090c;

  iframe {
    width: 100%;
    height: 330px;
    border: 0;
    filter: grayscale(0.2) invert(0.9) hue-rotate(180deg);
  }
`;

const RadiusOverlay = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 2px solid rgba(55, 138, 221, 0.9);
  background: rgba(55, 138, 221, 0.16);
  transform: translate(-50%, -50%);
  pointer-events: none;
`;

const MapMeta = styled.div`
  margin-top: 14px;
  color: #aaa;
  line-height: 1.7;
  font-size: 0.9rem;
`;

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const normalizeSettings = (settings) => ({
  ...DEFAULT_ATTENDANCE_SETTINGS,
  ...settings,
  latitude: String(settings.latitude ?? DEFAULT_ATTENDANCE_SETTINGS.latitude),
  longitude: String(settings.longitude ?? DEFAULT_ATTENDANCE_SETTINGS.longitude),
  radiusMeters: String(settings.radiusMeters ?? DEFAULT_ATTENDANCE_SETTINGS.radiusMeters),
  maxAccuracyBufferMeters: String(settings.maxAccuracyBufferMeters ?? DEFAULT_ATTENDANCE_SETTINGS.maxAccuracyBufferMeters),
  onTimeWindowMins: String(settings.onTimeWindowMins ?? DEFAULT_ATTENDANCE_SETTINGS.onTimeWindowMins),
  lateThresholdMins: String(settings.lateThresholdMins ?? DEFAULT_ATTENDANCE_SETTINGS.lateThresholdMins),
  absentCutoffMins: String(settings.absentCutoffMins ?? DEFAULT_ATTENDANCE_SETTINGS.absentCutoffMins)
});

const AdminAttendanceSettings = () => {
  const { user } = useAuth();
  const canMutate = Boolean(user?.role === 'admin' || canAccess(user?.permissions || {}, 'attendance', 'full'));
  const [settings, setSettings] = useState(normalizeSettings(DEFAULT_ATTENDANCE_SETTINGS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await fetchAttendanceSettings();
        setSettings(normalizeSettings(saved));
      } catch (err) {
        toast.error('Failed to load attendance settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const mapUrl = useMemo(() => {
    const lat = Number(settings.latitude) || DEFAULT_ATTENDANCE_SETTINGS.latitude;
    const lng = Number(settings.longitude) || DEFAULT_ATTENDANCE_SETTINGS.longitude;
    const delta = 0.006;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [settings.latitude, settings.longitude]);

  const update = (field, value) => {
    if (!canMutate) return;
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const toggleWeekendDay = (day) => {
    if (!canMutate) return;
    setSettings((current) => {
      const currentDays = current.weekendDays || [];
      const nextDays = currentDays.includes(day)
        ? currentDays.filter((item) => item !== day)
        : [...currentDays, day];
      return { ...current, weekendDays: nextDays };
    });
  };

  const useMyLocation = () => {
    if (!canMutate) {
      toast.error('You have view-only access to attendance settings.');
      return;
    }
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update('latitude', pos.coords.latitude.toFixed(6));
        update('longitude', pos.coords.longitude.toFixed(6));
        toast.success('Location filled from this browser');
      },
      (err) => toast.error(err.message || 'Could not read location'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canMutate) {
      toast.error('You have view-only access to attendance settings.');
      return;
    }
    setSaving(true);
    try {
      await saveAttendanceSettings(settings);
      toast.success('Attendance settings saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save attendance settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <Container>
        <Header>
          <h1>Attendance Settings</h1>
          <p>Configure campus location and auto-attendance timing windows.</p>
        </Header>

        <Grid>
          <Card as="form" onSubmit={handleSubmit}>
            <SectionTitle>Institute Location</SectionTitle>
            <FormGrid>
              <Field>
                Institute Name
                <input value={settings.instituteName} onChange={(e) => update('instituteName', e.target.value)} disabled={loading || !canMutate} />
              </Field>
              <Field>
                Allowed Radius (meters)
                <input type="number" min="10" value={settings.radiusMeters} onChange={(e) => update('radiusMeters', e.target.value)} disabled={loading || !canMutate} />
              </Field>
              <Field>
                GPS Accuracy Buffer (meters)
                <input type="number" min="0" max="500" value={settings.maxAccuracyBufferMeters} onChange={(e) => update('maxAccuracyBufferMeters', e.target.value)} disabled={loading || !canMutate} />
              </Field>
              <Field>
                Latitude
                <input type="number" step="0.000001" value={settings.latitude} onChange={(e) => update('latitude', e.target.value)} disabled={loading || !canMutate} />
              </Field>
              <Field>
                Longitude
                <input type="number" step="0.000001" value={settings.longitude} onChange={(e) => update('longitude', e.target.value)} disabled={loading || !canMutate} />
              </Field>
            </FormGrid>

            {canMutate && (
              <ButtonRow>
                <Button type="button" $secondary onClick={useMyLocation} disabled={loading}>Use My Current Location</Button>
              </ButtonRow>
            )}

            <SectionTitle style={{ marginTop: 30 }}>Time Windows</SectionTitle>
            <FormGrid>
              <Field>
                On-time window before start (mins)
                <input type="number" min="0" value={settings.onTimeWindowMins} onChange={(e) => update('onTimeWindowMins', e.target.value)} disabled={loading || !canMutate} />
              </Field>
              <Field>
                Late threshold after start (mins)
                <input type="number" min="0" value={settings.lateThresholdMins} onChange={(e) => update('lateThresholdMins', e.target.value)} disabled={loading || !canMutate} />
              </Field>
              <Field>
                Absent cutoff after start (mins)
                <input type="number" min="0" value={settings.absentCutoffMins} onChange={(e) => update('absentCutoffMins', e.target.value)} disabled={loading || !canMutate} />
              </Field>
            </FormGrid>

            <div style={{ marginTop: 18 }}>
              <Field as="div">
                Weekend / no-class days
                <DayGrid>
                  {days.map((day) => (
                    <DayButton key={day} type="button" $active={(settings.weekendDays || []).includes(day)} onClick={() => toggleWeekendDay(day)} disabled={!canMutate}>
                      {day.slice(0, 3)}
                    </DayButton>
                  ))}
                </DayGrid>
              </Field>
            </div>

            <ToggleRow>
              <div>
                <strong>Auto-attendance active</strong>
                <div style={{ color: '#777', fontSize: '0.9rem', marginTop: 4 }}>When off, student login will not mark attendance.</div>
              </div>
              <Toggle type="button" $active={settings.isActive} onClick={() => update('isActive', !settings.isActive)} disabled={!canMutate}>
                <span />
              </Toggle>
            </ToggleRow>

            <ButtonRow>
              {canMutate ? (
                <Button type="submit" disabled={saving || loading}>{saving ? 'Saving...' : 'Save Attendance Settings'}</Button>
              ) : (
                <span style={{ color: '#888', fontSize: '0.85rem' }}>View-only access: changes cannot be saved</span>
              )}
            </ButtonRow>
          </Card>

          <Card>
            <SectionTitle>Map Preview</SectionTitle>
            <MapFrame>
              <iframe title="Attendance location map" src={mapUrl} loading="lazy" />
              <RadiusOverlay />
            </MapFrame>
            <MapMeta>
              <strong>{settings.instituteName}</strong><br />
              Center: {settings.latitude}, {settings.longitude}<br />
              Allowed radius: {settings.radiusMeters} meters<br />
              GPS buffer cap: {settings.maxAccuracyBufferMeters} meters
            </MapMeta>
          </Card>
        </Grid>
      </Container>
    </AdminLayout>
  );
};

export default AdminAttendanceSettings;
