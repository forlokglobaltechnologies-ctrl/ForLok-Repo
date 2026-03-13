import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import DataTable from '../components/DataTable';
import PageCard from '../components/PageCard';
import { apiCall, getDataPayload, http } from '../lib/http';
import { readItems } from '../lib/normalize';
import { ADMIN_PERMISSION_KEYS, hasPermission } from '../lib/permissions';
import { useAuth } from '../context/AuthContext';
import { cloneContentDefault } from '../constants/contentDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const MASTER_TYPES = [
  'vehicle_type',
  'vehicle_brand',
  'vehicle_model',
  'fuel_type',
  'transmission_type',
  'service_category',
  'faq_category',
  'help_topic_category',
  'report_bug_category',
  'language',
  'state',
  'city',
  'feedback_priority',
  'settlement_status',
  'review_type',
  'rating_bucket',
  'time_slot',
  'ride_feature',
  'sort_option',
  'booking_status',
  'pooling_offer_status',
  'rental_offer_status',
  'payment_method',
  'user_type',
  'feedback_status',
  'feedback_type',
];

const MASTER_DEFAULTS: Record<string, string[]> = {
  vehicle_type: ['car', 'bike', 'scooty'],
  vehicle_brand: ['maruti_suzuki', 'hyundai', 'tata', 'mahindra', 'kia', 'toyota', 'honda'],
  fuel_type: ['petrol', 'diesel', 'electric', 'cng'],
  transmission_type: ['manual', 'automatic'],
  service_category: ['pooling', 'rental', 'food'],
  faq_category: ['account_registration', 'pooling_services', 'rental_services', 'wallet_coins'],
  help_topic_category: ['pooling', 'rental', 'trips', 'policy', 'ratings', 'account', 'wallet'],
  report_bug_category: ['ui_issue', 'crash', 'performance', 'payment', 'booking', 'other'],
  booking_status: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
  pooling_offer_status: ['active', 'pending', 'paused', 'expired', 'suspended', 'completed', 'cancelled'],
  rental_offer_status: ['active', 'booked', 'completed', 'cancelled'],
  payment_method: ['offline_cash', 'wallet'],
  user_type: ['individual', 'company'],
  feedback_status: ['pending', 'acknowledged', 'resolved', 'archived'],
  feedback_type: ['issue', 'suggestion', 'complaint'],
  feedback_priority: ['high', 'medium', 'low'],
  settlement_status: ['pending', 'settled'],
  review_type: ['passenger_to_driver', 'driver_to_passenger'],
  rating_bucket: ['4_5', '4_0', '3_5'],
  time_slot: ['morning', 'afternoon', 'evening'],
  ride_feature: ['ac', 'music', 'luggage'],
  sort_option: ['priceLow', 'priceHigh', 'rating', 'distance'],
  language: ['en', 'hi', 'te'],
};

const PAGE_SIZE = 7;

const resolvePages = (payload: any, defaultLimit = PAGE_SIZE) => {
  const explicitPages = Number(payload?.pagination?.pages || 0);
  if (explicitPages > 0) return explicitPages;
  const total = Number(payload?.pagination?.total ?? payload?.total ?? 0);
  const limit = Number(payload?.pagination?.limit ?? payload?.limit ?? defaultLimit);
  if (total > 0 && limit > 0) return Math.max(1, Math.ceil(total / limit));
  return 1;
};

