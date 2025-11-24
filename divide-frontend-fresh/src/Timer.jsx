// src/components/Timer.jsx
import { useEffect, useState } from "react";

export default function Timer({ endTime }) {
  const [timeLeft, setTimeLeft] = useState(
    Math.max(new Date(endTime) - new Date(), 0)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(new Date(endTime) - new Date(), 0);
      setTimeLeft(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const minutes = Math.floor(timeLeft / 1000 / 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return <span>{minutes}:{seconds < 10 ? "0" + seconds : seconds}</span>;
}
