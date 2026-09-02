import React, { useEffect, useState, useMemo } from "react";
import { Search, Mail, Phone, MapPin, X, Users, CheckCircle, Clock } from "lucide-react";

export type FreelancerRow = {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  defaultDayRate: number | null;
  primaryRole: string;
  city: string;
  skills: string[];
  photoObjectPath?: string;
  availabilityStatus?: "full" | "partial" | "tentative" | "unavailable" | "unknown";
};

interface Props {
  getToken: () => Promise<string | null>;
}

export function CrewDirectoryPage({ getToken }: Props) {
  const [freelancers, setFreelancers] = useState<FreelancerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<FreelancerRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const token = await getToken();
        const today = new Date().toISOString().slice(0, 10);
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const params = new URLSearchParams({
          startDate: today,
          endDate: today,
          timezone,
        });
        const res = await fetch(`/api/portal/freelancers?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Failed to load freelancers");
        const json = await res.json();
        if (mounted) {
          // ensure skills is an array
          const rows = (json.freelancers || []).map((f: any) => ({
            ...f,
            skills: Array.isArray(f.skills) ? f.skills : (typeof f.skills === 'string' ? f.skills.split(',').map((s:string) => s.trim()) : [])
          }));
          setFreelancers(rows);
        }
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [getToken]);

  const filtered = useMemo(() => {
    let list = freelancers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => 
        (f.fullName || "").toLowerCase().includes(q) ||
        (f.email || "").toLowerCase().includes(q) ||
        (f.primaryRole && f.primaryRole.toLowerCase().includes(q)) ||
        (f.city && f.city.toLowerCase().includes(q)) ||
        (f.skills && f.skills.some(s => s.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [freelancers, search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/portal/freelancers/${encodeURIComponent(editingUser.userId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          fullName: editingUser.fullName,
          email: editingUser.email,
          phone: editingUser.phone,
          defaultDayRate: editingUser.defaultDayRate,
          primaryRole: editingUser.primaryRole,
          city: editingUser.city,
          skills: editingUser.skills
        })
      });
      if (!res.ok) throw new Error("Failed to save changes");
      const json = await res.json();
      const updated = json.freelancer as Partial<FreelancerRow> | undefined;
      if (!updated) throw new Error("The server did not return the updated profile");
      setFreelancers(prev => prev.map(f =>
        f.userId === editingUser.userId
          ? { ...f, ...updated, userId: editingUser.userId, skills: Array.isArray(updated.skills) ? updated.skills : f.skills }
          : f
      ));
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const photoUrl = (userId: string) => {
    const baseUrl =
      (typeof import.meta !== "undefined" &&
        (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
      "/";
    return `${baseUrl}api/portal/freelancers/${encodeURIComponent(userId)}/photo`;
  };

  useEffect(() => {
    if (!editingUser) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setEditingUser(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editingUser, saving]);

  return (
    <div style={{ padding: "0 16px 40px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 300, margin: "0 0 8px 0", color: "var(--text-main)" }}>
            Global Crew Directory
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
            Central roster of all EHS freelancers.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="ehs-search-input" style={{ maxWidth: 400 }}>
          <Search size={16} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search by name, role, city, or skills..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          Loading directory...
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--danger)", fontSize: 14 }}>
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ehs-empty-state">
          <div className="ehs-empty-state-icon">
            <Users size={24} />
          </div>
          <h3>No crew found</h3>
          <p>No freelancers match your search criteria.</p>
        </div>
      ) : (
        <div className="crew-grid">
          {filtered.map(f => (
            <button key={f.userId} type="button" className="crew-card" onClick={() => setEditingUser(f)}>
              <div className="crew-card-head">
                <div className="crew-avatar">
                  {f.photoObjectPath ? <img src={photoUrl(f.userId)} alt="" /> : getInitials(f.fullName)}
                </div>
                <div className="crew-info">
                  <h4>{f.fullName}</h4>
                  <p>{f.primaryRole || "Freelancer"}</p>
                </div>
              </div>
              <div className="crew-meta">
                {f.city && (
                  <div className="crew-meta-item">
                    <MapPin size={12} /> {f.city}
                  </div>
                )}
                {f.email && (
                  <div className="crew-meta-item">
                    <Mail size={12} /> {f.email}
                  </div>
                )}
                {f.phone && (
                  <div className="crew-meta-item">
                    <Phone size={12} /> {f.phone}
                  </div>
                )}
                <div className="crew-meta-item" style={{ marginTop: 4 }}>
                  {f.availabilityStatus === "unavailable" ? (
                    <><Clock size={12} color="var(--warning)" /> <span style={{ color: "var(--warning)" }}>Unavailable today</span></>
                  ) : f.availabilityStatus === "tentative" || f.availabilityStatus === "partial" ? (
                    <><Clock size={12} color="var(--warning)" /> <span style={{ color: "var(--warning)" }}>Limited today</span></>
                  ) : f.availabilityStatus === "full" ? (
                    <><CheckCircle size={12} color="var(--success)" /> <span style={{ color: "var(--success)" }}>Available today</span></>
                  ) : (
                    <><Clock size={12} color="var(--text-muted)" /> <span>Availability unknown</span></>
                  )}
                </div>
              </div>
              {f.skills && f.skills.length > 0 && (
                <div className="crew-skills">
                  {f.skills.slice(0, 4).map((s, i) => (
                    <span key={i} className="crew-skill-pill">{s}</span>
                  ))}
                  {f.skills.length > 4 && <span className="crew-skill-pill">+{f.skills.length - 4}</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {editingUser && (
        <div className="ehs-modal-backdrop" onClick={() => !saving && setEditingUser(null)}>
          <div className="ehs-modal" role="dialog" aria-modal="true" aria-labelledby="crew-edit-title" onClick={e => e.stopPropagation()}>
            <div className="ehs-modal-header">
              <h3 id="crew-edit-title">Edit Freelancer Profile</h3>
              <button className="ehs-ghost-btn" style={{ padding: 4 }} onClick={() => setEditingUser(null)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="ehs-modal-body">
                <div className="ehs-form-group">
                  <label>Full Name</label>
                  <input required className="ehs-input" value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="ehs-form-group">
                    <label>Email</label>
                    <input type="email" required className="ehs-input" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                  </div>
                  <div className="ehs-form-group">
                    <label>Phone</label>
                    <input className="ehs-input" value={editingUser.phone || ""} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="ehs-form-group">
                    <label>Primary Role</label>
                    <input className="ehs-input" value={editingUser.primaryRole || ""} onChange={e => setEditingUser({...editingUser, primaryRole: e.target.value})} />
                  </div>
                  <div className="ehs-form-group">
                    <label>City / Base</label>
                    <input className="ehs-input" value={editingUser.city || ""} onChange={e => setEditingUser({...editingUser, city: e.target.value})} />
                  </div>
                </div>
                <div className="ehs-form-group">
                  <label>Default Day Rate (NOK)</label>
                  <input type="number" className="ehs-input" value={editingUser.defaultDayRate || ""} onChange={e => setEditingUser({...editingUser, defaultDayRate: e.target.value ? Number(e.target.value) : null})} />
                </div>
                <div className="ehs-form-group">
                  <label>Skills (comma separated)</label>
                  <input className="ehs-input" value={(editingUser.skills || []).join(", ")} onChange={e => setEditingUser({...editingUser, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} />
                </div>
              </div>
              <div className="ehs-modal-footer">
                <button type="button" className="ehs-ghost-btn" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="ehs-primary-btn" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
