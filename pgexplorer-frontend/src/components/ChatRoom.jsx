import { useEffect, useMemo, useRef, useState } from "react";
import { getSocket } from "../utils/socket";

const ChatRoom = ({ pgId, studentId, header }) => {
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("Connecting...");

  const socket = useMemo(() => getSocket(), []);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!pgId) return;

    const onConnect = () => setStatus("Connected");
    const onDisconnect = () => setStatus("Disconnected");

    const onHistory = (payload) => {
      if (!payload?.room) return;
      setRoom(payload.room);
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
    };

    const onMessage = (payload) => {
      if (!payload?.room || !payload?.message) return;
      if (room && payload.room !== room) return;
      setRoom(payload.room);
      setMessages((prev) => [...prev, payload.message].slice(-200));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat:history", onHistory);
    socket.on("chat:message", onMessage);

    socket.emit("chat:join", {
      pgId,
      ...(studentId ? { studentId } : {}),
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:history", onHistory);
      socket.off("chat:message", onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pgId, studentId, socket, room]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const msg = String(text || "").trim();
    if (!msg) return;

    socket.emit("chat:send", {
      pgId,
      ...(studentId ? { studentId } : {}),
      text: msg,
    });

    setText("");
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
        <div>
          <h2 className="h4 mb-1">{header || "Chat"}</h2>
          <div className="pg-muted small"></div>
        </div>
      </div>

      <div className="pg-divider my-4" />

      <div
        className="pg-kpi rounded-4 p-3"
        style={{ height: 360, overflowY: "auto" }}
      >
        {messages.length === 0 ? (
          <div className="pg-muted">No messages yet.</div>
        ) : (
          <div className="d-grid gap-2">
            {messages.map((m) => (
              <div key={m.id || `${m.createdAt}-${m.senderId}`}>
                <div className="d-flex justify-content-between gap-2">
                  <div className="small">{m.senderRole || "user"}</div>
                  <div className="pg-muted small">
                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                  </div>
                </div>
                <div className="pg-muted" style={{ whiteSpace: "pre-wrap" }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="d-flex gap-2 mt-3">
        <input
          className="form-control"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button type="button" className="btn pg-btn" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
