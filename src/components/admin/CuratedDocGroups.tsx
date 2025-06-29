import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { loadDocGroups } from './documentService';
import type { DocGroup } from './types';
import { useAuth } from '@/contexts/AuthContext';

interface CuratedDocGroupsProps {
  // Optionally allow parent to pass handlers
  onActivate?: (group: DocGroup) => void;
  onDeactivate?: (group: DocGroup) => void;
  selectedGroups?: string[];
}

export const CuratedDocGroups = ({
  onActivate,
  onDeactivate,
  selectedGroups,
}: CuratedDocGroupsProps) => {
  const [groups, setGroups] = useState<DocGroup[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    loadDocGroups(user?.id)
      .then((gs) => {
        setGroups(gs);
        console.log('DEBUG >>>> Doc groups', gs);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [user]);

  const handleToggle = (group: DocGroup, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [group.id]: checked }));
    if (checked && onActivate) onActivate(group);
    if (!checked && onDeactivate) onDeactivate(group);
  };

  return (
    <Card className="mb-8 shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          Access Curated Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-gray-500">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-gray-500">No curated groups available.</div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Switch
                    id={`group-toggle-${group.id}`}
                    checked={
                      selectedGroups
                        ? selectedGroups.includes(group.id)
                        : !!selected[group.id]
                    }
                    onCheckedChange={(checked) => handleToggle(group, checked)}
                    disabled={!user}
                  />
                  <div>
                    <h4 className="font-semibold">{group.group_name}</h4>
                    {group.source_link && (
                      <a
                        href={group.source_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-xs"
                      >
                        External reference
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
