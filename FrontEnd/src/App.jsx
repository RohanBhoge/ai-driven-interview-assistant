import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import SignUp from "./components/SignUp";
import UploadPDF from "./components/UploadPDF";
import { AuthProvider } from "./context/AuthContext";
import About from "./pages/About";
import Features from "./pages/Feature";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/uploadpdf" element={<UploadPDF />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </AuthProvider>
    </>
  );
}

export default App;
