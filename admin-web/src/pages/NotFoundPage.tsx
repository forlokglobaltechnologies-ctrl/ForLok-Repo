import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container-fluid pt-4 px-4">
      <div className="bg-light text-center rounded p-5">
        <h1 className="display-1 fw-bold">404</h1>
        <h4 className="mb-4">Page Not Found</h4>
        <Link className="btn btn-primary rounded-pill py-3 px-5" to="/dashboard">
          Go Back To Home
        </Link>
      </div>
    </div>
  );
}
