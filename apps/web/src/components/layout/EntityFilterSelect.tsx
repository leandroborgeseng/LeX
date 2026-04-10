import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import api from '@/lib/api';
import { usePreferences } from '@/lib/preferences';
import { cn } from '@/lib/utils';

type Entity = { id: string; name: string; type: string };

export function EntityFilterSelect({ className }: { className?: string }) {
  const { entityFilterId, setEntityFilterId } = usePreferences();
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    api.get<Entity[]>('/financial-entities').then((r) => setEntities(r.data));
  }, []);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <select
        aria-label="Filtrar por entidade"
        className="max-w-[200px] min-h-9 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs md:max-w-[220px] md:text-sm touch-manipulation"
        value={entityFilterId ?? ''}
        onChange={(e) => setEntityFilterId(e.target.value || null)}
      >
        <option value="">Todas as entidades</option>
        {entities.map((en) => (
          <option key={en.id} value={en.id}>
            {en.name} ({en.type})
          </option>
        ))}
      </select>
    </div>
  );
}
