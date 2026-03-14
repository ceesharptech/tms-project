import { useState, useEffect } from "react";

const SystemStatus = () => {
  const [status, setStatus] = useState("booting");
  const maxRetries = 5;

  useEffect(() => {
    let attempts = 0;
    let timeoutId;

    const checkHealth = async () => {
      try {
        const response = await fetch(
          "https://tms-face-service-production.up.railway.app/health",
        );
        if (response.ok) {
          setStatus("operational");
          return; // Stop the loop on success
        }
      } catch (err) {
        console.error("Ping failed, retrying...");
        console.log(`Attempt ${attempts + 1} of ${maxRetries}`);
        console.error(err);
      }

      // Logic for next retry
      attempts++;
      if (attempts < maxRetries) {
        timeoutId = setTimeout(checkHealth, 8000);
      } else {
        setStatus("error");
      }
    };

    checkHealth();

    // Cleanup: prevents the loop from running if the user leaves the page
    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array ensures it starts ONLY once on mount

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
