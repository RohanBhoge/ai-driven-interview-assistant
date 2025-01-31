import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import SignUp from "./components/SignUp";
import UploadPDF from "./components/UploadPDF";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/uploadpdf" element={<UploadPDF />} />
        {/* <Route path="/upload-resume" element={<UploadResume />} />
        <Route path="/view-questions" element={<ViewQuestions />} /> */}
      </Routes>
    </>
  );
}

export default App;
