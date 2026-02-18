import { Link, useParams } from "react-router-dom";
import ChatRoom from "../../components/ChatRoom";

const OwnerChat = () => {
  const { pgId, studentId } = useParams();

  return (
    <div className="d-grid gap-3">
      <div>
        <Link className="btn btn-outline-light pg-btn" to="/owner/bookings">
          Back
        </Link>
      </div>
      <ChatRoom pgId={pgId} studentId={studentId} header="Chat with Student" />
    </div>
  );
};

export default OwnerChat;
