import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function QuickActionCard({ icon, title, description, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex flex-col gap-3 p-5 rounded-2xl border text-left transition ${
        disabled
          ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-60"
          : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer"
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${
          disabled ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-600"
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        {disabled && (
          <span className="mt-1 inline-block text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
            Coming soon
          </span>
        )}
      </div>
    </button>
  );
}

function CameraIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.864 47.864 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

export default function OfficerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const firstName = user?.full_name?.split(" ")[0] ?? "Officer";

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Select an action to get started
        </p>
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickActionCard
            icon={<CameraIcon />}
            title="Identify Driver"
            description="Use facial recognition or search by details"
            onClick={() => navigate("/dashboard/officer/identify")}
          />
          <QuickActionCard
            icon={<UsersIcon />}
            title="View Drivers"
            description="Search and browse driver profiles"
            onClick={() => navigate("/dashboard/officer/drivers")}
          />
          {/* <QuickActionCard
            icon={<DocumentIcon />}
            title="My Offences"
            description="View offences you've issued"
            disabled
          /> */}
        </div>
      </section>

      {/* Recent identifications placeholder */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Recent Identifications
        </h2>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
          <svg
            className="mx-auto w-8 h-8 text-gray-300 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.864 47.864 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
          <p className="text-sm text-gray-500">No recent identifications</p>
          <button
            onClick={() => navigate("/dashboard/officer/identify")}
            className="mt-3 text-sm text-blue-600 font-medium hover:underline"
          >
            Identify a driver →
          </button>
        </div>
      </section>

      {/* Recent offences placeholder */}
      {/* <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Recent Offences Issued
        </h2>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-400">
            Offence history will appear here once Phase 8 is complete.
          </p>
        </div>
      </section> */}
    </div>
  );
}
