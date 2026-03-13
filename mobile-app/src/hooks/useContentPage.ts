import { useEffect, useState } from 'react';
import { contentApi } from '@utils/apiClient';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';

const mergePrefill = (defaultValue: any, currentValue: any): any => {
  if (currentValue === undefined || currentValue === null || currentValue === '') {
    return defaultValue;
  }

  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(currentValue) || currentValue.length === 0) {
      return defaultValue;
    }
    if (defaultValue.length === 0) return currentValue;
    const mergedArray: any[] = [];
    const maxLength = Math.max(defaultValue.length, currentValue.length);
    for (let i = 0; i < maxLength; i += 1) {
      if (i < currentValue.length) {
        mergedArray.push(
          i < defaultValue.length
            ? mergePrefill(defaultValue[i], currentValue[i])
            : currentValue[i]
        );
      } else {
        mergedArray.push(defaultValue[i]);
      }
    }
    return mergedArray;
  }

  if (
    defaultValue &&
    currentValue &&
    typeof defaultValue === 'object' &&
    typeof currentValue === 'object' &&
    !Array.isArray(defaultValue) &&
    !Array.isArray(currentValue)
  ) {
    const merged: Record<string, any> = { ...defaultValue, ...currentValue };
    Object.keys(defaultValue).forEach((key) => {
      merged[key] = mergePrefill(defaultValue[key], currentValue[key]);
    });
    return merged;
  }

  return currentValue;
};

const mergeWithDefault = <T = any>(defaultPayload?: T, payload?: any): T | null => {
  if (!defaultPayload && !payload) return null;
  if (!defaultPayload) return (payload as T) || null;
  if (!payload) return defaultPayload;

  return mergePrefill(defaultPayload, payload) as T;
};

export const useContentPage = <T = any>(key: string, defaultPayload?: T) => {
  const [data, setData] = useState<T | null>(mergeWithDefault(defaultPayload));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const res = await contentApi.getByKey(key);
      if (!mounted) return;
      if (res.success && res.data) {
        setData(mergeWithDefault(defaultPayload, (res.data as any).payload));
      } else {
        setData(mergeWithDefault(defaultPayload));
      }
      setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [key]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const reload = async () => {
        const res = await contentApi.getByKey(key);
        if (!active) return;
        if (res.success && res.data) {
          setData(mergeWithDefault(defaultPayload, (res.data as any).payload));
        } else {
          setData(mergeWithDefault(defaultPayload));
        }
      };
      void reload();
      return () => {
        active = false;
      };
    }, [key, defaultPayload])
  );

  return { data, loading };
};

export default useContentPage;

