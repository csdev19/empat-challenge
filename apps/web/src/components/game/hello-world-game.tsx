/**
 * Simple Button Press Game
 * - Student presses colored buttons
 * - Teacher sees all button presses in real-time
 * - Super minimal WebSocket demo
 */

import { useEffect, useState, useRef } from "react";

interface ButtonPress {
  type: "button-press";
  color: string;
  player: "student" | "teacher";
  timestamp: string;
}

interface Message {
  type: string;
  color?: string;
  player?: string;
  message?: string;
  timestamp?: string;
  original?: ButtonPress;
}

type Role = "student" | "teacher";

export function HelloWorldGame() {
  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [buttonPresses, setButtonPresses] = useState<ButtonPress[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket
  useEffect(() => {
    if (!role) return;

    const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
    const wsUrl = serverUrl.replace(/^http/, "ws") + "/ws/hello";

    console.log("[Game] Connecting as:", role);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[Game] Connected");
      setConnected(true);
      // Announce join
      ws.send(JSON.stringify({
        type: "join",
        player: role,
        timestamp: new Date().toISOString(),
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as Message;
        console.log("[Game] Received:", message);

        // Handle button press echoes from server
        // Only add if it's from another player (avoid duplicates from our own presses)
        if (message.type === "echo" && message.original?.type === "button-press") {
          const press = message.original as ButtonPress;
          if (press.player !== role) {
            setButtonPresses((prev) => [...prev, press]);
          }
        }
      } catch (error) {
        console.error("[Game] Error parsing message:", error);
      }
    };

    ws.onerror = () => console.error("[Game] WebSocket error");
    ws.onclose = () => {
      console.log("[Game] Disconnected");
      setConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [role]);

  // Send button press
  const pressButton = (color: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const press: ButtonPress = {
        type: "button-press",
        color,
        player: role!,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(press));
      // Also add locally for immediate feedback
      setButtonPresses((prev) => [...prev, press]);
    }
  };

  // Role selection screen
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-3xl font-bold mb-6">Button Press Game</h1>
          <p className="text-gray-600 mb-8">Choose your role:</p>
          <div className="flex gap-4">
            <button
              onClick={() => setRole("student")}
              className="px-8 py-4 bg-blue-500 text-white text-xl font-bold rounded-lg hover:bg-blue-600 transition-transform hover:scale-105"
            >
              Student
            </button>
            <button
              onClick={() => setRole("teacher")}
              className="px-8 py-4 bg-purple-500 text-white text-xl font-bold rounded-lg hover:bg-purple-600 transition-transform hover:scale-105"
            >
              Teacher
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Student view - Big colored buttons
  if (role === "student") {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="mb-6 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-white">{connected ? "Connected" : "Connecting..."}</span>
        </div>

        <h1 className="text-4xl font-bold text-white mb-8">Press a Button!</h1>

        <div className="grid grid-cols-2 gap-6 max-w-md">
          {[
            { color: "red", bg: "bg-red-500", hover: "hover:bg-red-400" },
            { color: "blue", bg: "bg-blue-500", hover: "hover:bg-blue-400" },
            { color: "green", bg: "bg-green-500", hover: "hover:bg-green-400" },
            { color: "yellow", bg: "bg-yellow-500", hover: "hover:bg-yellow-400" },
          ].map(({ color, bg, hover }) => (
            <button
              key={color}
              onClick={() => pressButton(color)}
              disabled={!connected}
              className={`
                w-32 h-32 rounded-2xl ${bg} ${hover}
                text-white text-2xl font-bold uppercase
                shadow-lg transition-all duration-150
                active:scale-95 active:shadow-md
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {color}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setRole(null); setButtonPresses([]); }}
          className="mt-8 text-gray-400 hover:text-white underline"
        >
          Switch Role
        </button>
      </div>
    );
  }

  // Teacher view - See all button presses
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Teacher View</h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm">{connected ? "Connected" : "Connecting..."}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <h2 className="font-semibold text-lg mb-4">Button Presses</h2>

          {buttonPresses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Waiting for student to press buttons...
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {buttonPresses.slice().reverse().map((press, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    className={`w-8 h-8 rounded-full ${
                      press.color === "red" ? "bg-red-500" :
                      press.color === "blue" ? "bg-blue-500" :
                      press.color === "green" ? "bg-green-500" :
                      "bg-yellow-500"
                    }`}
                  />
                  <div className="flex-1">
                    <span className="font-semibold capitalize">{press.color}</span>
                    <span className="text-gray-500 ml-2">by {press.player}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(press.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => setButtonPresses([])}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Clear History
          </button>
          <button
            onClick={() => { setRole(null); setButtonPresses([]); }}
            className="text-gray-500 hover:text-gray-700 underline"
          >
            Switch Role
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Stats:</strong> {buttonPresses.length} button presses total
            {buttonPresses.length > 0 && (
              <span className="ml-2">
                (Red: {buttonPresses.filter(p => p.color === "red").length},
                Blue: {buttonPresses.filter(p => p.color === "blue").length},
                Green: {buttonPresses.filter(p => p.color === "green").length},
                Yellow: {buttonPresses.filter(p => p.color === "yellow").length})
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
