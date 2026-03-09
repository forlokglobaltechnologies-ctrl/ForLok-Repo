export default function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="bg-light rounded d-flex align-items-center justify-content-between p-4">
        <i className={`${icon} fs-3 text-primary`}></i>
        <div className="ms-3 text-end">
          <p className="mb-2">{title}</p>
          <h6 className="mb-0">{value}</h6>
        </div>
      </div>
    </div>
  );
}
