import { useLocation, useNavigate } from "react-router-dom";

// react-router gives the very first entry in the session a key of "default" —
// there's nothing to go back to in that case, so fall back to a safe route
// instead of leaving the user on a dead back button.
export function useGoBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };
}
