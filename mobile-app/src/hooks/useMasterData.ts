import { useEffect, useState } from 'react';
import { masterDataApi } from '@utils/apiClient';

export interface MasterDataItem {
  type: string;
  key: string;
  label: string;
  value?: string;
  metadata?: Record<string, any>;
  sortOrder?: number;
  isActive?: boolean;
}

export const useMasterData = (type: string, fallback: MasterDataItem[] = []) => {
  const [items, setItems] = useState<MasterDataItem[]>(fallback);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const res = await masterDataApi.getByType(type);
      if (!mounted) return;
      if (res.success && res.data) {
        const list = ((res.data as any).items || []).filter((item: MasterDataItem) => item.isActive !== false);
        setItems(Array.isArray(list) && list.length > 0 ? list : fallback);
      } else {
        setItems(fallback);
      }
      setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [type]);

  return { items, loading };
};

export default useMasterData;

