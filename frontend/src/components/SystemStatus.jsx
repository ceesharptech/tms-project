import { useState, useEffect } from "react";

const SystemStatus = () => {
  const [status, setStatus] = useState("booting");
  const maxRetries = 10;
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(
          "https://tms-face-service-production.up.railway.app/health",
        );
        if (response.ok) {
          setStatus("operational");
        } else if (attempts < maxRetries) {
          setAttempts((a) => a + 1);
          setTimeout(checkHealth, 3000);
        } else {
          setStatus("error");
        }
      } catch (error) {
        if (attempts < maxRetries) {
          setAttempts((a) => a + 1);
          setTimeout(checkHealth, 3000);
        } else {
          setStatus("error");
          console.error("Health check failed after multiple attempts:", error);
        }
      }
    };
    checkHealth();
  }, [attempts]);

  const config = {
    booting: { text: "System Booting", color: "bg-orange-500 animate-pulse" },
    operational: { text: "System Operational", color: "bg-green-500" },
    error: { text: "System Error", color: "bg-red-500" },
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full inline-block ${config[status].color}`}
      />
      <span className="text-xs font-semibold text-gray-500 tracking-widest uppercase">
        {config[status].text}
      </span>
    </div>
  );
};

export default SystemStatus;
