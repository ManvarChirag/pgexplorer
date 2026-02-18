import { Link, useParams } from "react-router-dom";
import ChatRoom from "../../components/ChatRoom";

const StudentChat = () => {
  const { pgId } = useParams();

  return (
    <div className="d-grid gap-3">
      <div>
        <Link className="btn btn-outline-light pg-btn" to="/student/search">
          Back
        </Link>
      </div>
      <ChatRoom pgId={pgId} header="Chat with Owner" />
    </div>
  );
};

export default StudentChat;