const StatusTabs = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) => (
  <div className="btn-group flex-wrap">
    {options.map((option) => (
      <button
        key={option}
        className={`btn btn-sm ${value === option ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onChange(option)}
      >
        {option}
      </button>
    ))}
  </div>
);

export function UsersPage() {
  const { admin } = useAuth();
  const canManage = hasPermission(admin?.role, admin?.permissions, 'users:manage');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const query: Record<string, any> = { page, limit: PAGE_SIZE };
      if (filter === 'individual' || filter === 'company') query.userType = filter;
      if (filter === 'verified') query.verified = 'true';
      if (filter === 'pending') query.status = 'pending';
      if (filter === 'suspended') query.status = 'inactive';
      if (search.trim()) query.search = search.trim();
      const [res, pendingRes] = await Promise.allSettled([
        apiCall(API_ENDPOINTS.USERS, { query }),
        apiCall(API_ENDPOINTS.USERS, { query: { page: 1, limit: PAGE_SIZE, status: 'pending' } }),
      ]);
      const payload = res.status === 'fulfilled' ? getDataPayload(res.value) : {};
      const pendingPayload = pendingRes.status === 'fulfilled' ? getDataPayload(pendingRes.value) : {};
      setRows(readItems(payload));
      setPages(resolvePages(payload));
      setPendingCount(Number(pendingPayload?.pagination?.total || readItems(pendingPayload).length || 0));
    } catch (_error) {
      setRows([]);
      setPages(1);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, filter, search]);

  const runAction = async (path: string, userId: string, label: string) => {
    if (!window.confirm(`${label} this user?`)) return;
    await apiCall(path, { method: 'PUT', params: { userId } });
    await load();
  };

  return (
    <>
      <div className="requests-header mb-3">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h5 className="mb-1">User Management</h5>
            <p className="mb-0 small text-body-secondary">Manage registered companies and user access</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-sm btn-outline-secondary"><i className="bi bi-tag me-1"></i>Referral Management</button>
            <button className="btn btn-sm btn-primary"><i className="bi bi-person-plus me-1"></i>New User Request</button>
            <span className="pending-pill"><i className="bi bi-clock me-1"></i>{pendingCount} Pending</span>
          </div>
        </div>
      </div>

      <PageCard>
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
          <div className="table-search-box">
            <i className="bi bi-search"></i>
            <input className="form-control form-control-sm" placeholder="Search by name / company / phone / user id" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-body-secondary mb-0 d-flex align-items-center"><i className="bi bi-funnel"></i></span>
            <select className="form-select form-select-sm table-filter-select" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="individual">Individual</option>
              <option value="company">Company</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </PageCard>

      {loading ? 'Loading...' : <DataTable rows={rows} tableMinHeight={460} pagination={{ page, total: pages, onPage: setPage }} columns={[{ key: 'userId', label: 'User ID' }, { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'userType', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'verified', label: 'Verified', render: (row) => String(!!row.verified) }, { key: 'actions', label: 'Actions', render: (row) => canManage ? <div className="d-flex gap-2"><button className="btn btn-sm btn-success" onClick={() => runAction(API_ENDPOINTS.USER_VERIFY, row.userId, 'Verify')}>Verify</button><button className="btn btn-sm btn-warning" onClick={() => runAction(API_ENDPOINTS.USER_SUSPEND, row.userId, 'Suspend')}>Suspend</button><button className="btn btn-sm btn-primary" onClick={() => runAction(API_ENDPOINTS.USER_ACTIVATE, row.userId, 'Activate')}>Activate</button></div> : '-' }]} />}
    </>
  );
}

const OffersPage = ({ rental = false }: { rental?: boolean }) => {
  const { admin } = useAuth();
  const canModerate = hasPermission(admin?.role, admin?.permissions, 'offers:moderate');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const base = rental ? API_ENDPOINTS.RENTAL_OFFERS : API_ENDPOINTS.POOLING_OFFERS;
  const approve = rental ? API_ENDPOINTS.RENTAL_APPROVE : API_ENDPOINTS.POOLING_APPROVE;
  const suspend = rental ? API_ENDPOINTS.RENTAL_SUSPEND : API_ENDPOINTS.POOLING_SUSPEND;

  const load = async () => {
    setLoading(true);
    try {
      const query: Record<string, any> = { page, limit: PAGE_SIZE };
      if (status !== 'all') query.status = status;
      const res = await apiCall(base, { query });
      const payload = getDataPayload(res);
      setRows(readItems(payload));
      setPages(resolvePages(payload));
    } catch (_error) {
      setRows([]);
      setPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, page, rental]);

  const act = async (path: string, offerId: string, label: string) => {
    if (!window.confirm(`${label} this offer?`)) return;
    await apiCall(path, { method: 'PUT', params: { offerId }, body: {} });
    await load();
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.offerId, row.driverName, row.userName, row.status, row.pickupAddress, row.dropAddress]
        .some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => String(r.status || '').toLowerCase() === 'active').length;
    const pending = rows.filter((r) => String(r.status || '').toLowerCase() === 'pending').length;
    const suspended = rows.filter((r) => String(r.status || '').toLowerCase() === 'suspended').length;
    return { total, active, pending, suspended };
  }, [rows]);

  return (
    <>
      <div className="requests-header mb-3">
        <h5 className="mb-1">{rental ? 'Rental Management' : 'Pooling Management'}</h5>
      </div>
      <div className="row g-3 mb-3">
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">Total</div><div className="details-kpi-value">{stats.total}</div></div></div>
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">Active</div><div className="details-kpi-value">{stats.active}</div></div></div>
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">Pending</div><div className="details-kpi-value">{stats.pending}</div></div></div>
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">Suspended</div><div className="details-kpi-value">{stats.suspended}</div></div></div>
      </div>
      <PageCard>
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap filters-card">
          <div className="table-search-box">
            <i className="bi bi-search"></i>
            <input className="form-control form-control-sm" placeholder="Search offers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-body-secondary mb-0 d-flex align-items-center"><i className="bi bi-funnel"></i></span>
            <select className="form-select form-select-sm table-filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </PageCard>
      {loading ? 'Loading...' : <DataTable rows={filteredRows} tableMinHeight={460} pagination={{ page, total: pages, onPage: setPage }} columns={[{ key: 'offerId', label: 'Offer ID' }, { key: 'driverName', label: 'Driver', render: (row) => row.driverName || row.userName || '-' }, { key: 'route', label: 'Route', render: (row) => `${row.from?.city || row.pickupAddress || '-'} -> ${row.to?.city || row.dropAddress || '-'}` }, { key: 'vehicle', label: 'Vehicle', render: (row) => row.vehicleType || row.vehicleName || row.vehicleNumber || '-' }, { key: 'seats', label: 'Seats', render: (row) => row.availableSeats != null ? `${row.availableSeats}/${row.totalSeats || row.seats || '-'}` : row.seats || '-' }, { key: 'date', label: 'Date/Time', render: (row) => row.departureDateTime ? new Date(row.departureDateTime).toLocaleString() : (row.createdAt ? new Date(row.createdAt).toLocaleString() : '-') }, { key: 'status', label: 'Status' }, { key: 'pricePerSeat', label: 'Price', render: (row) => `₹${row.pricePerSeat || row.price || 0}` }, { key: 'actions', label: 'Actions', render: (row) => canModerate ? <div className="d-flex gap-2"><button className="btn btn-sm btn-success" onClick={() => act(approve, row.offerId, 'Approve')}>Approve</button><button className="btn btn-sm btn-warning" onClick={() => act(suspend, row.offerId, 'Suspend')}>Suspend</button></div> : '-' }]} />}
    </>
  );
};

export const PoolingPage = () => <OffersPage />;
export const RentalPage = () => <OffersPage rental />;

export function BookingsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [serviceType, setServiceType] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState({
    total: 0,
    totalRevenue: 0,
    poolingCount: 0,
    rentalCount: 0,
    poolingRevenue: 0,
    rentalRevenue: 0,
  });

  const load = async () => {
    setLoading(true);
    try {
      const query: Record<string, any> = { page, limit: PAGE_SIZE };
      if (serviceType !== 'all') query.serviceType = serviceType;
      const [bookingsRes, dashboardRes, financialRes] = await Promise.allSettled([
        apiCall(API_ENDPOINTS.BOOKINGS, { query }),
        apiCall(API_ENDPOINTS.DASHBOARD_STATS),
        apiCall(API_ENDPOINTS.ANALYTICS.FINANCIAL, { query: { period: 'month' } }),
      ]);
      const payload = bookingsRes.status === 'fulfilled' ? getDataPayload(bookingsRes.value) : {};
      const dash = dashboardRes.status === 'fulfilled' ? getDataPayload(dashboardRes.value) || {} : {};
      const fin = financialRes.status === 'fulfilled' ? getDataPayload(financialRes.value) || {} : {};
      const bookingStats = dash?.bookings || {};
      const breakdown = fin?.breakdown || {};
      setRows(readItems(payload));
      setPages(resolvePages(payload));
      setSummary({
        total: Number(bookingStats?.total || bookingStats?.totalBookings || 0),
        totalRevenue: Number(fin?.totalRevenue || 0),
        poolingCount: Number(bookingStats?.pooling || breakdown?.poolingCount || 0),
        rentalCount: Number(bookingStats?.rental || breakdown?.rentalCount || 0),
        poolingRevenue: Number(breakdown?.pooling || fin?.poolingRevenue || 0),
        rentalRevenue: Number(breakdown?.rental || fin?.rentalRevenue || 0),
      });
    } catch (_error) {
      setRows([]);
      setPages(1);
      setSummary({
        total: 0,
        totalRevenue: 0,
        poolingCount: 0,
        rentalCount: 0,
        poolingRevenue: 0,
        rentalRevenue: 0,
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [serviceType, page]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.bookingId, row.status, row.serviceType, row.userName, row.driverName].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [rows, search]);

  return (
    <>
      <div className="requests-header mb-3"><h5 className="mb-1">Bookings History</h5></div>
      <div className="row g-3 mb-3">
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">Total Bookings</div><div className="details-kpi-value">{summary.total}</div></div></div>
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">Total Revenue</div><div className="details-kpi-value">₹{summary.totalRevenue}</div></div></div>
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">Pooling Bookings</div><div className="details-kpi-value">{summary.poolingCount}</div></div></div>
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">Rental Bookings</div><div className="details-kpi-value">{summary.rentalCount}</div></div></div>
      </div>
      <div className="row g-3 mb-3">
        <div className="col-md-6"><div className="details-kpi"><div className="details-kpi-label">Pooling Revenue</div><div className="details-kpi-value">₹{summary.poolingRevenue}</div></div></div>
        <div className="col-md-6"><div className="details-kpi"><div className="details-kpi-label">Rental Revenue</div><div className="details-kpi-value">₹{summary.rentalRevenue}</div></div></div>
      </div>
      <PageCard>
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap filters-card">
          <div className="table-search-box">
            <i className="bi bi-search"></i>
            <input className="form-control form-control-sm" placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-body-secondary mb-0 d-flex align-items-center"><i className="bi bi-funnel"></i></span>
            <select className="form-select form-select-sm table-filter-select" value={serviceType} onChange={(e) => { setServiceType(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="pooling">Pooling</option>
              <option value="rental">Rental</option>
            </select>
          </div>
        </div>
      </PageCard>
      {loading ? 'Loading...' : <DataTable rows={filteredRows} tableMinHeight={460} pagination={{ page, total: pages, onPage: setPage }} columns={[{ key: 'bookingId', label: 'Booking ID' }, { key: 'userName', label: 'User', render: (r) => r.user?.name || r.userName || '-' }, { key: 'route', label: 'Route', render: (r) => `${r.from?.city || r.from?.address || r.pickupAddress || '-'} -> ${r.to?.city || r.to?.address || r.dropAddress || '-'}` }, { key: 'status', label: 'Status' }, { key: 'serviceType', label: 'Service' }, { key: 'totalAmount', label: 'Amount', render: (r) => `₹${r.totalAmount || r.amount || 0}` }, { key: 'createdAt', label: 'Date', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '-') }]} />}
    </>
  );
}

export function PromosPage() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const query: Record<string, any> = { status, page, limit: PAGE_SIZE };
      const res = await apiCall(API_ENDPOINTS.PROMOS, { query });
      const payload = getDataPayload(res);
      setRows(readItems(payload));
      const total = Number(payload?.total || payload?.pagination?.total || 0);
      setPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [status, page]);

  const approve = async (submissionId: string) => {
    await apiCall(API_ENDPOINTS.PROMO_APPROVE, { method: 'PUT', params: { submissionId }, body: {} });
    await load();
  };
  const reject = async () => {
    if (!rejectTarget) return;
    await apiCall(API_ENDPOINTS.PROMO_REJECT, { method: 'PUT', params: { submissionId: rejectTarget.submissionId }, body: { reason: rejectReason || 'Does not meet requirements' } });
    setRejectTarget(null);
    setRejectReason('');
    await load();
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.submissionId, row.platform, row.status, row.userName].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [rows, search]);

  return (
    <>
      <div className="requests-header mb-3"><h5 className="mb-1">Promo Review</h5></div>
      <PageCard>
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap filters-card">
          <div className="table-search-box">
            <i className="bi bi-search"></i>
            <input className="form-control form-control-sm" placeholder="Search promos..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-body-secondary mb-0 d-flex align-items-center"><i className="bi bi-funnel"></i></span>
            <select className="form-select form-select-sm table-filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </PageCard>
      {loading ? 'Loading...' : <DataTable rows={filteredRows} tableMinHeight={460} pagination={{ page, total: pages, onPage: setPage }} columns={[{ key: 'submissionId', label: 'Submission' }, { key: 'platform', label: 'Platform' }, { key: 'status', label: 'Status' }, { key: 'userName', label: 'User' }, { key: 'coinsAwarded', label: 'Coins', render: (row) => row.coinsAwarded ?? '-' }, { key: 'reviewNote', label: 'Review Note', render: (row) => row.reviewNote || '-' }, { key: 'createdAt', label: 'Submitted', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }, { key: 'proofUrl', label: 'Proof', render: (row) => row.proofUrl ? <a href={row.proofUrl} target="_blank">Open</a> : '-' }, { key: 'actions', label: 'Actions', render: (row) => row.status === 'pending' ? <div className="d-flex gap-2"><button className="btn btn-sm btn-success" onClick={() => approve(row.submissionId)}>Approve</button><button className="btn btn-sm btn-danger" onClick={() => setRejectTarget(row)}>Reject</button></div> : '-' }]} />}
      {rejectTarget ? (
        <PageCard title={`Reject ${rejectTarget.submissionId}`} actions={<div className="d-flex gap-2"><button className="btn btn-secondary" onClick={() => setRejectTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={reject}>Submit Reject</button></div>}>
          <textarea className="form-control" rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason" />
        </PageCard>
      ) : null}
    </>
  );
}

export function FeedbackPage() {
  const { admin } = useAuth();
  const canManage = hasPermission(admin?.role, admin?.permissions, 'feedback:manage');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, pending: 0, acknowledged: 0, resolved: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const query: Record<string, any> = { page, limit: PAGE_SIZE };
      if (status !== 'all') query.status = status;
      const [res, statsRes] = await Promise.allSettled([
        apiCall(API_ENDPOINTS.FEEDBACK, { query }),
        apiCall(API_ENDPOINTS.FEEDBACK_STATS),
      ]);
      const payload = res.status === 'fulfilled' ? getDataPayload(res.value) : {};
      const statsPayload = statsRes.status === 'fulfilled' ? getDataPayload(statsRes.value) || {} : {};
      setRows(readItems(payload));
      setPages(resolvePages(payload));
      setStats({
        total: Number(statsPayload?.total || 0),
        pending: Number(statsPayload?.pending || 0),
        acknowledged: Number(statsPayload?.acknowledged || statsPayload?.in_review || 0),
        resolved: Number(statsPayload?.resolved || 0),
      });
    } catch (_error) {
      setRows([]);
      setPages(1);
      setStats({ total: 0, pending: 0, acknowledged: 0, resolved: 0 });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [status, page]);
  const changeStatus = async (feedbackId: string, nextStatus: string) => {
    await apiCall(API_ENDPOINTS.FEEDBACK_STATUS, { method: 'PUT', params: { feedbackId }, body: { status: nextStatus } });
    await load();
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.feedbackId, row.type, row.status, row.priority, row.userName].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [rows, search]);
  return (
    <>
      <div className="requests-header mb-3"><h5 className="mb-1">Feedback Management</h5></div>
      <div className="row g-3 mb-3">
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">Total</div><div className="details-kpi-value">{stats.total}</div></div></div>
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">Pending</div><div className="details-kpi-value">{stats.pending}</div></div></div>
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">In Review</div><div className="details-kpi-value">{stats.acknowledged}</div></div></div>
        <div className="col-md-3"><div className="details-kpi"><div className="details-kpi-label">Resolved</div><div className="details-kpi-value">{stats.resolved}</div></div></div>
      </div>
      <PageCard>
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap filters-card">
          <div className="table-search-box">
            <i className="bi bi-search"></i>
            <input className="form-control form-control-sm" placeholder="Search feedback..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-body-secondary mb-0 d-flex align-items-center"><i className="bi bi-funnel"></i></span>
            <select className="form-select form-select-sm table-filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </PageCard>
      {loading ? 'Loading...' : <DataTable rows={filteredRows} tableMinHeight={460} pagination={{ page, total: pages, onPage: setPage }} columns={[{ key: 'feedbackId', label: 'Feedback ID' }, { key: 'subject', label: 'Subject', render: (row) => row.subject || '-' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'priority', label: 'Priority' }, { key: 'userName', label: 'User', render: (row) => row.user?.name || row.userName || '-' }, { key: 'description', label: 'Description', render: (row) => String(row.description || row.message || '-').slice(0, 80) }, { key: 'replied', label: 'Replied', render: (row) => (row.adminResponse ? 'Yes' : 'No') }, { key: 'rating', label: 'Rating', render: (row) => row.rating ?? '-' }, { key: 'createdAt', label: 'Created', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }, { key: 'actions', label: 'Actions', render: (row) => <div className="d-flex gap-2">{canManage ? <select className="form-select form-select-sm" value={row.status || 'pending'} onChange={(e) => changeStatus(row.feedbackId, e.target.value)}><option value="pending">pending</option><option value="acknowledged">acknowledged</option><option value="resolved">resolved</option><option value="archived">archived</option></select> : null}<Link className="btn btn-sm btn-outline-secondary" to={`/feedback/${row.feedbackId}`}>View</Link></div> }]} />}
    </>
  );
}

export function FeedbackDetailsPage({ feedbackId }: { feedbackId: string }) {
  const { admin } = useAuth();
  const canManage = hasPermission(admin?.role, admin?.permissions, 'feedback:manage');
  const [data, setData] = useState<any>(null);
  const [responseText, setResponseText] = useState('');
  const [status, setStatus] = useState('pending');
  const [isSaving, setIsSaving] = useState(false);
  const [actionModal, setActionModal] = useState<null | { title: string; message: string; variant: 'success' | 'error' }>(null);

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  const parseDescriptionFields = (input?: string) => {
    const text = String(input || '').replace(/\s+/g, ' ').trim();
    if (!text) return [] as Array<{ label: string; value: string }>;
    const markers = [
      { label: 'Category', marker: 'Category' },
      { label: 'Severity', marker: 'Severity' },
      { label: 'Steps to Reproduce', marker: 'Steps to Reproduce' },
      { label: 'Expected Behavior', marker: 'Expected Behavior' },
      { label: 'Actual Behavior', marker: 'Actual Behavior' },
    ];
    const result: Array<{ label: string; value: string }> = [];
    markers.forEach((item, index) => {
      const startRegex = new RegExp(`${item.marker}\\s*:`, 'i');
      const startMatch = text.match(startRegex);
      if (!startMatch || startMatch.index === undefined) return;
      const valueStart = startMatch.index + startMatch[0].length;
      const nextSlice = text.slice(valueStart);
      let endOffset = nextSlice.length;
      for (let i = index + 1; i < markers.length; i += 1) {
        const nextRegex = new RegExp(`\\s${markers[i].marker}\\s*:`, 'i');
        const nextMatch = nextSlice.match(nextRegex);
        if (nextMatch && nextMatch.index !== undefined) {
          endOffset = Math.min(endOffset, nextMatch.index);
        }
      }
      const value = nextSlice.slice(0, endOffset).trim();
      if (value) result.push({ label: item.label, value });
    });
    return result;
  };

  const descriptionFields = useMemo(
    () => parseDescriptionFields(data?.description || data?.message),
    [data?.description, data?.message]
  );

  const load = async () => {
    try {
      const res = await apiCall(`${API_ENDPOINTS.FEEDBACK}/${feedbackId}`);
      const payload = getDataPayload(res);
      setData(payload);
      setStatus(payload?.status || 'pending');
    } catch (_error) {
      setData(null);
      setStatus('pending');
    }
  };
  useEffect(() => {
    load();
  }, [feedbackId]);

  const onUpdate = async () => {
    if (!canManage || isSaving) return;
    setIsSaving(true);
    try {
      await apiCall(API_ENDPOINTS.FEEDBACK_STATUS, { method: 'PUT', params: { feedbackId }, body: { status } });
      const nextResponse = responseText.trim();
      if (nextResponse) {
        await apiCall(API_ENDPOINTS.FEEDBACK_RESPOND, { method: 'POST', params: { feedbackId }, body: { response: nextResponse } });
        setResponseText('');
      }
      await load();
      setActionModal({
        title: 'Feedback updated',
        message: nextResponse ? 'Status and response saved successfully.' : 'Status updated successfully.',
        variant: 'success',
      });
    } catch (error: any) {
      setActionModal({
        title: 'Unable to save changes',
        message: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="requests-header mb-3 d-flex justify-content-between align-items-start gap-2">
        <div>
          <h5 className="details-page-title">Feedback Details - {feedbackId}</h5>
          <p className="mb-0 small text-body-secondary">Review issue details and update status/response</p>
        </div>
        {canManage ? <button className="btn btn-primary" onClick={onUpdate} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Actions'}</button> : null}
      </div>
      <PageCard>
        <div className="row g-3">
          <div className="col-md-4">
            <div className="details-kpi">
              <div className="details-kpi-label">Status</div>
              <div className="details-kpi-value text-capitalize">{data?.status || '-'}</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="details-kpi">
              <div className="details-kpi-label">Priority</div>
              <div className="details-kpi-value text-capitalize">{data?.priority || '-'}</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="details-kpi">
              <div className="details-kpi-label">Type</div>
              <div className="details-kpi-value text-capitalize">{data?.type || '-'}</div>
            </div>
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">User Information</label>
            <div className="details-message-box">
              <div className="row g-2 feedback-info-grid">
                <div className="col-md-6"><div className="feedback-info-item"><span className="feedback-info-label">Name</span><span className="feedback-info-value">{data?.user?.name || '-'}</span></div></div>
                <div className="col-md-6"><div className="feedback-info-item"><span className="feedback-info-label">User ID</span><span className="feedback-info-value">{data?.user?.userId || data?.userId || '-'}</span></div></div>
                <div className="col-md-6"><div className="feedback-info-item"><span className="feedback-info-label">Email</span><span className="feedback-info-value">{data?.user?.email || '-'}</span></div></div>
                <div className="col-md-6"><div className="feedback-info-item"><span className="feedback-info-label">Phone</span><span className="feedback-info-value">{data?.user?.phone || '-'}</span></div></div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Subject</label>
            <div className="details-message-box">
              {data?.subject || '-'}
            </div>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Timeline</label>
            <div className="details-message-box">
              <div className="mb-1"><strong>Submitted:</strong> {formatDate(data?.createdAt)}</div>
              <div className="mb-1"><strong>Updated:</strong> {formatDate(data?.updatedAt)}</div>
              <div><strong>Responded:</strong> {formatDate(data?.respondedAt)}</div>
            </div>
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Description</label>
            <div className="details-message-box">
              {descriptionFields.length ? (
                <div className="feedback-description-grid">
                  {descriptionFields.map((field) => (
                    <div key={field.label} className="feedback-description-item">
                      <div className="feedback-description-label">{field.label}</div>
                      <div className="feedback-description-value">{field.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                data?.description || data?.message || '-'
              )}
            </div>
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Previous Admin Response</label>
            <div className="details-message-box">
              {data?.adminResponse || '-'}
            </div>
          </div>
          {canManage ? (
            <>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Update Status</label>
                <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="pending">pending</option>
                  <option value="acknowledged">acknowledged</option>
                  <option value="resolved">resolved</option>
                  <option value="archived">archived</option>
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label fw-semibold">Response</label>
                <textarea className="form-control" rows={4} value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Type response for user..." />
                <div className="small text-body-secondary mt-1 text-end">{responseText.length}/1000</div>
              </div>
            </>
          ) : null}
        </div>
      </PageCard>
      {actionModal ? (
        <div className="app-modal-backdrop" onClick={() => setActionModal(null)}>
          <div className="app-modal-card app-message-modal" onClick={(e) => e.stopPropagation()}>
            <div className="app-message-modal-header">
              <div className="d-flex align-items-center gap-2">
                <i className={`bi ${actionModal.variant === 'success' ? 'bi-check2-circle text-primary' : 'bi-exclamation-circle text-warning'}`}></i>
                <h6 className="mb-0">{actionModal.title}</h6>
              </div>
              <button className="btn btn-sm btn-link text-secondary p-0 border-0" onClick={() => setActionModal(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="app-message-modal-body">
              <p className={`mb-0 ${actionModal.variant === 'success' ? 'text-success' : 'text-danger'}`}>{actionModal.message}</p>
            </div>
            <div className="app-message-modal-actions">
              <button className="btn app-modal-btn-cancel" onClick={() => setActionModal(null)}>Cancel</button>
              <button className="btn app-modal-btn-primary" onClick={() => setActionModal(null)}>Okay</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AnalyticsPage() {
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [today, setToday] = useState<any>({});
  const [realtime, setRealtime] = useState<any>({});
  const [trends, setTrends] = useState<any>({});
  const [pooling, setPooling] = useState<any>({});
  const [financial, setFinancial] = useState<any>({});
  const [users, setUsers] = useState<any>({});
  const [earners, setEarners] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [ratedUsers, setRatedUsers] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const [a, b, c, d, e, f, g, h] = await Promise.allSettled([
        apiCall(API_ENDPOINTS.ANALYTICS.TODAY),
        apiCall(API_ENDPOINTS.ANALYTICS.REALTIME),
        apiCall(API_ENDPOINTS.ANALYTICS.TRENDS, { query: { period } }),
        apiCall(API_ENDPOINTS.ANALYTICS.POOLING),
        apiCall(API_ENDPOINTS.ANALYTICS.FINANCIAL, { query: { period } }),
        apiCall(API_ENDPOINTS.ANALYTICS.USERS),
        apiCall(API_ENDPOINTS.ANALYTICS.LEADERBOARD_EARNERS, { query: { limit: 7 } }),
        apiCall(API_ENDPOINTS.ANALYTICS.LEADERBOARD_ACTIVE, { query: { limit: 7 } }),
      ]);
      const ratedRes = await apiCall(API_ENDPOINTS.ANALYTICS.LEADERBOARD_RATED, { query: { limit: 7 } }).catch(() => null);
      setToday(a.status === 'fulfilled' ? getDataPayload(a.value) || {} : {});
      setRealtime(b.status === 'fulfilled' ? getDataPayload(b.value) || {} : {});
      setTrends(c.status === 'fulfilled' ? getDataPayload(c.value) || {} : {});
      setPooling(d.status === 'fulfilled' ? getDataPayload(d.value) || {} : {});
      setFinancial(e.status === 'fulfilled' ? getDataPayload(e.value) || {} : {});
      setUsers(f.status === 'fulfilled' ? getDataPayload(f.value) || {} : {});
      setEarners(g.status === 'fulfilled' && Array.isArray(getDataPayload(g.value)) ? getDataPayload(g.value) : []);
      setActiveUsers(h.status === 'fulfilled' && Array.isArray(getDataPayload(h.value)) ? getDataPayload(h.value) : []);
      setRatedUsers(ratedRes && Array.isArray(getDataPayload(ratedRes)) ? getDataPayload(ratedRes) : []);
      setLastUpdated(new Date());
    } catch (_error) {
      setToday({});
      setRealtime({});
      setTrends({});
      setPooling({});
      setFinancial({});
      setUsers({});
      setEarners([]);
      setActiveUsers([]);
      setRatedUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [period]);

  useEffect(() => {
    const timer = setInterval(() => {
      apiCall(API_ENDPOINTS.ANALYTICS.REALTIME)
        .then((res) => {
          setRealtime(getDataPayload(res) || {});
          setLastUpdated(new Date());
        })
        .catch(() => undefined);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const trendLine = {
    labels: trends?.labels || [],
    datasets: [
      {
        label: 'Revenue',
        data: trends?.revenue || [],
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2,132,199,0.2)',
      },
      {
        label: 'Trips',
        data: trends?.trips || [],
        borderColor: '#f99e3c',
        backgroundColor: 'rgba(249,158,60,0.2)',
      },
    ],
  };

  const usersByTypeBar = {
    labels: ['Individual', 'Company'],
    datasets: [
      {
        label: 'Users',
        data: [users?.byType?.individual || 0, users?.byType?.company || 0],
        backgroundColor: ['#0284c7', '#f99e3c'],
        borderRadius: 8,
      },
    ],
  };

  const revenueBreakdownBar = {
    labels: ['Pooling', 'Rental'],
    datasets: [
      {
        label: 'Revenue',
        data: [financial?.breakdown?.pooling || 0, financial?.breakdown?.rental || 0],
        backgroundColor: ['#0284c7', '#51a7ea'],
        borderRadius: 8,
      },
    ],
  };

  const poolingPeakHourBar = {
    labels: (pooling?.peakHours || []).map((item: any) => `${item.hour}:00`),
    datasets: [
      {
        label: 'Trips',
        data: (pooling?.peakHours || []).map((item: any) => item.count || 0),
        backgroundColor: '#0ea5e9',
        borderRadius: 8,
      },
    ],
  };

  const leaderboardBar = (rows: any[], label: string, color: string) => ({
    labels: rows.map((r) => r.name || r.userId || '-'),
    datasets: [
      {
        label,
        data: rows.map((r) => r.value || 0),
        backgroundColor: color,
        borderRadius: 8,
      },
    ],
  });

  return (
    <>
      <div className="requests-header mb-3">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h5 className="mb-1">Analytics Dashboard</h5>
            <p className="mb-0 small text-body-secondary">
              Real-time operational charts and performance insights
              {lastUpdated ? ` • Updated ${lastUpdated.toLocaleTimeString()}` : ''}
            </p>
          </div>
          <div className="d-flex gap-2">
            <select className="form-select form-select-sm" value={period} onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}>
              <option value="week">week</option>
              <option value="month">month</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={load} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
      <PageCard actions={<StatusTabs value={tab} onChange={setTab} options={['overview', 'revenue', 'users', 'leaderboard']} />} title="Analytics Views">
        {tab === 'overview' ? (
          <>
            <div className="row g-3 mb-3">
              <div className="col-md-2"><div className="details-kpi"><div className="details-kpi-label">Active Trips</div><div className="details-kpi-value">{realtime?.activeTrips || 0}</div></div></div>
              <div className="col-md-2"><div className="details-kpi"><div className="details-kpi-label">Pending Bookings</div><div className="details-kpi-value">{realtime?.pendingBookings || 0}</div></div></div>
              <div className="col-md-2"><div className="details-kpi"><div className="details-kpi-label">Today Revenue</div><div className="details-kpi-value">₹{realtime?.todayRevenue || 0}</div></div></div>
              <div className="col-md-2"><div className="details-kpi"><div className="details-kpi-label">Today Trips</div><div className="details-kpi-value">{realtime?.todayTrips || 0}</div></div></div>
              <div className="col-md-2"><div className="details-kpi"><div className="details-kpi-label">Active Offers</div><div className="details-kpi-value">{realtime?.activeOffers || 0}</div></div></div>
              <div className="col-md-2"><div className="details-kpi"><div className="details-kpi-label">User Growth</div><div className="details-kpi-value">{today?.users?.growth || 0}%</div></div></div>
            </div>
            <Line data={trendLine} />
          </>
        ) : null}
        {tab === 'revenue' ? (
          <div className="row g-3">
            <div className="col-lg-6"><Bar data={revenueBreakdownBar} /></div>
            <div className="col-lg-6"><Bar data={poolingPeakHourBar} /></div>
            <div className="col-lg-12">
              <div className="details-kpi d-flex justify-content-between">
                <span>Total Revenue: ₹{financial?.totalRevenue || 0}</span>
                <span>Platform Earnings: ₹{financial?.platformEarnings || 0}</span>
                <span>Refunds: ₹{financial?.totalRefunds || 0}</span>
                <span>Pending Withdrawals: ₹{financial?.pendingWithdrawals || 0}</span>
              </div>
            </div>
          </div>
        ) : null}
        {tab === 'users' ? (
          <div className="row g-3">
            <div className="col-lg-6"><Bar data={usersByTypeBar} /></div>
            <div className="col-lg-6">
              <div className="details-kpi h-100 d-flex flex-column justify-content-center">
                <div className="details-kpi-label">Total Users</div>
                <div className="details-kpi-value">{users?.totalUsers || 0}</div>
                <div className="small text-body-secondary mt-2">Active: {users?.activeUsers || 0} • Verified: {users?.verifiedUsers || 0}</div>
                <div className="small text-body-secondary">New This Month: {users?.newThisMonth || 0} • Growth: {users?.growthRate || 0}%</div>
              </div>
            </div>
          </div>
        ) : null}
        {tab === 'leaderboard' ? (
          <div className="row g-3">
            <div className="col-lg-4"><Bar data={leaderboardBar(earners, 'Top Earners', '#0284c7')} /></div>
            <div className="col-lg-4"><Bar data={leaderboardBar(activeUsers, 'Most Active', '#0ea5e9')} /></div>
            <div className="col-lg-4"><Bar data={leaderboardBar(ratedUsers, 'Highest Rated', '#f99e3c')} /></div>
          </div>
        ) : null}
      </PageCard>
    </>
  );
}

export function SettingsPage() {
  const [form, setForm] = useState<Record<string, any>>({
    platformFee: 10,
    minBookingAmount: 100,
    maxBookingAmount: 50000,
    autoApproveHours: 24,
    requireManualApproval: true,
    emailNotifications: true,
    smsNotifications: false,
  });
  const [rawJson, setRawJson] = useState('{}');

  const load = async () => {
    const data = getDataPayload(await apiCall(API_ENDPOINTS.SETTINGS)) || {};
    setForm((prev) => ({ ...prev, ...data }));
    setRawJson(JSON.stringify(data, null, 2));
  };
  useEffect(() => {
    load();
  }, []);

  const saveStructured = async () => {
    await apiCall(API_ENDPOINTS.SETTINGS, { method: 'PUT', body: form });
    await load();
  };

  const resetToDefault = () => {
    setForm({
      platformFee: 10,
      minBookingAmount: 100,
      maxBookingAmount: 50000,
      autoApproveHours: 24,
      requireManualApproval: true,
      emailNotifications: true,
      smsNotifications: false,
    });
  };
  const saveJson = async () => {
    await apiCall(API_ENDPOINTS.SETTINGS, { method: 'PUT', body: JSON.parse(rawJson) });
    await load();
  };

  return (
    <>
      <PageCard title="Admin Settings" actions={<button className="btn btn-primary" onClick={saveStructured}>Save Changes</button>}>
        <div className="row g-3">
          <div className="col-12"><h6 className="mb-1">Platform Configuration</h6></div>
          <div className="col-md-4"><label className="form-label">Platform Fee (%)</label><input type="number" className="form-control" value={form.platformFee ?? 10} onChange={(e) => setForm((p) => ({ ...p, platformFee: Number(e.target.value) }))} /></div>
          <div className="col-md-4"><label className="form-label">Min Booking Amount</label><input type="number" className="form-control" value={form.minBookingAmount ?? 100} onChange={(e) => setForm((p) => ({ ...p, minBookingAmount: Number(e.target.value) }))} /></div>
          <div className="col-md-4"><label className="form-label">Max Booking Amount</label><input type="number" className="form-control" value={form.maxBookingAmount ?? 50000} onChange={(e) => setForm((p) => ({ ...p, maxBookingAmount: Number(e.target.value) }))} /></div>

          <div className="col-12 mt-2"><h6 className="mb-1">Verification Settings</h6></div>
          <div className="col-md-4"><label className="form-label">Auto Approve After (Hours)</label><input type="number" className="form-control" value={form.autoApproveHours ?? 24} onChange={(e) => setForm((p) => ({ ...p, autoApproveHours: Number(e.target.value) }))} /></div>
          <div className="col-md-4"><label className="form-check d-flex align-items-center gap-2 mt-4"><input className="form-check-input" type="checkbox" checked={!!form.requireManualApproval} onChange={(e) => setForm((p) => ({ ...p, requireManualApproval: e.target.checked }))} />Require Manual Approval</label></div>

          <div className="col-12 mt-2"><h6 className="mb-1">Notification Settings</h6></div>
          <div className="col-md-4"><label className="form-check d-flex align-items-center gap-2 mt-4"><input className="form-check-input" type="checkbox" checked={!!form.emailNotifications} onChange={(e) => setForm((p) => ({ ...p, emailNotifications: e.target.checked }))} />Email Notifications</label></div>
          <div className="col-md-4"><label className="form-check d-flex align-items-center gap-2 mt-4"><input className="form-check-input" type="checkbox" checked={!!form.smsNotifications} onChange={(e) => setForm((p) => ({ ...p, smsNotifications: e.target.checked }))} />SMS Notifications</label></div>

          <div className="col-12 mt-2"><h6 className="mb-1">Admin Account</h6></div>
          <div className="col-md-4"><button className="btn btn-outline-secondary w-100" type="button" onClick={() => window.alert('Change Password flow will be connected here.')}>Change Password</button></div>
          <div className="col-md-4"><button className="btn btn-outline-secondary w-100" type="button" onClick={() => window.alert('Two-Factor Authentication flow will be connected here.')}>Two-Factor Auth</button></div>
          <div className="col-md-4"><button className="btn btn-outline-secondary w-100" type="button" onClick={() => window.alert('Activity Log view will be connected here.')}>Activity Log</button></div>

          <div className="col-12 d-flex justify-content-end gap-2 mt-3">
            <button className="btn btn-outline-secondary" type="button" onClick={resetToDefault}>Reset To Default</button>
            <button className="btn btn-primary" type="button" onClick={saveStructured}>Save Changes</button>
          </div>
        </div>
      </PageCard>
      <PageCard title="Advanced JSON Settings" actions={<button className="btn btn-outline-primary" onClick={saveJson}>Save JSON</button>}>
        <textarea className="form-control" rows={14} value={rawJson} onChange={(e) => setRawJson(e.target.value)} />
      </PageCard>
    </>
  );
}

const CMS_PAGES: Array<{ key: string; label: string; title: string }> = [
  { key: 'about', label: 'about', title: 'About App' },
  { key: 'terms_conditions', label: 'terms', title: 'Terms & Conditions' },
  { key: 'privacy_policy', label: 'privacy', title: 'Privacy Policy' },
  { key: 'intellectual_property', label: 'ip', title: 'Intellectual Property' },
  { key: 'faq', label: 'faq', title: 'FAQs' },
  { key: 'help_support', label: 'help', title: 'Help & Support' },
];

const mergePrefill = (defaultValue: any, currentValue: any): any => {
  if (currentValue === undefined || currentValue === null || currentValue === '') return defaultValue;
  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(currentValue) || currentValue.length === 0) return defaultValue;
    if (defaultValue.length === 0) return currentValue;
    const mergedArray: any[] = [];
    const maxLength = Math.max(defaultValue.length, currentValue.length);
    for (let i = 0; i < maxLength; i += 1) {
      if (i < currentValue.length) {
        mergedArray.push(i < defaultValue.length ? mergePrefill(defaultValue[i], currentValue[i]) : currentValue[i]);
      } else {
        mergedArray.push(defaultValue[i]);
      }
    }
    return mergedArray;
  }
  if (defaultValue && currentValue && typeof defaultValue === 'object' && typeof currentValue === 'object' && !Array.isArray(defaultValue) && !Array.isArray(currentValue)) {
    const merged: Record<string, any> = { ...defaultValue, ...currentValue };
    Object.keys(defaultValue).forEach((key) => {
      merged[key] = mergePrefill(defaultValue[key], currentValue[key]);
    });
    return merged;
  }
  return currentValue;
};

const hydratePayload = (pageKey: string, storedPayload?: Record<string, any>) => {
  const defaults = cloneContentDefault(pageKey as any);
  if (!storedPayload) return defaults;
  return mergePrefill(defaults, storedPayload);
};

const extractLogoUrl = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return '';
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        return extractLogoUrl(parsed);
      } catch (_error) {
        return raw;
      }
    }
    return raw;
  }
  if (typeof value === 'object') {
    return (
      value.secure_url ||
      value.url ||
      value.logoUrl ||
      value.path ||
      value.src ||
      value.value ||
      ''
    );
  }
  return '';
};

const normalizeAboutPayload = (value: Record<string, any>) => {
  const rawLogo =
    value?.logoUrl ||
    value?.appLogo ||
    value?.app_logo ||
    value?.logo ||
    value?.logoImage ||
    value?.appLogoUrl;
  const logoUrl = extractLogoUrl(rawLogo);
  return { ...value, logoUrl };
};

const sanitizeLogoUrl = (value?: any) => {
  const extracted = extractLogoUrl(value);
  if (!extracted) return '';
  const normalized = String(extracted)
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/^'+|'+$/g, '')
    .replace(/\\\//g, '/');
  if (normalized.startsWith('blob:')) return '';
  if (/^https?:\/\//i.test(normalized) || normalized.startsWith('data:')) return normalized;
  if (normalized.startsWith('res.cloudinary.com/')) return `https://${normalized}`;
  if (normalized.startsWith('/')) return `${API_BASE_URL}${normalized}`;
  return normalized;
};

const buildLogoCandidates = (value?: string) => {
  const clean = sanitizeLogoUrl(value);
  if (!clean) return [] as string[];
  const encoded = (() => {
    try {
      return encodeURI(clean);
    } catch (_error) {
      return clean;
    }
  })();
  const cloudinaryAuto = clean.includes('/image/upload/')
    ? clean.replace('/image/upload/', '/image/upload/f_auto,q_auto/')
    : clean;
  return Array.from(new Set([clean, encoded, cloudinaryAuto].filter(Boolean)));
};

export function ContentPage() {
  const { admin } = useAuth();
  const canManage = hasPermission(admin?.role, admin?.permissions, 'content:manage');
  const [selectedKey, setSelectedKey] = useState('about');
  const [allPages, setAllPages] = useState<Record<string, any>>({});
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [payload, setPayload] = useState<Record<string, any>>(cloneContentDefault('about'));
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');
  const [logoCandidateIndex, setLogoCandidateIndex] = useState(0);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [saveModal, setSaveModal] = useState<null | { title: string; message: string; variant: 'success' | 'error' }>(null);

  const selectedMeta = CMS_PAGES.find((p) => p.key === selectedKey) || CMS_PAGES[0];

  const loadAll = async () => {
    const response = await apiCall(API_ENDPOINTS.CONTENT_PAGES);
    const rows = readItems(response);
    const map: Record<string, any> = {};
    rows.forEach((row) => {
      map[row.key] = row;
    });
    setAllPages(map);
    const current = map[selectedKey];
    setLogoUploadError('');
    setLogoPreviewUrl('');
    if (current) {
      const nextPayload = hydratePayload(selectedKey, current.payload);
      setPayload(selectedKey === 'about' ? normalizeAboutPayload(nextPayload) : nextPayload);
      setDescription(current.description || '');
      setIsPublished(current.isPublished !== false);
    } else {
      setPayload(cloneContentDefault(selectedKey as any));
      setDescription('');
      setIsPublished(true);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const current = allPages[selectedKey];
    setLogoUploadError('');
    setLogoCandidateIndex(0);
    setLogoPreviewUrl('');
    if (current) {
      const nextPayload = hydratePayload(selectedKey, current.payload);
      setPayload(selectedKey === 'about' ? normalizeAboutPayload(nextPayload) : nextPayload);
      setDescription(current.description || '');
      setIsPublished(current.isPublished !== false);
    } else {
      setPayload(cloneContentDefault(selectedKey as any));
      setDescription('');
      setIsPublished(true);
    }
  }, [selectedKey, allPages]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const updateField = (key: string, value: any) => setPayload((prev) => ({ ...prev, [key]: value }));
  const logoCandidates = useMemo(() => buildLogoCandidates(payload.logoUrl), [payload.logoUrl]);
  const currentLogoSrc = logoPreviewUrl || logoCandidates[logoCandidateIndex] || '';

  const handleAboutLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || selectedKey !== 'about') return;
    const MAX_UPLOAD_BYTES = 9 * 1024 * 1024;
    if (file.size > MAX_UPLOAD_BYTES) {
      setLogoUploadError('Image too large. Please upload file below 9MB.');
      event.target.value = '';
      return;
    }
    const previousLogo = payload.logoUrl || '';
    setLogoUploadError('');
    try {
      setLogoUploading(true);
      if (file.type.startsWith('image/')) {
        setLogoPreviewUrl(URL.createObjectURL(file));
        setLogoCandidateIndex(0);
      }
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await http.post('/api/documents/upload?type=user_photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadPayload = getDataPayload(uploadRes.data);
      const uploadedUrl = uploadPayload?.url;
      if (uploadedUrl) {
        setLogoPreviewUrl('');
        updateField('logoUrl', uploadedUrl);
        setLogoCandidateIndex(0);
      } else {
        setLogoPreviewUrl('');
        updateField('logoUrl', previousLogo);
        setLogoUploadError('Upload failed. Please try again.');
      }
    } catch (_error) {
      setLogoPreviewUrl('');
      updateField('logoUrl', previousLogo);
      setLogoUploadError('Upload failed. Please try again.');
    } finally {
      setLogoUploading(false);
      event.target.value = '';
    }
  };

  const onSave = async () => {
    if (!canManage) return;
    let finalPayload = payload;
    if (selectedKey === 'faq') {
      const categories = Array.isArray(payload.categories) ? payload.categories : [];
      finalPayload = {
        ...payload,
        categories: categories.map((category: any) => ({ ...category, icon: category.icon || 'help_circle' })),
      };
    }
    if (selectedKey === 'help_support') {
      const helpDefaults = cloneContentDefault('help_support');
      const quickDefaults = Array.isArray(helpDefaults.quickActions) ? helpDefaults.quickActions : [];
      const topicDefaults = Array.isArray(helpDefaults.popularTopics) ? helpDefaults.popularTopics : [];
      const contactDefaults = Array.isArray(helpDefaults.contactOptions) ? helpDefaults.contactOptions : [];
      const quickActions = Array.isArray(payload.quickActions) ? payload.quickActions : [];
      const popularTopics = Array.isArray(payload.popularTopics) ? payload.popularTopics : [];
      const contactOptions = Array.isArray(payload.contactOptions) ? payload.contactOptions : [];
      finalPayload = {
        ...payload,
        quickActions: quickActions.map((row: any, idx: number) => ({
          ...row,
          icon: row.icon || quickDefaults[idx]?.icon || 'help_circle',
          color: row.color || quickDefaults[idx]?.color || '#F99E3C',
          route: row.route || quickDefaults[idx]?.route || '',
          actionType: row.actionType || quickDefaults[idx]?.actionType || '',
          actionValue: row.actionValue || quickDefaults[idx]?.actionValue || '',
        })),
        popularTopics: popularTopics.map((row: any, idx: number) => ({
          ...row,
          icon: row.icon || topicDefaults[idx]?.icon || 'help_circle',
          color: row.color || topicDefaults[idx]?.color || '#F99E3C',
        })),
        contactOptions: contactOptions.map((row: any, idx: number) => ({
          ...row,
          icon: row.icon || contactDefaults[idx]?.icon || 'help_circle',
          color: row.color || contactDefaults[idx]?.color || '#F99E3C',
          actionType: row.actionType || contactDefaults[idx]?.actionType || 'url',
          actionValue: row.actionValue || contactDefaults[idx]?.actionValue || '',
        })),
      };
    }
    try {
      await apiCall(API_ENDPOINTS.CONTENT_PAGE, {
        method: 'PUT',
        params: { key: selectedKey },
        body: {
          title: selectedMeta.title,
          description: description || undefined,
          payload: finalPayload,
          isPublished,
        },
      });
      await loadAll();
      setSaveModal({
        title: 'Content saved',
        message: `${selectedMeta.label} content updated successfully.`,
        variant: 'success',
      });
    } catch (error: any) {
      setSaveModal({
        title: 'Save failed',
        message: error?.response?.data?.message || error?.message || 'Unable to save content. Please try again.',
        variant: 'error',
      });
    }
  };

  const renderSectionsEditor = (field: string) => {
    const rows = Array.isArray(payload[field]) ? payload[field] : [];
    return (
      <div className="mb-3">
        <h6>Sections</h6>
        {rows.map((row: any, idx: number) => (
          <div key={`${field}-${idx}`} className="border rounded p-3 mb-2">
            <input className="form-control mb-2" value={row.title || ''} onChange={(e) => { const next = [...rows]; next[idx] = { ...next[idx], title: e.target.value }; updateField(field, next); }} placeholder="Section title" />
            <textarea className="form-control mb-2" rows={4} value={row.content || ''} onChange={(e) => { const next = [...rows]; next[idx] = { ...next[idx], content: e.target.value }; updateField(field, next); }} placeholder="Section content" />
            <button className="btn btn-sm btn-outline-danger" onClick={() => updateField(field, rows.filter((_: any, i: number) => i !== idx))}>Remove</button>
          </div>
        ))}
        {canManage ? <button className="btn btn-sm btn-outline-primary" onClick={() => updateField(field, [...rows, { title: '', content: '' }])}>Add Section</button> : null}
      </div>
    );
  };

  const renderFaqEditor = () => {
    const categories = Array.isArray(payload.categories) ? payload.categories : [];
    return (
      <div className="mb-3">
        <h6>FAQ Categories & Questions</h6>
        {categories.map((category: any, cIdx: number) => (
          <div key={`faq-cat-${cIdx}`} className="border rounded p-3 mb-3">
            <input className="form-control mb-2" value={category.title || ''} onChange={(e) => { const next = [...categories]; next[cIdx] = { ...next[cIdx], title: e.target.value }; updateField('categories', next); }} placeholder="Category title" />
            <input className="form-control mb-2" value={category.icon || ''} onChange={(e) => { const next = [...categories]; next[cIdx] = { ...next[cIdx], icon: e.target.value }; updateField('categories', next); }} placeholder="Category icon" />
            <input className="form-control mb-2" value={category.color || ''} onChange={(e) => { const next = [...categories]; next[cIdx] = { ...next[cIdx], color: e.target.value }; updateField('categories', next); }} placeholder="Color" />
            {(category.items || []).map((item: any, qIdx: number) => (
              <div key={`faq-item-${cIdx}-${qIdx}`} className="border rounded p-2 mb-2">
                <input className="form-control mb-2" value={item.question || ''} onChange={(e) => { const next = [...categories]; const items = [...(next[cIdx].items || [])]; items[qIdx] = { ...items[qIdx], question: e.target.value }; next[cIdx] = { ...next[cIdx], items }; updateField('categories', next); }} placeholder="Question" />
                <textarea className="form-control" rows={3} value={item.answer || ''} onChange={(e) => { const next = [...categories]; const items = [...(next[cIdx].items || [])]; items[qIdx] = { ...items[qIdx], answer: e.target.value }; next[cIdx] = { ...next[cIdx], items }; updateField('categories', next); }} placeholder="Answer" />
                {canManage ? <button className="btn btn-sm btn-outline-danger mt-2" onClick={() => { const next = [...categories]; const items = [...(next[cIdx].items || [])].filter((_: any, idx: number) => idx !== qIdx); next[cIdx] = { ...next[cIdx], items }; updateField('categories', next); }}>Remove Question</button> : null}
              </div>
            ))}
            <div className="d-flex gap-2">
              {canManage ? <button className="btn btn-sm btn-outline-primary" onClick={() => { const next = [...categories]; next[cIdx] = { ...next[cIdx], items: [...(next[cIdx].items || []), { question: '', answer: '' }] }; updateField('categories', next); }}>Add Question</button> : null}
              {canManage ? <button className="btn btn-sm btn-outline-danger" onClick={() => updateField('categories', categories.filter((_: any, idx: number) => idx !== cIdx))}>Remove Category</button> : null}
            </div>
          </div>
        ))}
        {canManage ? <button className="btn btn-sm btn-outline-primary" onClick={() => updateField('categories', [...categories, { title: '', color: '#F99E3C', icon: 'help_circle', items: [] }])}>Add Category</button> : null}
      </div>
    );
  };

  const renderHelpEditor = () => {
    const quickActions = Array.isArray(payload.quickActions) ? payload.quickActions : [];
    const popularTopics = Array.isArray(payload.popularTopics) ? payload.popularTopics : [];
    const contactOptions = Array.isArray(payload.contactOptions) ? payload.contactOptions : [];
    return (
      <div className="mb-3">
        <h6>Support Hours</h6>
        <textarea className="form-control mb-3" rows={3} value={payload.supportHoursText || ''} onChange={(e) => updateField('supportHoursText', e.target.value)} placeholder="Support hours text" />
        <h6>Quick Actions</h6>
        {quickActions.map((row: any, idx: number) => (
          <div key={`qa-${idx}`} className="border rounded p-3 mb-2">
            <input className="form-control mb-2" value={row.icon || ''} onChange={(e) => { const next = [...quickActions]; next[idx] = { ...next[idx], icon: e.target.value }; updateField('quickActions', next); }} placeholder="Icon" />
            <input className="form-control mb-2" value={row.color || ''} onChange={(e) => { const next = [...quickActions]; next[idx] = { ...next[idx], color: e.target.value }; updateField('quickActions', next); }} placeholder="Color" />
            <input className="form-control mb-2" value={row.label || ''} onChange={(e) => { const next = [...quickActions]; next[idx] = { ...next[idx], label: e.target.value }; updateField('quickActions', next); }} placeholder="Label" />
            <input className="form-control mb-2" value={row.desc || ''} onChange={(e) => { const next = [...quickActions]; next[idx] = { ...next[idx], desc: e.target.value }; updateField('quickActions', next); }} placeholder="Description" />
            <input className="form-control mb-2" value={row.route || ''} onChange={(e) => { const next = [...quickActions]; next[idx] = { ...next[idx], route: e.target.value }; updateField('quickActions', next); }} placeholder="Route" />
            <input className="form-control mb-2" value={row.actionType || ''} onChange={(e) => { const next = [...quickActions]; next[idx] = { ...next[idx], actionType: e.target.value }; updateField('quickActions', next); }} placeholder="Action type" />
            <input className="form-control mb-2" value={row.actionValue || ''} onChange={(e) => { const next = [...quickActions]; next[idx] = { ...next[idx], actionValue: e.target.value }; updateField('quickActions', next); }} placeholder="Action value" />
            {canManage ? <button className="btn btn-sm btn-outline-danger" onClick={() => updateField('quickActions', quickActions.filter((_: any, i: number) => i !== idx))}>Remove Quick Action</button> : null}
          </div>
        ))}
        {canManage ? <button className="btn btn-sm btn-outline-primary mb-3" onClick={() => updateField('quickActions', [...quickActions, { label: '', desc: '', icon: 'help_circle', color: '#F99E3C', route: '', actionType: '', actionValue: '' }])}>Add Quick Action</button> : null}
        <h6>Popular Topics</h6>
        {popularTopics.map((row: any, idx: number) => (
          <div key={`pt-${idx}`} className="border rounded p-3 mb-2">
            <input className="form-control mb-2" value={row.icon || ''} onChange={(e) => { const next = [...popularTopics]; next[idx] = { ...next[idx], icon: e.target.value }; updateField('popularTopics', next); }} placeholder="Icon" />
            <input className="form-control mb-2" value={row.color || ''} onChange={(e) => { const next = [...popularTopics]; next[idx] = { ...next[idx], color: e.target.value }; updateField('popularTopics', next); }} placeholder="Color" />
            <input className="form-control mb-2" value={row.title || ''} onChange={(e) => { const next = [...popularTopics]; next[idx] = { ...next[idx], title: e.target.value }; updateField('popularTopics', next); }} placeholder="Topic title" />
            <input className="form-control mb-2" value={row.category || ''} onChange={(e) => { const next = [...popularTopics]; next[idx] = { ...next[idx], category: e.target.value }; updateField('popularTopics', next); }} placeholder="Category" />
            <textarea className="form-control" rows={3} value={row.explanation || ''} onChange={(e) => { const next = [...popularTopics]; next[idx] = { ...next[idx], explanation: e.target.value }; updateField('popularTopics', next); }} placeholder="Explanation" />
            {canManage ? <button className="btn btn-sm btn-outline-danger mt-2" onClick={() => updateField('popularTopics', popularTopics.filter((_: any, i: number) => i !== idx))}>Remove Topic</button> : null}
          </div>
        ))}
        {canManage ? <button className="btn btn-sm btn-outline-primary mb-3" onClick={() => updateField('popularTopics', [...popularTopics, { title: '', category: '', icon: 'help_circle', color: '#F99E3C', explanation: '' }])}>Add Topic</button> : null}
        <h6>Contact Options</h6>
        {contactOptions.map((row: any, idx: number) => (
          <div key={`co-${idx}`} className="border rounded p-3 mb-2">
            <input className="form-control mb-2" value={row.icon || ''} onChange={(e) => { const next = [...contactOptions]; next[idx] = { ...next[idx], icon: e.target.value }; updateField('contactOptions', next); }} placeholder="Icon" />
            <input className="form-control mb-2" value={row.color || ''} onChange={(e) => { const next = [...contactOptions]; next[idx] = { ...next[idx], color: e.target.value }; updateField('contactOptions', next); }} placeholder="Color" />
            <input className="form-control mb-2" value={row.label || ''} onChange={(e) => { const next = [...contactOptions]; next[idx] = { ...next[idx], label: e.target.value }; updateField('contactOptions', next); }} placeholder="Label" />
            <input className="form-control mb-2" value={row.desc || ''} onChange={(e) => { const next = [...contactOptions]; next[idx] = { ...next[idx], desc: e.target.value }; updateField('contactOptions', next); }} placeholder="Description" />
            <input className="form-control mb-2" value={row.actionType || ''} onChange={(e) => { const next = [...contactOptions]; next[idx] = { ...next[idx], actionType: e.target.value }; updateField('contactOptions', next); }} placeholder="Action type" />
            <input className="form-control mb-2" value={row.actionValue || ''} onChange={(e) => { const next = [...contactOptions]; next[idx] = { ...next[idx], actionValue: e.target.value }; updateField('contactOptions', next); }} placeholder="Action value" />
            {canManage ? <button className="btn btn-sm btn-outline-danger" onClick={() => updateField('contactOptions', contactOptions.filter((_: any, i: number) => i !== idx))}>Remove Contact Option</button> : null}
          </div>
        ))}
        {canManage ? <button className="btn btn-sm btn-outline-primary" onClick={() => updateField('contactOptions', [...contactOptions, { label: '', desc: '', icon: 'help_circle', color: '#F99E3C', actionType: 'url', actionValue: '' }])}>Add Contact Option</button> : null}
      </div>
    );
  };

  const renderPageFields = () => {
    if (selectedKey === 'faq') return renderFaqEditor();
    if (selectedKey === 'help_support') return renderHelpEditor();
    return (
      <div className="row g-3">
        {selectedKey === 'about' ? (
          <>
            <div className="col-12">
              <label className="form-label">App Logo</label>
              <div className="about-logo-upload-wrap">
                {payload.logoUrl ? (
                  <div className="about-logo-preview-box">
                    <img
                      src={currentLogoSrc}
                      alt="About logo"
                      className="about-logo-preview-img"
                      onError={() => {
                        if (logoCandidateIndex < logoCandidates.length - 1) {
                          setLogoCandidateIndex((prev) => prev + 1);
                        } else {
                          setLogoUploadError('Logo URL is invalid or inaccessible.');
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="about-logo-preview-box about-logo-preview-empty">No logo selected</div>
                )}
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <input className="form-control" type="file" accept="image/*" onChange={handleAboutLogoUpload} disabled={!canManage || logoUploading} />
                  {logoUploading ? <span className="small text-body-secondary">Uploading logo...</span> : null}
                </div>
                {logoUploadError && !payload.logoUrl ? <div className="small text-danger mt-1">{logoUploadError}</div> : null}
              </div>
            </div>
            <div className="col-md-4"><label className="form-label">Brand name</label><input className="form-control" value={payload.brandName || ''} onChange={(e) => updateField('brandName', e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">Tagline</label><input className="form-control" value={payload.tagline || ''} onChange={(e) => updateField('tagline', e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">Version</label><input className="form-control" value={payload.version || ''} onChange={(e) => updateField('version', e.target.value)} /></div>
            <div className="col-12"><label className="form-label">Who we are</label><textarea className="form-control" rows={4} value={payload.whoWeAre || ''} onChange={(e) => updateField('whoWeAre', e.target.value)} /></div>
            <div className="col-12">
              <h6>About Features</h6>
              {(payload.features || []).map((row: any, idx: number) => (
                <div key={`about-feature-${idx}`} className="border rounded p-2 mb-2">
                  <input className="form-control mb-2" value={row.icon || ''} onChange={(e) => { const next = [...(payload.features || [])]; next[idx] = { ...next[idx], icon: e.target.value }; updateField('features', next); }} placeholder="Icon" />
                  <input className="form-control mb-2" value={row.title || ''} onChange={(e) => { const next = [...(payload.features || [])]; next[idx] = { ...next[idx], title: e.target.value }; updateField('features', next); }} placeholder="Feature title" />
                  <textarea className="form-control mb-2" rows={3} value={row.description || ''} onChange={(e) => { const next = [...(payload.features || [])]; next[idx] = { ...next[idx], description: e.target.value }; updateField('features', next); }} placeholder="Feature description" />
                  <input className="form-control mb-2" value={row.color || ''} onChange={(e) => { const next = [...(payload.features || [])]; next[idx] = { ...next[idx], color: e.target.value }; updateField('features', next); }} placeholder="Color" />
                  {canManage ? <button className="btn btn-sm btn-outline-danger" onClick={() => updateField('features', (payload.features || []).filter((_: any, i: number) => i !== idx))}>Remove Feature</button> : null}
                </div>
              ))}
              {canManage ? <button className="btn btn-sm btn-outline-primary" onClick={() => updateField('features', [...(payload.features || []), { title: '', description: '', icon: 'help_circle', color: '#F99E3C' }])}>Add Feature</button> : null}
            </div>
            <div className="col-12">
              <h6>Stats</h6>
              {(payload.stats || []).map((row: any, idx: number) => (
                <div key={`about-stat-${idx}`} className="border rounded p-2 mb-2">
                  <input className="form-control mb-2" value={row.icon || ''} onChange={(e) => { const next = [...(payload.stats || [])]; next[idx] = { ...next[idx], icon: e.target.value }; updateField('stats', next); }} placeholder="Icon" />
                  <input className="form-control mb-2" value={row.value || ''} onChange={(e) => { const next = [...(payload.stats || [])]; next[idx] = { ...next[idx], value: e.target.value }; updateField('stats', next); }} placeholder="Value" />
                  <input className="form-control mb-2" value={row.label || ''} onChange={(e) => { const next = [...(payload.stats || [])]; next[idx] = { ...next[idx], label: e.target.value }; updateField('stats', next); }} placeholder="Label" />
                  {canManage ? <button className="btn btn-sm btn-outline-danger" onClick={() => updateField('stats', (payload.stats || []).filter((_: any, i: number) => i !== idx))}>Remove Stat</button> : null}
                </div>
              ))}
              {canManage ? <button className="btn btn-sm btn-outline-primary" onClick={() => updateField('stats', [...(payload.stats || []), { value: '', label: '', icon: 'users' }])}>Add Stat</button> : null}
            </div>
            <div className="col-12">
              <h6>Contact Items</h6>
              {(payload.contactItems || []).map((row: any, idx: number) => (
                <div key={`about-contact-${idx}`} className="border rounded p-2 mb-2">
                  <input className="form-control mb-2" value={row.icon || ''} onChange={(e) => { const next = [...(payload.contactItems || [])]; next[idx] = { ...next[idx], icon: e.target.value }; updateField('contactItems', next); }} placeholder="Icon" />
                  <input className="form-control mb-2" value={row.label || ''} onChange={(e) => { const next = [...(payload.contactItems || [])]; next[idx] = { ...next[idx], label: e.target.value }; updateField('contactItems', next); }} placeholder="Label" />
                  <input className="form-control mb-2" value={row.value || ''} onChange={(e) => { const next = [...(payload.contactItems || [])]; next[idx] = { ...next[idx], value: e.target.value }; updateField('contactItems', next); }} placeholder="Value" />
                  <input className="form-control mb-2" value={row.action || ''} onChange={(e) => { const next = [...(payload.contactItems || [])]; next[idx] = { ...next[idx], action: e.target.value }; updateField('contactItems', next); }} placeholder="Action" />
                  {canManage ? <button className="btn btn-sm btn-outline-danger" onClick={() => updateField('contactItems', (payload.contactItems || []).filter((_: any, i: number) => i !== idx))}>Remove Contact</button> : null}
                </div>
              ))}
              {canManage ? <button className="btn btn-sm btn-outline-primary" onClick={() => updateField('contactItems', [...(payload.contactItems || []), { label: '', value: '', icon: 'mail', action: '' }])}>Add Contact</button> : null}
            </div>
          </>
        ) : null}
        {(selectedKey === 'terms_conditions' || selectedKey === 'privacy_policy' || selectedKey === 'intellectual_property') ? (
          <>
            <div className="col-md-4"><label className="form-label">Intro title</label><input className="form-control" value={payload.introTitle || ''} onChange={(e) => updateField('introTitle', e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">Intro subtitle</label><input className="form-control" value={payload.introSub || ''} onChange={(e) => updateField('introSub', e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">{selectedKey === 'terms_conditions' ? 'Effective text' : 'Last updated text'}</label><input className="form-control" value={selectedKey === 'terms_conditions' ? payload.effectiveText || '' : payload.lastUpdatedText || ''} onChange={(e) => selectedKey === 'terms_conditions' ? updateField('effectiveText', e.target.value) : updateField('lastUpdatedText', e.target.value)} /></div>
            <div className="col-12"><label className="form-label">Intro body</label><textarea className="form-control" rows={4} value={payload.introBody || ''} onChange={(e) => updateField('introBody', e.target.value)} /></div>
          </>
        ) : null}
        {selectedKey === 'terms_conditions' || selectedKey === 'privacy_policy' || selectedKey === 'intellectual_property' ? <div className="col-12">{renderSectionsEditor('sections')}</div> : null}
        {selectedKey === 'privacy_policy' ? (
          <>
            <div className="col-md-4"><label className="form-label">DPO email</label><input className="form-control" value={payload.dpoEmail || ''} onChange={(e) => updateField('dpoEmail', e.target.value)} /></div>
            <div className="col-12"><h6>Rights</h6>{(payload.rights || []).map((row: any, idx: number) => <div key={`right-${idx}`} className="border rounded p-2 mb-2"><input className="form-control mb-2" value={row.title || ''} onChange={(e) => { const next = [...(payload.rights || [])]; next[idx] = { ...next[idx], title: e.target.value }; updateField('rights', next); }} placeholder="Right title" /><input className="form-control mb-2" value={row.desc || ''} onChange={(e) => { const next = [...(payload.rights || [])]; next[idx] = { ...next[idx], desc: e.target.value }; updateField('rights', next); }} placeholder="Right description" />{canManage ? <button className="btn btn-sm btn-outline-danger" onClick={() => updateField('rights', (payload.rights || []).filter((_: any, i: number) => i !== idx))}>Remove Right</button> : null}</div>)}{canManage ? <button className="btn btn-sm btn-outline-primary" onClick={() => updateField('rights', [...(payload.rights || []), { title: '', desc: '' }])}>Add Right</button> : null}</div>
          </>
        ) : null}
        {selectedKey === 'terms_conditions' ? <div className="col-md-4"><label className="form-label">Contact email</label><input className="form-control" value={payload.contactEmail || ''} onChange={(e) => updateField('contactEmail', e.target.value)} /></div> : null}
        {selectedKey === 'intellectual_property' ? (
          <>
            <div className="col-md-4"><label className="form-label">Warning title</label><input className="form-control" value={payload.warningTitle || ''} onChange={(e) => updateField('warningTitle', e.target.value)} /></div>
            <div className="col-md-8"><label className="form-label">Warning text</label><textarea className="form-control" rows={3} value={payload.warningText || ''} onChange={(e) => updateField('warningText', e.target.value)} /></div>
            <div className="col-md-6"><label className="form-label">Licensing title</label><input className="form-control" value={payload.licensingTitle || ''} onChange={(e) => updateField('licensingTitle', e.target.value)} /></div>
            <div className="col-md-6"><label className="form-label">Licensing subtitle</label><input className="form-control" value={payload.licensingSub || ''} onChange={(e) => updateField('licensingSub', e.target.value)} /></div>
            <div className="col-md-6"><label className="form-label">Primary email</label><input className="form-control" value={payload.contactEmail1 || ''} onChange={(e) => updateField('contactEmail1', e.target.value)} /></div>
            <div className="col-md-6"><label className="form-label">Secondary email</label><input className="form-control" value={payload.contactEmail2 || ''} onChange={(e) => updateField('contactEmail2', e.target.value)} /></div>
          </>
        ) : null}
        {selectedKey !== 'faq' && selectedKey !== 'help_support' ? (
          <>
            <div className="col-md-6"><label className="form-label">Footer line 1</label><input className="form-control" value={payload.footerLine1 || ''} onChange={(e) => updateField('footerLine1', e.target.value)} /></div>
            <div className="col-md-6"><label className="form-label">Footer line 2</label><input className="form-control" value={payload.footerLine2 || ''} onChange={(e) => updateField('footerLine2', e.target.value)} /></div>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div className="requests-header mb-3">
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
          <h5 className="mb-0">Content Pages</h5>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-body-secondary mb-0 d-flex align-items-center"><i className="bi bi-funnel"></i></span>
            <select className="form-select form-select-sm table-filter-select" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
              {CMS_PAGES.map((page) => (
                <option key={page.key} value={page.key}>
                  {page.key}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <PageCard title={`Edit Content - ${selectedMeta.label}`} actions={canManage ? <button className="btn btn-primary" onClick={onSave}>Save</button> : undefined}>
        <div className="row g-3 mb-3">
          <div className="col-md-4"><label className="form-label">Page Key</label><input className="form-control" value={selectedKey} readOnly /></div>
          <div className="col-md-6"><label className="form-label">Description</label><input className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canManage} /></div>
          <div className="col-md-2"><label className="form-check d-flex align-items-center gap-2 mt-4"><input className="form-check-input" type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} disabled={!canManage} />Published</label></div>
        </div>
        {renderPageFields()}
      </PageCard>
      {saveModal ? (
        <div className="app-modal-backdrop" onClick={() => setSaveModal(null)}>
          <div className="app-modal-card app-message-modal" onClick={(e) => e.stopPropagation()}>
            <div className="app-message-modal-header">
              <div className="d-flex align-items-center gap-2">
                <i className={`bi ${saveModal.variant === 'success' ? 'bi-check2-circle text-primary' : 'bi-exclamation-circle text-warning'}`}></i>
                <h6 className="mb-0">{saveModal.title}</h6>
              </div>
              <button className="btn btn-sm btn-link text-secondary p-0 border-0" onClick={() => setSaveModal(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="app-message-modal-body">
              <p className={`mb-0 ${saveModal.variant === 'success' ? 'text-success' : 'text-danger'}`}>{saveModal.message}</p>
            </div>
            <div className="app-message-modal-actions">
              <button className="btn app-modal-btn-cancel" onClick={() => setSaveModal(null)}>Close</button>
              <button className="btn app-modal-btn-primary" onClick={() => setSaveModal(null)}>OK</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function MasterDataPage() {
  const { admin } = useAuth();
  const canManage = hasPermission(admin?.role, admin?.permissions, 'master_data:manage');
  const [type, setType] = useState('language');
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ key: '', label: '', value: '', sortOrder: 0, isActive: true });

  const load = async () => {
    setRows(readItems(await apiCall(API_ENDPOINTS.MASTER_DATA_LIST, { params: { type } })));
  };
  useEffect(() => {
    load();
  }, [type]);

  const save = async () => {
    if (!canManage || !form.key || !form.label) return;
    await apiCall(API_ENDPOINTS.MASTER_DATA_ITEM, {
      method: 'PUT',
      params: { type, key: form.key },
      body: { ...form, value: form.value || form.label },
    });
    setForm({ key: '', label: '', value: '', sortOrder: 0, isActive: true });
    await load();
  };

  const remove = async (itemKey: string) => {
    if (!canManage || !window.confirm('Delete this item?')) return;
    await apiCall(API_ENDPOINTS.MASTER_DATA_ITEM, { method: 'DELETE', params: { type, key: itemKey } });
    await load();
  };

  const importDefaults = async () => {
    if (!canManage) return;
    const defaults = MASTER_DEFAULTS[type] || [];
    for (let i = 0; i < defaults.length; i += 1) {
      const value = defaults[i];
      await apiCall(API_ENDPOINTS.MASTER_DATA_ITEM, {
        method: 'PUT',
        params: { type, key: value.toLowerCase().replace(/\s+/g, '_') },
        body: { label: value, value, sortOrder: i, isActive: true },
      });
    }
    await load();
  };

  return (
    <>
      <PageCard title="Master Data Type">
        <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
          {MASTER_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </PageCard>
      <PageCard title={`Master Data - ${type}`} actions={<div className="d-flex gap-2">{canManage ? <button className="btn btn-outline-primary" onClick={importDefaults}>Import Defaults</button> : null}{canManage ? <button className="btn btn-primary" onClick={save}>Save Item</button> : null}</div>}>
        <div className="row g-2 mb-3">
          <div className="col-md-3"><input className="form-control" placeholder="key" value={form.key} onChange={(e) => setForm((p) => ({ ...p, key: e.target.value.toLowerCase() }))} disabled={!canManage} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="label" value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} disabled={!canManage} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="value" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} disabled={!canManage} /></div>
          <div className="col-md-2"><input type="number" className="form-control" placeholder="sort order" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))} disabled={!canManage} /></div>
          <div className="col-md-1"><label className="form-check d-flex align-items-center gap-2 mt-2"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} disabled={!canManage} />Active</label></div>
        </div>
        <DataTable rows={rows} columns={[{ key: 'key', label: 'Key' }, { key: 'label', label: 'Label' }, { key: 'value', label: 'Value' }, { key: 'sortOrder', label: 'Order' }, { key: 'isActive', label: 'Active', render: (r) => String(r.isActive) }, { key: 'actions', label: 'Actions', render: (r) => <div className="d-flex gap-2">{canManage ? <button className="btn btn-sm btn-outline-primary" onClick={() => setForm({ key: r.key, label: r.label, value: r.value || '', sortOrder: r.sortOrder || 0, isActive: r.isActive !== false })}>Edit</button> : null}{canManage ? <button className="btn btn-sm btn-danger" onClick={() => remove(r.key)}>Delete</button> : null}</div> }]} />
      </PageCard>
    </>
  );
}

export function FuelPricingPage() {
  const { admin } = useAuth();
  const canManage = hasPermission(admin?.role, admin?.permissions, 'settings:manage');
  const isSuperAdmin = admin?.role === 'super_admin';
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string>('');
  const [pendingBulkApproval, setPendingBulkApproval] = useState(false);
  const [pendingBulkCount, setPendingBulkCount] = useState(0);
  const [versions, setVersions] = useState<any[]>([]);
  const [publishNote, setPublishNote] = useState('');
  const [overrideLimit, setOverrideLimit] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const sortRows = (list: any[]) =>
    [...list].sort((a, b) => {
      const ak = String(a.cityKey || '').toUpperCase();
      const bk = String(b.cityKey || '').toUpperCase();
      if (ak === 'DEFAULT') return -1;
      if (bk === 'DEFAULT') return 1;
      return ak.localeCompare(bk);
    });

  const parseConfig = (payload: any) => {
    const data = getDataPayload(payload) || {};
    const draftCities = data?.draft?.cities || {};
    const parsedRows = Object.entries(draftCities).map(([cityKey, row]: [string, any]) => ({
      cityKey,
      city: row?.city || cityKey,
      state: row?.state || '',
      cityTier: row?.cityTier || 'urban',
      petrol: row?.petrol ?? '',
      diesel: row?.diesel ?? '',
      cng: row?.cng ?? '',
      electricity: row?.electricity ?? '',
      trafficProfile: row?.trafficProfile || 'medium',
      isActive: row?.isActive !== false,
    }));
    setRows(sortRows(parsedRows));
    setActiveVersionId(data?.activeVersionId || '');
    setPendingBulkApproval(Boolean(data?.draft?.pendingBulkApproval));
    setPendingBulkCount(Number(data?.draft?.pendingBulkCount || 0));
    setVersions(data?.versions || []);
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiCall(API_ENDPOINTS.PRICING_FUEL_CONFIG);
      parseConfig(response);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRow = (cityKey: string, patch: Record<string, any>) => {
    setRows((prev) =>
      sortRows(
        prev.map((row) =>
          row.cityKey === cityKey
            ? {
                ...row,
                ...patch,
              }
            : row
        )
      )
    );
  };

  const addRow = () => {
    const cityKey = `CITY_${Date.now()}`;
    setRows((prev) =>
      sortRows([
        ...prev,
        {
          cityKey,
          city: '',
          state: '',
          cityTier: 'urban',
          petrol: '',
          diesel: '',
          cng: '',
          electricity: '',
          trafficProfile: 'medium',
          isActive: true,
        },
      ])
    );
  };

  const saveRow = async (row: any) => {
    if (!canManage) return;
    const key = String(row.cityKey || '').trim().toUpperCase();
    if (!key) return;
    await apiCall(API_ENDPOINTS.PRICING_FUEL_DRAFT_CITY, {
      method: 'PUT',
      params: { cityKey: key },
      body: {
        city: row.city,
        state: row.state,
        cityTier: row.cityTier,
        petrol: Number(row.petrol),
        diesel: Number(row.diesel),
        cng: Number(row.cng),
        electricity: Number(row.electricity),
        trafficProfile: row.trafficProfile,
        isActive: row.isActive,
      },
    });
    await load();
  };

  const removeRow = async (cityKey: string) => {
    if (!canManage) return;
    if (String(cityKey).toUpperCase() === 'DEFAULT') return;
    if (!window.confirm(`Delete draft row ${cityKey}?`)) return;
    await apiCall(API_ENDPOINTS.PRICING_FUEL_DRAFT_CITY, {
      method: 'DELETE',
      params: { cityKey },
    });
    await load();
  };

  const bulkUpload = async () => {
    if (!canManage) return;
    const lines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const parsedRows = lines.map((line) => {
      const [cityKey, city, state, cityTier, petrol, diesel, cng, electricity, trafficProfile] = line
        .split(',')
        .map((v) => v.trim());
      return {
        cityKey: cityKey || city,
        city: city || cityKey,
        state,
        cityTier: cityTier || 'urban',
        petrol: Number(petrol || 0),
        diesel: Number(diesel || 0),
        cng: Number(cng || 0),
        electricity: Number(electricity || 0),
        trafficProfile: trafficProfile || 'medium',
        isActive: true,
      };
    });
    await apiCall(API_ENDPOINTS.PRICING_FUEL_DRAFT_BULK, {
      method: 'POST',
      body: { rows: parsedRows },
    });
    setBulkText('');
    await load();
  };

  const approveBulk = async () => {
    if (!canManage || !isSuperAdmin) return;
    await apiCall(API_ENDPOINTS.PRICING_FUEL_APPROVE_BULK, { method: 'POST', body: {} });
    await load();
  };

  const publish = async () => {
    if (!canManage) return;
    await apiCall(API_ENDPOINTS.PRICING_FUEL_PUBLISH, {
      method: 'POST',
      body: { note: publishNote, overrideLimit: overrideLimit && isSuperAdmin },
    });
    setPublishNote('');
    setOverrideLimit(false);
    await load();
  };

  const rollback = async (versionId: string) => {
    if (!canManage || !isSuperAdmin) return;
    if (!window.confirm(`Rollback to ${versionId}?`)) return;
    await apiCall(API_ENDPOINTS.PRICING_FUEL_ROLLBACK, {
      method: 'POST',
      params: { versionId },
      body: { note: `Rollback from admin panel to ${versionId}` },
    });
    await load();
  };

  return (
    <>
      <PageCard title="Fuel Pricing Governance">
        <div className="row g-2">
          <div className="col-md-3">
            <div className="small text-body-secondary">Active Version</div>
            <div className="fw-semibold">{activeVersionId || '-'}</div>
          </div>
          <div className="col-md-4">
            <div className="small text-body-secondary">Bulk Approval</div>
            <div className={pendingBulkApproval ? 'text-warning fw-semibold' : 'text-success fw-semibold'}>
              {pendingBulkApproval ? `Pending (${pendingBulkCount} rows)` : 'Not pending'}
            </div>
          </div>
          <div className="col-md-5 text-md-end">
            {canManage ? <button className="btn btn-outline-primary me-2" onClick={addRow}>Add City Row</button> : null}
            {canManage && pendingBulkApproval && isSuperAdmin ? (
              <button className="btn btn-warning" onClick={approveBulk}>Approve Bulk</button>
            ) : null}
          </div>
        </div>
      </PageCard>

      <PageCard title="Draft Fuel Prices (prefilled)" actions={canManage ? <button className="btn btn-primary" onClick={publish}>Publish Draft</button> : undefined}>
        <div className="d-flex flex-column gap-2 mb-3">
          <div className="small text-body-secondary">
            Notes: max ±10% fuel change per publish (unless super-admin override). DEFAULT row is mandatory.
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <input
              className="form-control"
              style={{ maxWidth: 420 }}
              placeholder="Publish note (optional)"
              value={publishNote}
              onChange={(e) => setPublishNote(e.target.value)}
              disabled={!canManage}
            />
            <label className="form-check d-flex align-items-center gap-2 m-0">
              <input
                className="form-check-input"
                type="checkbox"
                checked={overrideLimit}
                onChange={(e) => setOverrideLimit(e.target.checked)}
                disabled={!canManage || !isSuperAdmin}
              />
              Override 10% limit (super-admin only)
            </label>
          </div>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <DataTable
            rows={rows}
            columns={[
              { key: 'cityKey', label: 'City Key' },
              {
                key: 'city',
                label: 'City',
                render: (row) => (
                  <input className="form-control form-control-sm" value={row.city || ''} onChange={(e) => updateRow(row.cityKey, { city: e.target.value })} disabled={!canManage} />
                ),
              },
              {
                key: 'petrol',
                label: 'Petrol',
                render: (row) => <input type="number" className="form-control form-control-sm" value={row.petrol} onChange={(e) => updateRow(row.cityKey, { petrol: Number(e.target.value) })} disabled={!canManage} />,
              },
              {
                key: 'diesel',
                label: 'Diesel',
                render: (row) => <input type="number" className="form-control form-control-sm" value={row.diesel} onChange={(e) => updateRow(row.cityKey, { diesel: Number(e.target.value) })} disabled={!canManage} />,
              },
              {
                key: 'cng',
                label: 'CNG',
                render: (row) => <input type="number" className="form-control form-control-sm" value={row.cng} onChange={(e) => updateRow(row.cityKey, { cng: Number(e.target.value) })} disabled={!canManage} />,
              },
              {
                key: 'electricity',
                label: 'Electricity',
                render: (row) => <input type="number" className="form-control form-control-sm" value={row.electricity} onChange={(e) => updateRow(row.cityKey, { electricity: Number(e.target.value) })} disabled={!canManage} />,
              },
              {
                key: 'active',
                label: 'Active',
                render: (row) => (
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={row.isActive !== false}
                    onChange={(e) => updateRow(row.cityKey, { isActive: e.target.checked })}
                    disabled={!canManage || String(row.cityKey).toUpperCase() === 'DEFAULT'}
                  />
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <div className="d-flex gap-2">
                    {canManage ? <button className="btn btn-sm btn-outline-primary" onClick={() => saveRow(row)}>Save</button> : null}
                    {canManage && String(row.cityKey).toUpperCase() !== 'DEFAULT' ? (
                      <button className="btn btn-sm btn-danger" onClick={() => removeRow(row.cityKey)}>Delete</button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        )}
      </PageCard>

      <PageCard title="Bulk Update (requires approval)">
        <div className="small text-body-secondary mb-2">
          CSV lines format: CITY_KEY,City,State,CityTier,Petrol,Diesel,CNG,Electricity,TrafficProfile
        </div>
        <textarea
          className="form-control"
          rows={5}
          placeholder="MUMBAI,Mumbai,Maharashtra,metro,108,96,79,12.5,high"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          disabled={!canManage}
        />
        <div className="mt-2">
          {canManage ? <button className="btn btn-outline-primary" onClick={bulkUpload}>Submit Bulk Draft</button> : null}
        </div>
      </PageCard>

      <PageCard title="Version History">
        <DataTable
          rows={versions}
          columns={[
            { key: 'versionId', label: 'Version ID' },
            { key: 'createdAt', label: 'Created At', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '-') },
            { key: 'createdBy', label: 'Created By' },
            { key: 'note', label: 'Note' },
            { key: 'cityCount', label: 'Cities' },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) =>
                isSuperAdmin ? (
                  <button className="btn btn-sm btn-warning" onClick={() => rollback(r.versionId)}>
                    Rollback
                  </button>
                ) : (
                  '-'
                ),
            },
          ]}
        />
      </PageCard>
    </>
  );
}

export function FuelRatesPage() {
  const { admin } = useAuth();
  const canManage = hasPermission(admin?.role, admin?.permissions, 'settings:manage');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [cityTierFilter, setCityTierFilter] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState('');
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({
    city: '',
    state: '',
    cityTier: 'mixed',
    petrol: '',
    diesel: '',
    cng: '',
    electricity: '',
    trafficProfile: 'medium',
    isActive: true,
  });

  const load = async (targetPage?: number) => {
    const nextPage = targetPage ?? page;
    setLoading(true);
    try {
      const res = await apiCall(API_ENDPOINTS.PRICING_FUEL_RATES, {
        query: {
          page: nextPage,
          limit: 20,
          search: search.trim() || undefined,
          state: stateFilter || undefined,
          cityTier: cityTierFilter || undefined,
          fuelType: fuelTypeFilter || undefined,
        },
      });
      const payload = getDataPayload(res);
      setRows(readItems(payload));
      setPages(Math.max(1, Number(payload?.pagination?.pages || 1)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  const applySearch = () => {
    setPage(1);
    void load(1);
  };

  const openEdit = (row: any) => {
    setEditTarget(row);
    setEditForm({
      city: row.city || '',
      state: row.state || '',
      cityTier: row.cityTier || 'mixed',
      petrol: row.petrol ?? '',
      diesel: row.diesel ?? '',
      cng: row.cng ?? '',
      electricity: row.electricity ?? '',
      trafficProfile: row.trafficProfile || 'medium',
      isActive: row.isActive !== false,
    });
  };

  const saveEdit = async () => {
    if (!canManage || !editTarget?.cityKey) return;
    await apiCall(API_ENDPOINTS.PRICING_FUEL_RATE, {
      method: 'PUT',
      params: { cityKey: editTarget.cityKey },
      body: {
        city: editForm.city,
        state: editForm.state,
        cityTier: editForm.cityTier,
        petrol: editForm.petrol === '' ? undefined : Number(editForm.petrol),
        diesel: editForm.diesel === '' ? undefined : Number(editForm.diesel),
        cng: editForm.cng === '' ? undefined : Number(editForm.cng),
        electricity: editForm.electricity === '' ? undefined : Number(editForm.electricity),
        trafficProfile: editForm.trafficProfile,
        isActive: !!editForm.isActive,
      },
    });
    setEditTarget(null);
    await load();
  };

  return (
    <>
      <PageCard title="Fuel Rates" actions={canManage ? <button className="btn btn-outline-primary" onClick={() => void load()}>Refresh</button> : undefined}>
        <div className="row g-2">
          <div className="col-md-4">
            <input
              className="form-control"
              placeholder="Search city / state / city key"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void applySearch();
              }}
            />
          </div>
          <div className="col-md-2">
            <input className="form-control" placeholder="State" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} />
          </div>
          <div className="col-md-2">
            <select className="form-select" value={cityTierFilter} onChange={(e) => setCityTierFilter(e.target.value)}>
              <option value="">All City Tiers</option>
              <option value="metro">metro</option>
              <option value="urban">urban</option>
              <option value="mixed">mixed</option>
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" value={fuelTypeFilter} onChange={(e) => setFuelTypeFilter(e.target.value)}>
              <option value="">All Fuel Columns</option>
              <option value="petrol">petrol</option>
              <option value="diesel">diesel</option>
              <option value="cng">cng</option>
              <option value="electricity">electricity</option>
            </select>
          </div>
          <div className="col-md-2 d-grid">
            <button className="btn btn-primary" onClick={() => void applySearch()}>Apply Filters</button>
          </div>
        </div>
      </PageCard>

      {loading ? (
        <PageCard><div>Loading...</div></PageCard>
      ) : (
        <DataTable
          rows={rows}
          tableMinHeight={460}
          pagination={{ page, total: pages, onPage: setPage }}
          columns={[
            { key: 'cityKey', label: 'City Key' },
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State' },
            { key: 'cityTier', label: 'City Tier' },
            { key: 'petrol', label: 'Petrol' },
            { key: 'diesel', label: 'Diesel' },
            { key: 'cng', label: 'CNG' },
            { key: 'electricity', label: 'Electricity' },
            { key: 'trafficProfile', label: 'Traffic' },
            { key: 'isActive', label: 'Active', render: (r) => (r.isActive !== false ? 'Yes' : 'No') },
            { key: 'effectiveDate', label: 'Effective Date' },
            { key: 'actions', label: 'Actions', render: (r) => canManage ? <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(r)}>Edit</button> : '-' },
          ]}
        />
      )}

      {editTarget ? (
        <div className="app-modal-backdrop" onClick={() => setEditTarget(null)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Edit Fuel Rate - {editTarget.cityKey}</h6>
              <button className="btn btn-sm btn-link text-secondary p-0 border-0" onClick={() => setEditTarget(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="row g-2">
              <div className="col-md-4"><label className="form-label mb-1">City</label><input className="form-control" value={editForm.city} onChange={(e) => setEditForm((p: any) => ({ ...p, city: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">State</label><input className="form-control" value={editForm.state} onChange={(e) => setEditForm((p: any) => ({ ...p, state: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">City Tier</label><input className="form-control" value={editForm.cityTier} onChange={(e) => setEditForm((p: any) => ({ ...p, cityTier: e.target.value }))} /></div>
              <div className="col-md-3"><label className="form-label mb-1">Petrol</label><input className="form-control" type="number" value={editForm.petrol} onChange={(e) => setEditForm((p: any) => ({ ...p, petrol: e.target.value }))} /></div>
              <div className="col-md-3"><label className="form-label mb-1">Diesel</label><input className="form-control" type="number" value={editForm.diesel} onChange={(e) => setEditForm((p: any) => ({ ...p, diesel: e.target.value }))} /></div>
              <div className="col-md-3"><label className="form-label mb-1">CNG</label><input className="form-control" type="number" value={editForm.cng} onChange={(e) => setEditForm((p: any) => ({ ...p, cng: e.target.value }))} /></div>
              <div className="col-md-3"><label className="form-label mb-1">Electricity</label><input className="form-control" type="number" value={editForm.electricity} onChange={(e) => setEditForm((p: any) => ({ ...p, electricity: e.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label mb-1">Traffic Profile</label><input className="form-control" value={editForm.trafficProfile} onChange={(e) => setEditForm((p: any) => ({ ...p, trafficProfile: e.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label mb-1">Active</label><select className="form-select" value={String(editForm.isActive)} onChange={(e) => setEditForm((p: any) => ({ ...p, isActive: e.target.value === 'true' }))}><option value="true">Yes</option><option value="false">No</option></select></div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function PricingSyncPage() {
  const { admin } = useAuth();
  const canManage = hasPermission(admin?.role, admin?.permissions, 'settings:manage');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [vehicleRows, setVehicleRows] = useState<any[]>([]);
  const [vehiclePage, setVehiclePage] = useState(1);
  const [vehiclePages, setVehiclePages] = useState(1);
  const [catalogRequests, setCatalogRequests] = useState<any[]>([]);
  const [reviewingRequestId, setReviewingRequestId] = useState('');
  const [showVehicleFormModal, setShowVehicleFormModal] = useState(false);
  const [editingVehicleRowId, setEditingVehicleRowId] = useState('');
  const [form, setForm] = useState({
    vehicleCategory: '4-wheeler',
    brand: '',
    model: '',
    fuelType: 'Petrol',
    transmission: 'Manual',
    vehicleAgeBucket: '2-6',
    launchYear: '',
    realWorldMileageAvg: '',
    mileageUnit: 'kmpl',
    estimatedCostPerKmInr: '',
    confidenceScore: '75',
    pricingEligible: 'Y',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [sumRes, vehiclesRes, requestsRes] = await Promise.all([
        apiCall(API_ENDPOINTS.PRICING_SYNC_SUMMARY),
        apiCall(API_ENDPOINTS.PRICING_VEHICLES, { query: { page: vehiclePage, limit: 20 } }),
        apiCall(API_ENDPOINTS.VEHICLE_CATALOG_REQUESTS, { query: { status: 'pending' } }),
      ]);
      setSummary(getDataPayload(sumRes));
      const vehiclesPayload = getDataPayload(vehiclesRes);
      setVehicleRows(readItems(vehiclesPayload).map((row: any) => ({
        ...row,
        model: row.model || row.vehicleModel || '',
      })));
      setVehiclePages(Math.max(1, Number(vehiclesPayload?.pagination?.pages || 1)));
      setCatalogRequests(readItems(getDataPayload(requestsRes)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [vehiclePage]);

  const syncNow = async () => {
    if (!canManage) return;
    setSyncing(true);
    try {
      await apiCall(API_ENDPOINTS.PRICING_SYNC_NOW, { method: 'POST', body: {} });
      await load();
      window.alert('Fuel rates synced and saved to database.');
    } finally {
      setSyncing(false);
    }
  };

  const saveVehicleRow = async () => {
    if (!canManage) return;
    if (!form.brand || !form.model || !form.realWorldMileageAvg) {
      window.alert('Brand, model and mileage are required.');
      return;
    }
    await apiCall(API_ENDPOINTS.PRICING_VEHICLES, {
      method: 'POST',
      body: {
        vehicleCategory: form.vehicleCategory,
        brand: form.brand,
        model: form.model,
        fuelType: form.fuelType,
        transmission: form.transmission,
        vehicleAgeBucket: form.vehicleAgeBucket,
        launchYear: form.launchYear ? Number(form.launchYear) : undefined,
        realWorldMileageAvg: Number(form.realWorldMileageAvg),
        mileageUnit: form.mileageUnit,
        estimatedCostPerKmInr: form.estimatedCostPerKmInr ? Number(form.estimatedCostPerKmInr) : undefined,
        confidenceScore: form.confidenceScore ? Number(form.confidenceScore) : 75,
        pricingEligible: form.pricingEligible,
      },
    });
    setEditingVehicleRowId('');
    setShowVehicleFormModal(false);
    await load();
  };

  const editVehicleRow = (row: any) => {
    setEditingVehicleRowId(String(row._id || row.id || `${row.brand}-${row.model}-${row.fuelType}`));
    setForm({
      vehicleCategory: String(row.vehicleCategory || '4-wheeler'),
      brand: String(row.brand || ''),
      model: String(row.model || row.vehicleModel || ''),
      fuelType: String(row.fuelType || 'Petrol'),
      transmission: String(row.transmission || 'Manual'),
      vehicleAgeBucket: String(row.vehicleAgeBucket || ''),
      launchYear: row.launchYear ? String(row.launchYear) : '',
      realWorldMileageAvg: row.realWorldMileageAvg ? String(row.realWorldMileageAvg) : '',
      mileageUnit: String(row.mileageUnit || 'kmpl'),
      estimatedCostPerKmInr: row.estimatedCostPerKmInr ? String(row.estimatedCostPerKmInr) : '',
      confidenceScore: row.confidenceScore ? String(row.confidenceScore) : '75',
      pricingEligible: String(row.pricingEligible || 'Y'),
    });
    setShowVehicleFormModal(true);
  };

  const resetVehicleForm = () => {
    setEditingVehicleRowId('');
    setForm({
      vehicleCategory: '4-wheeler',
      brand: '',
      model: '',
      fuelType: 'Petrol',
      transmission: 'Manual',
      vehicleAgeBucket: '2-6',
      launchYear: '',
      realWorldMileageAvg: '',
      mileageUnit: 'kmpl',
      estimatedCostPerKmInr: '',
      confidenceScore: '75',
      pricingEligible: 'Y',
    });
  };

  const reviewCatalogRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!canManage || !requestId) return;
    setReviewingRequestId(requestId);
    try {
      await apiCall(API_ENDPOINTS.VEHICLE_CATALOG_REVIEW, {
        method: 'POST',
        params: { requestId },
        body: { action },
      });
      await load();
    } finally {
      setReviewingRequestId('');
    }
  };

  return (
    <>
      <PageCard
        title="Vehicle Pricing Control"
        actions={
          canManage ? (
            <button className="btn btn-primary" onClick={syncNow} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Sync Fuel Rates Now'}
            </button>
          ) : undefined
        }
      >
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="row g-3">
            <div className="col-md-3">
              <div className="small text-body-secondary">Fuel Rows (DB)</div>
              <div className="fw-semibold">{summary?.fuelRows ?? 0}</div>
            </div>
            <div className="col-md-3">
              <div className="small text-body-secondary">Mileage Rows (DB)</div>
              <div className="fw-semibold">{summary?.mileageRows ?? 0}</div>
            </div>
            <div className="col-md-3">
              <div className="small text-body-secondary">Pending Vehicle Requests</div>
              <div className="fw-semibold">
                {catalogRequests.length}
              </div>
            </div>
            <div className="col-md-3">
              <div className="small text-body-secondary">Last Loaded</div>
              <div className="fw-semibold">{summary?.health?.loadedAt ? new Date(summary.health.loadedAt).toLocaleString() : '-'}</div>
            </div>
          </div>
        )}
      </PageCard>

      <PageCard
        title="Vehicle Mileage Rows (Database)"
        actions={
          canManage ? (
            <button
              className="btn btn-outline-primary"
              onClick={() => {
                resetVehicleForm();
                setShowVehicleFormModal(true);
              }}
            >
              Add Vehicle Mileage Row
            </button>
          ) : undefined
        }
      >
        <div className="small text-body-secondary">
          Use <strong>Edit</strong> on a row to update existing vehicle mileage details.
        </div>
      </PageCard>

      <PageCard title="Mileage Rows">
        <DataTable
          rows={vehicleRows}
          pagination={{ page: vehiclePage, total: vehiclePages, onPage: setVehiclePage }}
          columns={[
            { key: 'vehicleCategory', label: 'Category' },
            { key: 'brand', label: 'Brand' },
            { key: 'model', label: 'Model' },
            { key: 'fuelType', label: 'Fuel' },
            { key: 'transmission', label: 'Trans' },
            { key: 'vehicleAgeBucket', label: 'Age' },
            { key: 'realWorldMileageAvg', label: 'Mileage' },
            { key: 'mileageUnit', label: 'Unit' },
            { key: 'launchYear', label: 'Launch Year', render: (r) => r.launchYear || '-' },
            { key: 'recordStatus', label: 'Status' },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) =>
                canManage ? (
                  <button className="btn btn-sm btn-outline-primary" onClick={() => editVehicleRow(r)}>
                    Edit
                  </button>
                ) : (
                  '-'
                ),
            },
          ]}
        />
      </PageCard>

      <PageCard title="Vehicle Catalog Requests (Pending Admin Review)">
        <DataTable
          rows={catalogRequests}
          columns={[
            { key: 'requestId', label: 'Request ID' },
            { key: 'vehicleType', label: 'Type' },
            { key: 'brand', label: 'Brand' },
            { key: 'model', label: 'Model' },
            { key: 'fuelType', label: 'Fuel' },
            { key: 'realWorldMileageAvg', label: 'Mileage', render: (r) => (r.realWorldMileageAvg ? `${r.realWorldMileageAvg} ${r.mileageUnit || ''}` : '-') },
            { key: 'cityTier', label: 'City Tier', render: (r) => r.cityTier || '-' },
            { key: 'createdAt', label: 'Requested At', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '-') },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) => canManage ? (
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => reviewCatalogRequest(String(r.requestId), 'approve')}
                    disabled={reviewingRequestId === String(r.requestId)}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => reviewCatalogRequest(String(r.requestId), 'reject')}
                    disabled={reviewingRequestId === String(r.requestId)}
                  >
                    Reject
                  </button>
                </div>
              ) : '-',
            },
          ]}
        />
      </PageCard>

      {showVehicleFormModal ? (
        <div className="app-modal-backdrop" onClick={() => setShowVehicleFormModal(false)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">{editingVehicleRowId ? 'Edit Vehicle Mileage Row' : 'Add Vehicle Mileage Row'}</h6>
              <button className="btn btn-sm btn-link text-secondary p-0 border-0" onClick={() => setShowVehicleFormModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="row g-2">
              <div className="col-md-4"><label className="form-label mb-1">Vehicle Category</label><input className="form-control" value={form.vehicleCategory} onChange={(e) => setForm((p) => ({ ...p, vehicleCategory: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">Brand</label><input className="form-control" value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">Model</label><input className="form-control" value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">Fuel Type</label><input className="form-control" value={form.fuelType} onChange={(e) => setForm((p) => ({ ...p, fuelType: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">Transmission</label><input className="form-control" value={form.transmission} onChange={(e) => setForm((p) => ({ ...p, transmission: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">Age Bucket</label><input className="form-control" value={form.vehicleAgeBucket} onChange={(e) => setForm((p) => ({ ...p, vehicleAgeBucket: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">Launch Year</label><input className="form-control" value={form.launchYear} onChange={(e) => setForm((p) => ({ ...p, launchYear: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">Real-world Mileage</label><input className="form-control" value={form.realWorldMileageAvg} onChange={(e) => setForm((p) => ({ ...p, realWorldMileageAvg: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">Mileage Unit</label><input className="form-control" value={form.mileageUnit} onChange={(e) => setForm((p) => ({ ...p, mileageUnit: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">Estimated Cost per Km</label><input className="form-control" value={form.estimatedCostPerKmInr} onChange={(e) => setForm((p) => ({ ...p, estimatedCostPerKmInr: e.target.value }))} /></div>
              <div className="col-md-4"><label className="form-label mb-1">Confidence Score</label><input className="form-control" value={form.confidenceScore} onChange={(e) => setForm((p) => ({ ...p, confidenceScore: e.target.value }))} /></div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary" onClick={resetVehicleForm}>Clear</button>
              <button className="btn btn-secondary" onClick={() => setShowVehicleFormModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveVehicleRow}>
                {editingVehicleRowId ? 'Update Mileage Row' : 'Save Mileage Row'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function WithdrawalsPage() {
  const { admin } = useAuth();
  const canManage = hasPermission(admin?.role, admin?.permissions, 'withdrawals:manage');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'pending' | 'approved'>('pending');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [completeTarget, setCompleteTarget] = useState<any>(null);
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    const path = tab === 'pending' ? API_ENDPOINTS.WITHDRAWALS_PENDING : API_ENDPOINTS.WITHDRAWALS_APPROVED;
    const res = await apiCall(path, { query: { limit: PAGE_SIZE, page } });
    const payload = getDataPayload(res);
    const nextRows = readItems(payload);
    setRows(nextRows);
    const total = Number(payload?.pagination?.total || payload?.total || nextRows.length);
    setPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
  };
  useEffect(() => {
    load();
  }, [tab, page]);

  const action = async (path: string, withdrawalId: string) => {
    await apiCall(path, { method: 'POST', params: { withdrawalId }, body: {} });
    await load();
  };
  const complete = async () => {
    if (!completeTarget || !transactionId.trim()) return;
    await apiCall(API_ENDPOINTS.WITHDRAWALS_COMPLETE, { method: 'POST', params: { withdrawalId: completeTarget.withdrawalId }, body: { transactionId: transactionId.trim(), notes } });
    setCompleteTarget(null);
    setTransactionId('');
    setNotes('');
    await load();
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.withdrawalId, row.paymentMethod, row.status, row.amount].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [rows, search]);

  return (
    <>
      <div className="requests-header mb-3"><h5 className="mb-1">Withdrawal Management</h5></div>
      <PageCard>
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap filters-card">
          <div className="table-search-box">
            <i className="bi bi-search"></i>
            <input className="form-control form-control-sm" placeholder="Search withdrawals..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-body-secondary mb-0 d-flex align-items-center"><i className="bi bi-funnel"></i></span>
            <select className="form-select form-select-sm table-filter-select" value={tab} onChange={(e) => { setTab(e.target.value as 'pending' | 'approved'); setPage(1); }}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>
      </PageCard>
      <DataTable rows={filteredRows} tableMinHeight={460} pagination={{ page, total: pages, onPage: setPage }} columns={[{ key: 'withdrawalId', label: 'Withdrawal' }, { key: 'amount', label: 'Amount', render: (r) => `₹${r.amount || 0}` }, { key: 'paymentMethod', label: 'Method' }, { key: 'status', label: 'Status' }, { key: 'actions', label: 'Actions', render: (r) => canManage ? (tab === 'pending' ? <div className="d-flex gap-2"><button className="btn btn-sm btn-success" onClick={() => action(API_ENDPOINTS.WITHDRAWALS_APPROVE, r.withdrawalId)}>Approve</button><button className="btn btn-sm btn-danger" onClick={() => action(API_ENDPOINTS.WITHDRAWALS_REJECT, r.withdrawalId)}>Reject</button></div> : <button className="btn btn-sm btn-primary" onClick={() => setCompleteTarget(r)}>Mark Sent</button>) : '-' }]} />
      {completeTarget ? (
        <PageCard title={`Complete Withdrawal ${completeTarget.withdrawalId}`} actions={<div className="d-flex gap-2"><button className="btn btn-secondary" onClick={() => setCompleteTarget(null)}>Cancel</button><button className="btn btn-primary" disabled={!transactionId.trim()} onClick={complete}>Submit</button></div>}>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label">Transaction ID</label><input className="form-control" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} /></div>
            <div className="col-md-6"><label className="form-label">Notes</label><input className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
        </PageCard>
      ) : null}
    </>
  );
}

export function RolesPage() {
  const { admin } = useAuth();
  const canManage = hasPermission(admin?.role, admin?.permissions, 'roles:manage');
  const [rows, setRows] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<string>('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [roleKey, setRoleKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const load = async () => setRows(readItems(await apiCall(API_ENDPOINTS.ROLES)));
  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingRole('');
    setRoleKey('');
    setName('');
    setDescription('');
    setSelectedPermissions([]);
    setCreateOpen(false);
  };

  const edit = (row: any) => {
    setCreateOpen(true);
    setEditingRole(row.roleKey);
    setRoleKey(row.roleKey);
    setName(row.name || '');
    setDescription(row.description || '');
    setSelectedPermissions(row.permissions || []);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (editingRole) {
      await apiCall(API_ENDPOINTS.ROLE, { method: 'PUT', params: { roleKey: editingRole }, body: { name, description, permissions: selectedPermissions } });
    } else {
      await apiCall(API_ENDPOINTS.ROLES, { method: 'POST', body: { roleKey, name, description, permissions: selectedPermissions } });
    }
    resetForm();
    await load();
  };

  const toggleActive = async (row: any) => {
    if (!canManage) return;
    await apiCall(API_ENDPOINTS.ROLE, { method: 'PUT', params: { roleKey: row.roleKey }, body: { isActive: !row.isActive } });
    await load();
  };

  const remove = async (roleKeyParam: string) => {
    if (!canManage || !window.confirm('Delete role?')) return;
    await apiCall(API_ENDPOINTS.ROLE, { method: 'DELETE', params: { roleKey: roleKeyParam } });
    await load();
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = rows.filter((row) => {
      if (statusFilter === 'active' && !row.isActive) return false;
      if (statusFilter === 'inactive' && row.isActive) return false;
      if (!q) return true;
      return [row.roleKey, row.name, row.description, (row.permissions || []).join(', ')]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
    return base;
  }, [rows, search, statusFilter]);

  useEffect(() => {
    const total = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    setPages(total);
    if (page > total) setPage(total);
  }, [filteredRows, page]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  return (
    <>
      <div className="requests-header mb-3">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h5 className="mb-1">Roles</h5>
            <p className="mb-0 small text-body-secondary">Manage role definitions and permission mapping</p>
          </div>
          {canManage ? <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setCreateOpen(true); }}><i className="bi bi-plus-circle me-1"></i>Create Role</button> : null}
        </div>
      </div>
      <PageCard>
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap filters-card">
          <div className="table-search-box">
            <i className="bi bi-search"></i>
            <input className="form-control form-control-sm" placeholder="Search roles..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-body-secondary mb-0 d-flex align-items-center"><i className="bi bi-funnel"></i></span>
            <select className="form-select form-select-sm table-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </PageCard>
      <DataTable rows={pagedRows} tableMinHeight={460} pagination={{ page, total: pages, onPage: setPage }} columns={[{ key: 'roleKey', label: 'Role Key' }, { key: 'name', label: 'Name' }, { key: 'isActive', label: 'Active', render: (r) => String(r.isActive) }, { key: 'permissions', label: 'Permissions', render: (r) => (r.permissions || []).join(', ') }, { key: 'actions', label: 'Actions', render: (r) => <div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" onClick={() => edit(r)}>Edit</button>{canManage ? <button className="btn btn-sm btn-warning" onClick={() => toggleActive(r)}>{r.isActive ? 'Disable' : 'Enable'}</button> : null}{canManage && !r.isSystem ? <button className="btn btn-sm btn-danger" onClick={() => remove(r.roleKey)}>Delete</button> : null}</div> }]} />
      {createOpen ? (
        <div className="app-modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">{editingRole ? `Edit Role - ${editingRole}` : 'Create Role'}</h6>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setCreateOpen(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="row g-2 mb-3">
                <div className="col-md-3"><input className="form-control" placeholder="role key" value={roleKey} onChange={(e) => setRoleKey(e.target.value)} disabled={!!editingRole || !canManage} /></div>
                <div className="col-md-3"><input className="form-control" placeholder="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} /></div>
                <div className="col-md-6"><input className="form-control" placeholder="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canManage} /></div>
              </div>
              <div className="row g-2 mb-3" style={{ maxHeight: 260, overflowY: 'auto' }}>
                {ADMIN_PERMISSION_KEYS.map((permission) => (
                  <div className="col-md-4" key={permission}>
                    <label className="form-check d-flex align-items-center gap-2">
                      <input className="form-check-input" type="checkbox" checked={selectedPermissions.includes(permission)} onChange={(e) => setSelectedPermissions((prev) => e.target.checked ? [...prev, permission] : prev.filter((x) => x !== permission))} disabled={!canManage} />
                      <span className="small">{permission}</span>
                    </label>
                  </div>
                ))}
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-outline-secondary" type="button" onClick={resetForm}>Cancel</button>
                <button className="btn btn-primary" disabled={!canManage}>{editingRole ? 'Update Role' : 'Create Role'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AdminUsersPage() {
  const { admin } = useAuth();
  const canManage = hasPermission(admin?.role, admin?.permissions, 'admins:manage');
  const [rows, setRows] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [form, setForm] = useState({ username: '', email: '', password: '', name: '', role: 'admin' });
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('forlok123');

  const load = async () => {
    const [adminsRes, rolesRes] = await Promise.all([
      apiCall(API_ENDPOINTS.ADMINS, { query: { page, limit: PAGE_SIZE, search: search || undefined, status: statusFilter === 'all' ? undefined : statusFilter } }),
      apiCall(API_ENDPOINTS.ROLES),
    ]);
    const payload = getDataPayload(adminsRes);
    setRows(readItems(payload));
    setPages(resolvePages(payload));
    setRoles(readItems(rolesRes));
  };
  useEffect(() => {
    load();
  }, [page, search, statusFilter]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    await apiCall(API_ENDPOINTS.ADMINS, { method: 'POST', body: form });
    setForm({ username: '', email: '', password: '', name: '', role: 'admin' });
    setCreateOpen(false);
    await load();
  };
  const update = async (adminId: string, body: any) => {
    if (!canManage) return;
    await apiCall(API_ENDPOINTS.ADMIN, { method: 'PUT', params: { adminId }, body });
    await load();
  };
  const resetPassword = async () => {
    if (!canManage || !resetTarget || !newPassword.trim()) return;
    await apiCall(API_ENDPOINTS.ADMIN_RESET_PASSWORD, { method: 'PUT', params: { adminId: resetTarget.adminId }, body: { password: newPassword.trim() } });
    setResetTarget(null);
    setNewPassword('forlok123');
  };
  const remove = async (adminId: string) => {
    if (!canManage || !window.confirm('Delete admin user?')) return;
    await apiCall(API_ENDPOINTS.ADMIN, { method: 'DELETE', params: { adminId } });
    await load();
  };

  return (
    <>
      <div className="requests-header mb-3">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h5 className="mb-1">Admin Users</h5>
            <p className="mb-0 small text-body-secondary">Manage admin accounts and access roles</p>
          </div>
          {canManage ? <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}><i className="bi bi-person-plus me-1"></i>Create Admin User</button> : null}
        </div>
      </div>
      <PageCard>
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap filters-card">
          <div className="table-search-box">
            <i className="bi bi-search"></i>
            <input className="form-control form-control-sm" placeholder="Search by username/email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-body-secondary mb-0 d-flex align-items-center"><i className="bi bi-funnel"></i></span>
            <select className="form-select form-select-sm table-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </PageCard>
      <DataTable rows={rows} tableMinHeight={460} pagination={{ page, total: pages, onPage: setPage }} columns={[{ key: 'adminId', label: 'Admin ID' }, { key: 'username', label: 'Username' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { key: 'isActive', label: 'Active', render: (r) => String(r.isActive) }, { key: 'actions', label: 'Actions', render: (r) => canManage ? <div className="d-flex gap-2"><button className="btn btn-sm btn-warning" onClick={() => update(r.adminId, { isActive: !r.isActive })}>{r.isActive ? 'Deactivate' : 'Activate'}</button><button className="btn btn-sm btn-primary" onClick={() => setResetTarget(r)}>Reset</button>{r.role !== 'super_admin' ? <button className="btn btn-sm btn-danger" onClick={() => remove(r.adminId)}>Delete</button> : null}</div> : '-' }]} />
      {createOpen ? (
        <div className="app-modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Create Admin User</h6>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setCreateOpen(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={create}>
              <div className="row g-2">
                <div className="col-md-6"><input className="form-control" placeholder="username" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} disabled={!canManage} /></div>
                <div className="col-md-6"><input className="form-control" placeholder="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} disabled={!canManage} /></div>
                <div className="col-md-6"><input className="form-control" placeholder="name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} disabled={!canManage} /></div>
                <div className="col-md-6"><input className="form-control" placeholder="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} disabled={!canManage} /></div>
                <div className="col-12"><select className="form-select" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} disabled={!canManage}><option value="super_admin">super_admin</option><option value="admin">admin</option>{roles.map((r) => <option key={r.roleKey} value={r.roleKey}>{r.roleKey}</option>)}</select></div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-3">
                <button className="btn btn-outline-secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={!canManage}>Create</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {resetTarget ? (
        <PageCard title={`Reset Password - ${resetTarget.username}`} actions={<div className="d-flex gap-2"><button className="btn btn-secondary" onClick={() => setResetTarget(null)}>Cancel</button><button className="btn btn-primary" onClick={resetPassword} disabled={!newPassword.trim()}>Save</button></div>}>
          <input className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </PageCard>
      ) : null}
    </>
  );
}

export function PermissionMatrixPage() {
  const [roles, setRoles] = useState<any[]>([]);
  useEffect(() => {
    apiCall(API_ENDPOINTS.ROLES).then((res) => setRoles(readItems(res)));
  }, []);
  const matrixRows = useMemo(() => [{ roleKey: 'super_admin', name: 'Super Admin', permissions: ['*'] }, ...roles], [roles]);
  const has = (role: any, permission: string) => role.roleKey === 'super_admin' || (role.permissions || []).includes('*') || (role.permissions || []).includes(permission);
  const exportCsv = () => {
    const headers = ['roleKey', 'name', ...ADMIN_PERMISSION_KEYS];
    const lines = [headers.join(',')];
    matrixRows.forEach((role) => {
      lines.push([role.roleKey, role.name || role.roleKey, ...ADMIN_PERMISSION_KEYS.map((p) => (has(role, p) ? 'yes' : 'no'))].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permission-matrix-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <PageCard title="Permission Matrix" actions={<button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>}>
      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead>
            <tr>
              <th>Role</th>
              {ADMIN_PERMISSION_KEYS.map((p) => <th key={p}>{p}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrixRows.map((role) => (
              <tr key={role.roleKey}>
                <td>{role.name || role.roleKey}</td>
                {ADMIN_PERMISSION_KEYS.map((p) => <td key={p}>{has(role, p) ? 'Yes' : 'No'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageCard>
  );
}
