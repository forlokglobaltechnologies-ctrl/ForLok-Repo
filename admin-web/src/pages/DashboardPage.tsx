import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import KpiCard from '../components/KpiCard';
import PageCard from '../components/PageCard';
import DataTable from '../components/DataTable';
import { apiCall, getDataPayload } from '../lib/http';
import { readItems } from '../lib/normalize';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, realtimeRes] = await Promise.all([
          apiCall(API_ENDPOINTS.DASHBOARD_STATS),
          apiCall(API_ENDPOINTS.ANALYTICS.REALTIME),
        ]);
        const s = getDataPayload(statsRes);
        const r = getDataPayload(realtimeRes);
        setStats(s || {});
        setRecentActivity(readItems(r?.recentActivity ? { data: r.recentActivity } : r));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="bg-light rounded p-4">Loading dashboard...</div>;
  }

  return (
    <>
      <div className="row g-4 mb-4">
        <KpiCard icon="bi bi-people" title="Total Users" value={stats?.users?.total || 0} />
        <KpiCard icon="bi bi-person-check" title="Active Users" value={stats?.users?.active || 0} />
        <KpiCard icon="bi bi-receipt" title="Total Bookings" value={stats?.bookings?.total || 0} />
        <KpiCard icon="bi bi-currency-rupee" title="Total Revenue" value={`₹${stats?.revenue?.total || 0}`} />
      </div>

      <PageCard title="Recent Activity" subtitle="Latest admin-side transactional events">
        <DataTable
          rows={recentActivity.slice(0, 12)}
          columns={[
            { key: 'bookingId', label: 'Reference' },
            { key: 'type', label: 'Type' },
            {
              key: 'name',
              label: 'User',
              render: (row) => row.passengerName || row.driverName || '-',
            },
            {
              key: 'amount',
              label: 'Amount',
              render: (row) => `₹${row.amount || row.totalAmount || 0}`,
            },
            {
              key: 'createdAt',
              label: 'Date',
              render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'),
            },
          ]}
        />
      </PageCard>
    </>
  );
}
