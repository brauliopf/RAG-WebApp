import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { loadDocGroups } from './documentService';
import type { DocGroup } from './types';

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

  useEffect(() => {
    setLoading(true);
    loadDocGroups()
      .then((gs) => {
        setGroups(gs);
        // Optionally initialize selected state here
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (group: DocGroup, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [group.id]: checked }));
    if (checked && onActivate) onActivate(group);
    if (!checked && onDeactivate) onDeactivate(group);
  };

  return (
    <Card className="mb-8 shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          Access Curated Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-gray-500">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-gray-500">No curated groups available.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center gap-4">
                <Switch
                  id={`group-toggle-${group.id}`}
                  checked={
                    selectedGroups
                      ? selectedGroups.includes(group.id)
                      : !!selected[group.id]
                  }
                  onCheckedChange={(checked) => handleToggle(group, checked)}
                />
                <Label
                  htmlFor={`group-toggle-${group.id}`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span>
                    {group.group_name} (Source:
                    {group.source_link && (
                      <a
                        href={group.source_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-xs"
                      >
                        {group.source_link}
                      </a>
                    )}
                    )
                  </span>
                </Label>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
