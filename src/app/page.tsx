import AuthWrapper from "@/components/AuthWrapper";
import AppContent from "./components/AppContent";

export default function Home() {
  return (
    <AuthWrapper>
      <AppContent />
    </AuthWrapper>
  );
}
