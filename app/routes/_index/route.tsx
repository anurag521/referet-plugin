import { useEffect } from "react";
import { type LoaderFunctionArgs, redirect, useNavigate } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Try to auto-redirect to dashboard
    navigate("/app");
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px", fontFamily: "system-ui" }}>
      <h1>Welcome to Refertle</h1>
      <p>Redirecting to dashboard...</p>
      <br />
      <button
        onClick={() => navigate("/app")}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
          backgroundColor: "black",
          color: "white",
          border: "none",
          borderRadius: "4px"
        }}
      >
        Go to Dashboard
      </button>
    </div>
  );
}
