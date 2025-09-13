import { Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage/AuthPage";
import UploadPDF from "./components/UploadPDF/UploadPDF.jsx";
import { AuthProvider } from "./context/AuthContext";
import ProfilePage from "./pages/ProfilePage/ProfilePage.jsx";
import InterviewPage from "./pages/InterviewPage/InterviewPage.jsx";
import { InterviewProvider } from "./context/InterviewContext";
import { ToastContainer } from "react-toastify";
import About from "./pages/AboutPage/About";
import Home from "./pages/HomePage/Home";
import Features from "./pages/FeaturePage/Feature";
import Auth from "./components/Auth/Auth.jsx";

function App() {
  return (
    <>
      <AuthProvider>
        <InterviewProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/Auth" element={<AuthPage />} />
            <Route path="/Auth" element={<Auth />} />
            <Route path="/uploadpdf" element={<UploadPDF />} />
            <Route path="/about" element={<About />} />
            <Route path="/features" element={<Features />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/interview" element={<InterviewPage />} />
          </Routes>
          <ToastContainer />
        </InterviewProvider>
      </AuthProvider>
    </>
  );
}

export default App;
