import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { loadDocGroupsFromDB } from './documentService';
import type { DocGroup } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { LibraryBig, SquareArrowOutUpRight } from 'lucide-react';

interface CuratedDocGroupsProps {
  // Optionally allow parent to pass handlers
  onActivate?: (group: DocGroup) => void;
  onDeactivate?: (group: DocGroup) => void;
  selectedGroups?: string[];
}

export const CuratedDocGroups = ({
  onActivate,
  onDeactivate,
}: CuratedDocGroupsProps) => {
  const [groups, setGroups] = useState<DocGroup[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    loadDocGroupsFromDB(user?.id)
      .then((gs) => {
        setGroups(gs);
        const selected = [];
        gs.forEach((g) => {
          if (g['pdocg'] && g['pdocg'].length > 0) {
            selected.push(g.id);
          }
        });
        setSelected(selected.reduce((acc, id) => ({ ...acc, [id]: true }), {}));
      })
      .catch(() => {
        setGroups([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <Card className="mb-8 shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          Curated Documents
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
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      <LibraryBig className="w-5 inline-block align-middle" />
                      <span>{group.group_name}</span>
                      {group.source_link && (
                        <a
                          href={group.source_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline text-xs"
                        >
                          <SquareArrowOutUpRight className="w-4 h-4 inline-block align-middle" />
                        </a>
                      )}
                    </h4>
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
