import { createBooking } from "../services/bookingService";
import { useToast } from "./ToastProvider";

const PGCard = ({ pg }) => {
  const { pushToast } = useToast();

  const handleInterested = async () => {
    try {
      await createBooking(pg._id);
      pushToast({
        type: "success",
        title: "Request sent",
        message: "Your booking request has been sent to the owner.",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: "Booking failed",
        message: error.response?.data?.message || "Booking failed",
      });
    }
  };

  return (
    <div className="mt-3">
      <span className="pg-muted">Rent</span>
      <div className="h5 mb-2">₹{pg.rent}</div>

      {/* 🔥 Interested Button */}
      <button
        className="btn btn-primary btn-sm"
        onClick={() => handleInterested(pg._id)}
      >
        Interested
      </button>
    </div>
  );
};

export default PGCard;
