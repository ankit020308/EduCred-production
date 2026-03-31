import { GraduationCap, Send, Clock, User } from 'lucide-react';

export default function DashboardLayout({ children, currentTab, setTab, pendingCount }) {
  const tabs = [
    { key: 'wallet', label: 'Wallet', icon: GraduationCap },
    { key: 'submit', label: 'Submit', icon: Send },
    { key: 'status', label: 'Status', icon: Clock },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-transparent text-white relative z-10">

      {/* SIDEBAR */}
      <div className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col gap-6">

        <h2 className="text-xl font-black text-blue-500">EduCred</h2>

        <div className="flex flex-col gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition ${currentTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-white/5'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  {tab.label}
                </div>

                {tab.key === 'status' && pendingCount > 0 && (
                  <span className="text-xs bg-blue-500 px-2 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-8">
        {children}
      </div>

    </div>
  );
}