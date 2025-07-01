import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';

const FEATURE_FLAG_KEY = 'add_content_collections';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ id: string; role: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [flagLoading, setFlagLoading] = useState(true);
  const [showCollectionToggles, setShowCollectionToggles] = useState(false);
  const [docGroups, setDocGroups] = useState<
    { id: string; group_name: string }[]
  >([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [groupInput, setGroupInput] = useState('');

  // Fetch profile for role check
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [user]);

  // Fetch feature flag
  useEffect(() => {
    setFlagLoading(true);
    supabase
      .from('feature_flags')
      .select('enabled')
      .eq('key', FEATURE_FLAG_KEY)
      .single()
      .then(({ data }) => {
        setShowCollectionToggles(!!data?.enabled);
        setFlagLoading(false);
      });
  }, []);

  // Fetch doc_groups
  useEffect(() => {
    supabase
      .from('doc_groups')
      .select('id, group_name')
      .order('group_name', { ascending: true })
      .then(({ data }) => {
        setDocGroups(
          (data || []).map((g) => ({
            id: String(g.id),
            group_name: g.group_name,
          }))
        );
      });
  }, []);

  // Role-based redirect
  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin') {
      navigate('/');
    }
  }, [profile, loading, navigate]);

  const handleToggle = async (checked: boolean) => {
    setFlagLoading(true);
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled: checked })
      .eq('key', FEATURE_FLAG_KEY);
    if (!error) setShowCollectionToggles(checked);
    setFlagLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (f && f.type !== 'application/pdf') {
      alert('Only PDF files are allowed.');
      return;
    }
    setFile(f);
  };

  const handleGroupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGroupInput(e.target.value);
    setSelectedGroup(e.target.value);
  };

  const handleGroupSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGroup(e.target.value);
    setGroupInput(e.target.value);
  };

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  if (!profile || profile.role !== 'admin') {
    return <div>Not authorized.</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-white">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <h2 className="text-lg font-semibold mb-4 text-gray-700">
        Feature flags
      </h2>
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Switch
            checked={showCollectionToggles}
            onCheckedChange={handleToggle}
            disabled={flagLoading}
          />
          <span className="text-base">
            Show Collection Toggles in Knowledge Base
          </span>
        </div>
      </div>
      <h2 className="text-lg font-semibold mb-4 text-gray-700">
        Create Content Collection
      </h2>
      <form className="flex flex-col gap-4 max-w-lg">
        <div className="flex flex-col gap-1">
          <label htmlFor="pdf-upload" className="font-medium">
            PDF File
          </label>
          <input
            id="pdf-upload"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="group-name" className="font-medium">
            Group Name
          </label>
          <select
            id="group-name"
            value={selectedGroup}
            onChange={handleGroupSelect}
            className="border rounded px-2 py-1"
          >
            <option value="">-- Select existing group --</option>
            {docGroups.map((g) => (
              <option key={g.id} value={g.group_name}>
                {g.group_name}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">
            Or add a new group name below:
          </span>
          <input
            type="text"
            placeholder="New group name"
            value={groupInput}
            onChange={handleGroupInputChange}
            className="border rounded px-2 py-1"
          />
        </div>
      </form>
    </div>
  );
};

export default Admin;
